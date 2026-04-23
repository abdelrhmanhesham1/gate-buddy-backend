from typing import List, Dict, Optional
import asyncio 
import random
from datetime import datetime, timedelta
from models.live_scraper import LiveDataScraper
from models.airport_mapper import AirportMapper
from models.scraping_utils import (
    RateLimiter,
    CircuitBreaker,
    CircuitOpenError,
    DiskCache,
    retry_with_backoff
)
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DestinationRecommender:
    """
    Production-ready recommendation system with:
    - Real-time web scraping from Wikipedia & Wikimedia Commons
    - Multi-tier caching (memory + disk)
    - Rate limiting (50 req/min)
    - Circuit breaker (prevents hammering down services)
    - Exponential backoff retries
    - Graceful degradation fallbacks
    """
    
    def __init__(self):
        self.live_scraper = LiveDataScraper()
        self.airport_mapper = AirportMapper()
        
        # Protection mechanisms
        self.rate_limiter = RateLimiter(max_requests=50, time_window=60)
        self.circuit_breaker = CircuitBreaker(failure_threshold=5, timeout=300)
        
        # Multi-tier cache
        self.memory_cache = {}  # Fast: {airport_code: {data, expires_at}}
        self.disk_cache = DiskCache('data/cache')  # Persistent
        self.cache_ttl_hours = 24
            
        # Background refresh tracking
        self._refresh_tasks = {} 
    async def get_recommendations_for_airport(
        self,
        airport_code: str,
        user_id: Optional[str] = None,
        limit: int = 6,
        force_refresh: bool = False
    ) -> Optional[Dict]:
        """
        Get recommendations with full production resilience
        
        Fallback chain:
        1. Memory cache (fastest)
        2. Disk cache (persistent)
        3. Live scraping with retries
        4. Stale cache (if scraping fails)
        5. Generic recommendations (last resort)
        
        Args:
            airport_code: ICAO or IATA code
            user_id: Optional user ID
            limit: Number of places to return
            force_refresh: Skip cache and scrape fresh
        
        Returns:
            Recommendations or fallback data
        """
        airport_code = airport_code.upper()
        
        # Layer 1: Memory cache
        if not force_refresh:
            if cached := self._get_from_memory(airport_code):
                logger.info(f"✓ Memory cache hit: {airport_code}")
                self._maybe_refresh_background(airport_code, cached)
                return self._prepare_response(cached, limit, user_id)
        
        # Layer 2: Disk cache
        if not force_refresh:
            if cached := await self.disk_cache.get(airport_code):
                # Warm up memory cache
                self._store_in_memory(airport_code, cached)
                logger.info(f"✓ Disk cache hit: {airport_code}")
                self._maybe_refresh_background(airport_code, cached)
                return self._prepare_response(cached, limit, user_id)
        
        # Layer 3: Live scraping with full protections
        try:
            data = await self._scrape_with_protections(airport_code, limit)
            
            # Cache everywhere
            await self._cache_data(airport_code, data)
            
            return self._prepare_response(data, limit, user_id)
        
        except CircuitOpenError as e:
            logger.error(f"Circuit breaker open for {airport_code}: {e}")
            return await self._serve_fallback(airport_code, limit, user_id)
        
        except Exception as e:
            logger.error(f"Scraping failed for {airport_code}: {e}")
            return await self._serve_fallback(airport_code, limit, user_id)
    
    async def _scrape_with_protections(
        self,
        airport_code: str,
        limit: int
    ) -> Dict:
        """
        Scrape with rate limiting + circuit breaker + retries
        """
        # Get city info
        city_info = await self.airport_mapper.get_city_info(airport_code)
        if not city_info:
            raise ValueError(f"Unknown airport code: {airport_code}")
        
        city_name = city_info['city']
        country = city_info['country']
        
        # Rate limit + circuit breaker + retry
        async def _do_scrape():
            await self.rate_limiter.acquire()
            return await self.circuit_breaker.call(
                retry_with_backoff,
                self.live_scraper.scrape_destination_data,
                city_name,
                country,
                airport_code,
                limit + 4,  # Get extra in case some fail
                max_retries=3,
                initial_delay=1.0,
                backoff_factor=2.0
            )
        
        data = await _do_scrape()
        
        if not data:
            raise ValueError(f"No data scraped for {city_name}")
        
        return data
    
    async def _serve_fallback(
        self,
        airport_code: str,
        limit: int,
        user_id: Optional[str]
    ) -> Dict:
        """
        Serve fallback data when scraping fails
        
        Priority:
        1. Stale disk cache (even if expired)
        2. Generic recommendations
        """
        # Try stale cache first
        stale = await self.disk_cache.get_stale(airport_code)
        if stale:
            logger.warning(f"Serving STALE cache for {airport_code}")
            response = self._prepare_response(stale, limit, user_id)
            response['warning'] = 'Data may be outdated (live scraping unavailable)'
            return response
        
        # Last resort: Generic recommendations
        logger.warning(f"Serving GENERIC recommendations for {airport_code}")
        return await self._generic_recommendations(airport_code, limit)
    
    async def _generic_recommendations(
        self,
        airport_code: str,
        limit: int
    ) -> Dict:
        """Hardcoded fallback when everything fails"""
        city_info = await self.airport_mapper.get_city_info(airport_code)
        
        if not city_info:
            return {
                'airportCode': airport_code,
                'cityName': 'Unknown',
                'country': 'Unknown',
                'places': [],
                'message': 'Airport code not recognized',
                'error': 'No data available'
            }
        
        city = city_info['city']
        country = city_info['country']
        
        return {
            'airportCode': airport_code,
            'cityName': city,
            'country': country,
            'places': [
                {
                    'name': f"{city} City Center",
                    'category': 'area',
                    'description': f"Explore the heart of {city} and discover local culture.",
                    'rating': 4.0,
                    'vicinity': city,
                    'image': self._get_fallback_image(f"{city} City Center"),
                    'imageCredit': None,
                    'googleMapsLink': f"https://www.google.com/maps/search/{city}+tourist+attractions"
                }
            ],
            'message': f"Top places to visit in {country}",
            'warning': 'Generic recommendations - live data unavailable'
        }
    
    def _get_from_memory(self, airport_code: str) -> Optional[Dict]:
        """Get from memory cache if not expired"""
        if airport_code not in self.memory_cache:
            return None
        
        entry = self.memory_cache[airport_code]
        
        if datetime.utcnow() >= entry['expires_at']:
            logger.info(f"Memory cache expired: {airport_code}")
            del self.memory_cache[airport_code]
            return None
        
        return entry['data']
    
    def _store_in_memory(self, airport_code: str, data: Dict):
        """Store in memory cache"""
        self.memory_cache[airport_code] = {
            'data': data,
            'expires_at': datetime.utcnow() + timedelta(hours=self.cache_ttl_hours)
        }
    
    async def _cache_data(self, airport_code: str, data: Dict):
        """Cache in both memory and disk"""
        self._store_in_memory(airport_code, data)
        await self.disk_cache.set(airport_code, data, ttl_hours=self.cache_ttl_hours)
        logger.info(f"Cached {airport_code} in memory + disk")
    
    def _prepare_response(
        self, 
        destination: Dict, 
        limit: int, 
        user_id: Optional[str]
    ) -> Dict:
        """
        Prepare response with shuffled photos and user preferences
        """
        places = destination.get('places', [])
        
        # Shuffle photos for variety
        shuffled_places = self._shuffle_place_photos(places)
        
        # Apply user preferences (future)
        if user_id:
            shuffled_places = self._apply_user_preferences(shuffled_places, user_id)
        
        # Limit results
        recommended_places = shuffled_places[:limit]
        
        return {
            'airportCode': destination.get('airportCode'),
            'cityName': destination.get('cityName'),
            'country': destination.get('country'),
            'places': recommended_places,
            'message': destination.get('message', f"Top places to visit in {destination.get('country')}")
        }
    
    def _shuffle_place_photos(self, places: List[Dict]) -> List[Dict]:
        """Select random photo from each place's photo array"""
        shuffled = []
        
        for place in places:
            place_copy = place.copy()
            photos = place.get('photos', [])
            
            if photos:
                selected_photo = random.choice(photos)
                place_copy['image'] = selected_photo['url']
                place_copy['imageCredit'] = selected_photo.get('credit')
            else:
                place_copy['image'] = self._get_fallback_image(place.get('name', ''))
                place_copy['imageCredit'] = None
            
            place_copy.pop('photos', None)
            shuffled.append(place_copy)
        
        return shuffled
    
    def _apply_user_preferences(self, places: List[Dict], user_id: str) -> List[Dict]:
        """Apply user preferences (future enhancement)"""
        # Placeholder: No real user data yet
        return places
    
    def _get_fallback_image(self, place_name: str) -> str:
        """Generate fallback image URL"""
        import hashlib
        seed = hashlib.md5(place_name.encode()).hexdigest()[:8]
        return f"https://picsum.photos/seed/{seed}/800/600"
    
    def clear_cache(self, airport_code: Optional[str] = None):
        """Clear memory cache"""
        if airport_code:
            airport_code = airport_code.upper()
            if airport_code in self.memory_cache:
                del self.memory_cache[airport_code]
                logger.info(f"Cleared memory cache for {airport_code}")
        else:
            self.memory_cache.clear()
            logger.info("Cleared all memory cache")
    
    async def clear_disk_cache(self, airport_code: Optional[str] = None):
        """Clear disk cache"""
        if airport_code:
            await self.disk_cache.delete(airport_code.upper())
        else:
            await self.disk_cache.clear_all()
    
    def get_cache_stats(self) -> Dict:
        """Get cache statistics"""
        total_memory = len(self.memory_cache)
        expired_memory = sum(
            1 for entry in self.memory_cache.values()
            if datetime.utcnow() >= entry['expires_at']
        )
        
        return {
            'totalCachedDestinations': total_memory,
            'expiredEntries': expired_memory,
            'validEntries': total_memory - expired_memory,
            'cacheTtlHours': self.cache_ttl_hours,
            'circuitBreakerState': self.circuit_breaker.state,
            'circuitBreakerFailures': self.circuit_breaker.failure_count
        }
    
    async def get_all_destinations(self) -> List[Dict]:
        """Get list of cached destinations"""
        destinations = []
        
        for airport_code, entry in self.memory_cache.items():
            data = entry['data']
            destinations.append({
                'airportCode': airport_code,
                'iataCode': data.get('iataCode'),
                'cityName': data.get('cityName'),
                'country': data.get('country')
            })
        
        return destinations
    
    async def get_destination_stats(self) -> Dict:
        """Get statistics about cached recommendations"""
        total_destinations = len(self.memory_cache)
        
        total_places = sum(
            len(entry['data'].get('places', []))
            for entry in self.memory_cache.values()
        )
        
        avg_places = round(total_places / total_destinations, 1) if total_destinations > 0 else 0
        
        return {
            'totalDestinations': total_destinations,
            'totalPlaces': total_places,
            'averagePlacesPerDestination': avg_places,
            **self.get_cache_stats()
        }
    def _maybe_refresh_background(self, airport_code: str, cached_data: Dict):
        """
        Check if cache is aging and trigger background refresh
        
        If data is > 20 hours old, refresh in background so next user gets fresh data
        """
        scraped_at_str = cached_data.get('scrapedAt')
        if not scraped_at_str:
            return
        
        try:
            # Parse when data was scraped
            scraped_at = datetime.fromisoformat(scraped_at_str.replace('Z', '+00:00'))
            age_hours = (datetime.utcnow() - scraped_at).total_seconds() / 3600
            
            # If data is > 20 hours old (4 hours before 24h expiry)
            if age_hours > 20:
                logger.info(
                    f"Cache aging for {airport_code} ({age_hours:.1f}h old). "
                    f"Triggering background refresh."
                )
                self._trigger_background_refresh(airport_code, limit=6)
        
        except Exception as e:
            logger.error(f"Error checking cache age for {airport_code}: {e}")
    
    def _trigger_background_refresh(self, airport_code: str, limit: int = 6):
        """
        Start background refresh without blocking current request
        
        Creates an asyncio task that runs in background
        """
        # Check if refresh already running for this airport
        if airport_code in self._refresh_tasks:
            task = self._refresh_tasks[airport_code]
            if not task.done():
                logger.debug(f"Background refresh already running for {airport_code}")
                return
        
        # Create background task
        task = asyncio.create_task(
            self._background_refresh(airport_code, limit)
        )
        
        # Track the task
        self._refresh_tasks[airport_code] = task
        
        # Clean up when done
        task.add_done_callback(lambda t: self._cleanup_refresh_task(airport_code))
    
    async def _background_refresh(self, airport_code: str, limit: int):
        """
        Refresh data in background (user already got response)
        
        This runs after user receives cached data, updating cache for next user
        """
        try:
            logger.info(f"[Background] Starting refresh for {airport_code}")
            
            # Scrape fresh data (with all protections)
            fresh_data = await self._scrape_with_protections(airport_code, limit)
            
            # Update caches
            await self._cache_data(airport_code, fresh_data)
            
            logger.info(f"[Background] ✓ Completed refresh for {airport_code}")
        
        except Exception as e:
            logger.error(f"[Background] ✗ Refresh failed for {airport_code}: {e}")
    
    def _cleanup_refresh_task(self, airport_code: str):
        """Remove completed refresh task from tracking"""
        if airport_code in self._refresh_tasks:
            del self._refresh_tasks[airport_code]
    async def close(self):
        """Close all connections"""
        await self.live_scraper.close()
        await self.airport_mapper.close()