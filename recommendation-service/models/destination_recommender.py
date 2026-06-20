from typing import List, Dict, Optional
import asyncio 
import random
from datetime import datetime, timedelta
from models.live_scraper import LiveDataScraper
from models.scraping_utils import (
    RateLimiter,
    CircuitBreaker,
    CircuitOpenError,
    DiskCache,
    retry_with_backoff
)
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DestinationRecommender:
    """
    Production-ready recommendation system with:
    - Real-time web scraping from Wikipedia & OpenStreetMap
    - Multi-tier caching (memory + disk)
    - Rate limiting protection with circuit breakers
    """
    
    def __init__(self):
        self.live_scraper = LiveDataScraper()
        self.rate_limiter = RateLimiter(max_requests=50, time_window=60)
        self.circuit_breaker = CircuitBreaker(failure_threshold=5, timeout=300)
        
        self.memory_cache = {}  
        self.disk_cache = DiskCache('data/cache')  
        self.cache_ttl_hours = 24
        self._refresh_tasks = {} 

    async def get_recommendations_for_airport(
        self,
        airport_code: str,
        user_id: Optional[str] = None,
        limit: int = 6,
        force_refresh: bool = False
    ) -> Optional[Dict]:
        airport_code = airport_code.upper()
        
        if not force_refresh:
            if cached := self._get_from_memory(airport_code):
                logger.info(f"✓ Memory cache hit: {airport_code}")
                self._maybe_refresh_background(airport_code, cached)
                return self._prepare_response(cached, limit, user_id)
        
        if not force_refresh:
            if cached := await self.disk_cache.get(airport_code):
                self._store_in_memory(airport_code, cached)
                logger.info(f"✓ Disk cache hit: {airport_code}")
                self._maybe_refresh_background(airport_code, cached)
                return self._prepare_response(cached, limit, user_id)
        
        try:
            data = await self._scrape_with_protections(airport_code, limit)
            await self._cache_data(airport_code, data)
            return self._prepare_response(data, limit, user_id)
        
        except CircuitOpenError as e:
            logger.error(f"Circuit breaker open for {airport_code}: {e}")
            return await self._serve_fallback(airport_code, limit, user_id)
        except Exception as e:
            logger.error(f"Scraping failed for {airport_code}: {e}")
            return await self._serve_fallback(airport_code, limit, user_id)
    
    async def _scrape_with_protections(self, airport_code: str, limit: int) -> Dict:
        async def _do_scrape():
            await self.rate_limiter.acquire()
            return await self.circuit_breaker.call(
                retry_with_backoff,
                self.live_scraper.scrape_destination_data,
                "", "",
                airport_code,
                limit + 4,
                max_retries=3,
                initial_delay=1.0,
                backoff_factor=2.0
            )
        
        data = await _do_scrape()
        if not data:
            raise ValueError(f"No data scraped for {airport_code}")
        return data
    
    async def _serve_fallback(self, airport_code: str, limit: int, user_id: Optional[str]) -> Dict:
        stale = await self.disk_cache.get_stale(airport_code)
        if stale:
            logger.warning(f"Serving STALE cache for {airport_code}")
            response = self._prepare_response(stale, limit, user_id)
            response['warning'] = 'Data may be outdated (live scraping unavailable)'
            return response
        
        logger.warning(f"Serving GENERIC recommendations for {airport_code}")
        return await self._generic_recommendations(airport_code, limit)
    
    async def _generic_recommendations(self, airport_code: str, limit: int) -> Dict:
        city_info = await self.live_scraper.get_city_info(airport_code)
        if not city_info:
            return {
                'airportCode': airport_code, 'cityName': 'Unknown', 'country': 'Unknown',
                'places': [], 'message': 'Airport code not recognized', 'error': 'No data available'
            }
        
        city, country = city_info['city'], city_info['country']
        return {
            'airportCode': airport_code, 'cityName': city, 'country': country,
            'places': [{
                'name': f"{city} City Center", 'category': 'Area',
                'description': f"Explore the heart of {city} and discover local culture.",
                'rating': 4.0, 'vicinity': city, 'image': self._get_fallback_image(city),
                'imageCredit': None, 'googleMapsLink': f"https://www.google.com/maps/search/?api=1&query={quote(city)}"
            }],
            'message': f"Top places to visit in {country}"
        }
    
    def _get_from_memory(self, airport_code: str) -> Optional[Dict]:
        if airport_code not in self.memory_cache:
            return None
        entry = self.memory_cache[airport_code]
        if datetime.utcnow() >= entry['expires_at']:
            del self.memory_cache[airport_code]
            return None
        return entry['data']
    
    def _store_in_memory(self, airport_code: str, data: Dict):
        self.memory_cache[airport_code] = {
            'data': data, 'expires_at': datetime.utcnow() + timedelta(hours=self.cache_ttl_hours)
        }
    
    async def _cache_data(self, airport_code: str, data: Dict):
        self._store_in_memory(airport_code, data)
        await self.disk_cache.set(airport_code, data, ttl_hours=self.cache_ttl_hours)
    
    def _prepare_response(self, destination: Dict, limit: int, user_id: Optional[str]) -> Dict:
        places = destination.get('places', [])
        return {
            'airportCode': destination.get('airportCode'),
            'cityName': destination.get('cityName'),
            'country': destination.get('country'),
            'places': places[:limit],
            'message': destination.get('message', f"Top places to visit in {destination.get('country')}")
        }
    
    def _get_fallback_image(self, place_name: str) -> str:
        import hashlib
        seed = hashlib.md5(place_name.encode()).hexdigest()[:8]
        return f"https://picsum.photos/seed/{seed}/800/600"
    
    def clear_cache(self, airport_code: Optional[str] = None):
        if airport_code:
            airport_code = airport_code.upper()
            if airport_code in self.memory_cache:
                del self.memory_cache[airport_code]
        else:
            self.memory_cache.clear()
    
    async def clear_disk_cache(self, airport_code: Optional[str] = None):
        if airport_code:
            await self.disk_cache.delete(airport_code.upper())
        else:
            await self.disk_cache.clear_all()
            
    def get_cache_stats(self) -> Dict:
        total_memory = len(self.memory_cache)
        return {
            'totalCachedDestinations': total_memory,
            'circuitBreakerState': self.circuit_breaker.state,
            'circuitBreakerFailures': self.circuit_breaker.failure_count
        }

    async def get_all_destinations(self) -> List[Dict]:
        return [{
            'airportCode': k, 'cityName': v['data'].get('cityName'), 'country': v['data'].get('country')
        } for k, v in self.memory_cache.items()]

    async def get_destination_stats(self) -> Dict:
        total = len(self.memory_cache)
        return {'totalDestinations': total, 'totalPlaces': total * 6, 'averagePlacesPerDestination': 6.0}

    def _maybe_refresh_background(self, airport_code: str, cached_data: Dict):
        scraped_at_str = cached_data.get('scrapedAt')
        if not scraped_at_str: return
        try:
            scraped_at = datetime.fromisoformat(scraped_at_str.replace('Z', '+00:00'))
            if (datetime.utcnow() - scraped_at).total_seconds() / 3600 > 20:
                self._trigger_background_refresh(airport_code, limit=6)
        except Exception:
            pass

    def _trigger_background_refresh(self, airport_code: str, limit: int = 6):
        if airport_code in self._refresh_tasks and not self._refresh_tasks[airport_code].done():
            return
        task = asyncio.create_task(self._background_refresh(airport_code, limit))
        self._refresh_tasks[airport_code] = task
        task.add_done_callback(lambda t: self._refresh_tasks.pop(airport_code, None))

    async def _background_refresh(self, airport_code: str, limit: int):
        try:
            fresh_data = await self._scrape_with_protections(airport_code, limit)
            await self._cache_data(airport_code, fresh_data)
        except Exception:
            pass

    async def close(self):
        await self.live_scraper.close()