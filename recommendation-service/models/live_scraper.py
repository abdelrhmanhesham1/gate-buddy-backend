"""
Live Web Scraper for GateBuddy Recommendations

Scrapes tourist attraction data in real-time from:
- Wikipedia API (for place descriptions)
- Wikimedia Commons API (for photos)
- Wikivoyage (for attraction lists)

No database storage required - all data fetched on-demand.
"""

import requests
import asyncio
import aiohttp
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
import random
import logging
from urllib.parse import quote
import platform
from models.pexels_scraper import PexelsScraper

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Wikipedia-compliant User-Agent
def get_compliant_user_agent() -> str:
    """Generate a Wikipedia policy-compliant User-Agent"""
    return "GateBuddy/1.0 (https://github.com/jdda200/gateBuddy; jdda200@gmail.com) aiohttp/3.9.1"

async def handle_response(response: aiohttp.ClientResponse):
    """Safely parse JSON or log error status"""
    if response.status != 200:
        text = await response.text()
        logger.error(f"API Error {response.status}: {text[:200]}")
        return None
    try:
        return await response.json()
    except Exception as e:
        logger.error(f"Failed to parse JSON: {e}")
        return None


class WikimediaScraper:
    """Scrapes photos from Wikimedia Commons"""
    
    def __init__(self):
        self.base_url = "https://commons.wikimedia.org/w/api.php"
        self.session = None
        
    async def get_session(self):
        """Get or create aiohttp session with Wikipedia-compliant User-Agent"""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession(
                headers={
                    'User-Agent': get_compliant_user_agent(),
                    'From': 'jdda200@gmail.com',  # Optional but recommended
                    'Accept': 'application/json'
                }
            )
        return self.session
    
    def _is_quality_image(self, title: str) -> bool:
        """Filter out bad quality or irrelevant images"""
        title_lower = title.lower()
        
        # Skip construction/interior/diagram images
        bad_keywords = [
            'construction', 'interior', 'diagram', 'plan', 
            'blueprint', 'making', 'under_construction',
            'inside', 'lobby', 'floor', 'ceiling', 'corridor'
        ]
        
        if any(kw in title_lower for kw in bad_keywords):
            return False
        
        # Only accept jpg/jpeg/png
        if not any(ext in title_lower for ext in ['.jpg', '.jpeg', '.png']):
            return False
        
        return True
    
    async def search_place_images(
        self, 
        place_name: str, 
        city: str, 
        limit: int = 6
    ) -> List[Dict[str, str]]:
        """
        Search for images of a tourist attraction on Wikimedia Commons
        
        Args:
            place_name: Name of the place (e.g., "Eiffel Tower")
            city: City name for context (e.g., "Paris")
            limit: Number of images to return
            
        Returns:
            List of image dictionaries with 'url' and 'credit'
        """
        session = await self.get_session()
        
        # Try multiple search queries for better results
        search_queries = [
            f"{place_name} {city}",
            place_name,
            f"{place_name} tourist attraction"
        ]
        
        all_images = []
        
        for query in search_queries:
            if len(all_images) >= limit:
                break
                
            try:
                params = {
                    'action': 'query',
                    'format': 'json',
                    'formatversion': '2',
                    'list': 'search',
                    'srsearch': query,
                    'srnamespace': '6',  # File namespace
                    'srlimit': limit * 2,  # Get extra for filtering
                    'srprop': 'size|timestamp'
                }
                
                async with session.get(self.base_url, params=params) as response:
                    data = await handle_response(response)
                    
                    if not data or 'query' not in data or 'search' not in data['query']:
                        continue
                    
                    for result in data['query']['search']:
                        if len(all_images) >= limit:
                            break
                            
                        title = result['title']
                        
                        # Apply stringent quality filters
                        if not self._is_quality_image(title):
                            continue
                        
                        # Get actual image URL
                        image_url = await self._get_image_url(title)
                        if image_url:
                            all_images.append({
                                'url': image_url,
                                'credit': 'Wikimedia Commons'
                            })
                
            except Exception as e:
                logger.error(f"Error searching images for {query}: {e}")
                continue
        
        # Return unique images (avoid duplicates)
        unique_images = []
        seen_urls = set()
        for img in all_images:
            if img['url'] not in seen_urls:
                unique_images.append(img)
                seen_urls.add(img['url'])
                if len(unique_images) >= limit:
                    break
        
        return unique_images[:limit]
    
    async def _get_image_url(self, title: str) -> Optional[str]:
        """
        Get the actual image URL from a file title
        
        Args:
            title: File title (e.g., "File:Eiffel_Tower.jpg")
            
        Returns:
            Direct image URL or None
        """
        session = await self.get_session()
        
        try:
            params = {
                'action': 'query',
                'format': 'json',
                'formatversion': '2',
                'titles': title,
                'prop': 'imageinfo',
                'iiprop': 'url|size',
                'iiurlwidth': 1200
            }
            
            async with session.get(self.base_url, params=params) as response:
                data = await handle_response(response)
                
                if not data or 'query' not in data or 'pages' not in data['query']:
                    return None
                
                pages = data['query']['pages']
                # formatversion=2 returns a list of pages
                page = pages[0] if isinstance(pages, list) else list(pages.values())[0]
                
                if 'imageinfo' not in page:
                    return None
                
                imageinfo = page['imageinfo'][0]
                
                # Filter by actual image file size
                if imageinfo.get('size', 0) < 100000:
                    return None
                
                # Prefer thumburl (resized), fallback to full url
                return imageinfo.get('thumburl') or imageinfo.get('url')
                
        except Exception as e:
            logger.error(f"Error getting image URL for {title}: {e}")
            return None
    
    async def close(self):
        """Close the aiohttp session"""
        if self.session and not self.session.closed:
            await self.session.close()


class WikipediaScraper:
    """Scrapes place information from Wikipedia"""
    
    def __init__(self):
        self.base_url = "https://en.wikipedia.org/w/api.php"
        self.session = None
        
    async def get_session(self):
        """Get or create aiohttp session with Wikipedia-compliant User-Agent"""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession(
                headers={
                    'User-Agent': get_compliant_user_agent(),
                    'From': 'jdda200@gmail.com',  # Optional but recommended
                    'Accept': 'application/json'
                }
            )
        return self.session
    
    async def get_place_info(
        self, 
        place_name: str, 
        city: str
    ) -> Optional[Dict[str, any]]:
        """
        Get information about a tourist attraction from Wikipedia
        
        Args:
            place_name: Name of the place
            city: City name for context
            
        Returns:
            Dictionary with description, rating, vicinity, etc.
        """
        session = await self.get_session()
        
        try:
            # Search for the Wikipedia page
            search_query = f"{place_name} {city}"
            params = {
                'action': 'query',
                'format': 'json',
                'list': 'search',
                'srsearch': search_query,
                'srlimit': 5
            }
            
            async with session.get(self.base_url, params=params) as response:
                data = await handle_response(response)
                
                if not data or 'query' not in data or not data['query']['search']:
                    return None
                
                # Find the best-matching title from search results
                page_title = None
                place_words = [w for w in place_name.split() if len(w) > 2]
                min_matches = 2 if len(place_words) >= 3 else 1
                
                for result in data['query']['search']:
                    candidate = result['title']
                    
                    # Reject if title is just the city name
                    if candidate.lower().strip() == city.lower().strip():
                        continue
                    
                    matching_words = sum(1 for w in place_words if w.lower() in candidate.lower())
                    if matching_words >= min_matches:
                        page_title = candidate
                        break
                
                if not page_title:
                    return None
            
            # Get page extract (summary)
            params = {
                'action': 'query',
                'format': 'json',
                'titles': page_title,
                'prop': 'extracts|coordinates',
                'exintro': '1',
                'explaintext': '1',
                'exsentences': 2  # Get 2 sentences for description
            }
            
            async with session.get(self.base_url, params=params) as response:
                data = await handle_response(response)
                
                if not data or 'query' not in data or 'pages' not in data['query']:
                    return None
                
                pages = data['query']['pages']
                page = list(pages.values())[0]
                
                extract = page.get('extract', '')
                coordinates = page.get('coordinates', [{}])[0] if 'coordinates' in page else {}
                
                # Clean up extract (remove newlines, limit length)
                description = extract.replace('\n', ' ').strip()
                if len(description) > 250:
                    description = description[:247] + "..."
                
                return {
                    'name': place_name,
                    'description': description,
                    'category': self._infer_category(page_title, description),
                    'rating': None,  # Let frontend handle display
                    'vicinity': city,
                    'coordinates': coordinates
                }
                
        except Exception as e:
            logger.error(f"Error getting place info for {place_name}: {e}")
            return None
    
    def _infer_category(self, title: str, description: str) -> str:
        """
        Infer place category from title and description
        
        Args:
            title: Wikipedia page title
            description: Place description
            
        Returns:
            Category string
        """
        title_lower = title.lower()
        desc_lower = description.lower()
        
        if any(word in title_lower for word in ['museum', 'gallery', 'exhibition']):
            return 'museum'
        elif any(word in title_lower for word in ['cathedral', 'church', 'mosque', 'temple', 'basilica']):
            return 'religious'
        elif any(word in title_lower for word in ['palace', 'castle', 'fort']):
            return 'historical'
        elif any(word in title_lower for word in ['park', 'garden', 'zoo']):
            return 'park'
        elif any(word in title_lower for word in ['tower', 'monument', 'memorial', 'arch', 'statue']):
            return 'monument'
        elif any(word in desc_lower for word in ['shopping', 'market', 'bazaar']):
            return 'shopping'
        else:
            return 'landmark'
    
    async def get_tourist_attractions(
        self, 
        city_name: str, 
        country: str,
        limit: int = 10
    ) -> List[str]:
        """
        Get list of top tourist attractions for a city
        
        Args:
            city_name: Name of the city
            country: Country name
            limit: Maximum number of attractions
            
        Returns:
            List of attraction names
        """
        session = await self.get_session()
        
        try:
            # If we know the city reliably, use our pre-verified list to avoid NLP errors and broken websites
            fallback = await self._get_fallback_attractions(city_name)
            if city_name in ['Paris', 'London', 'Cairo', 'Dubai', 'Sharm El Sheikh', 'Frankfurt', 'Doha', 'New York', 'Tokyo', 'Rome']:
                return fallback[:limit]

            # Otherwise attempt to search for city tourism page
            search_query = f"{city_name} {country} tourist attractions"
            params = {
                'action': 'query',
                'format': 'json',
                'list': 'search',
                'srsearch': search_query,
                'srlimit': 3
            }
            
            async with session.get(self.base_url, params=params) as response:
                data = await handle_response(response)
                
                if not data or 'query' not in data or not data['query']['search']:
                    return await self._get_fallback_attractions(city_name)
                    
                page_title = data['query']['search'][0]['title']
                params = {
                    'action': 'query',
                    'format': 'json',
                    'titles': page_title,
                    'prop': 'extracts',
                    'explaintext': '1'
                }
                
                async with session.get(self.base_url, params=params) as response2:
                    data2 = await handle_response(response2)
                    
                    if not data2:
                        return await self._get_fallback_attractions(city_name)
                    
                    pages = data2['query']['pages']
                    page = list(pages.values())[0]
                    extract = page.get('extract', '')
                    
                    attractions = self._extract_attractions_from_text(extract, city_name)
                    return attractions[:limit]
                    
        except Exception as e:
            logger.error(f"Error getting tourist attractions for {city_name}: {e}")
            return await self._get_fallback_attractions(city_name)
    
    def _extract_attractions_from_text(self, text: str, city_name: str) -> List[str]:
        """
        Extract attraction names from Wikipedia text
        (Basic implementation - can be enhanced with NLP)
        """
        attractions = []
        
        # Look for capitalized phrases (likely attraction names)
        import re
        
        # Common patterns for attractions
        patterns = [
            r'(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Tower|Museum|Palace|Cathedral|Church|Mosque|Temple|Park|Garden|Square|Bridge|Castle|Fort|Monument|Memorial)))',
            r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+is\s+a\s+(?:famous|popular|historic|ancient)',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text)
            attractions.extend(matches)
        
        # Remove duplicates and filter
        unique_attractions = []
        seen = set()
        for attr in attractions:
            attr_clean = attr.strip()
            if attr_clean and attr_clean not in seen and city_name not in attr_clean:
                unique_attractions.append(attr_clean)
                seen.add(attr_clean)
        
        return unique_attractions
    
    async def _get_fallback_attractions(self, city_name: str) -> List[str]:
        """
        Fallback attraction list for major cities
        """
        fallback_data = {
            'Paris': ['Eiffel Tower', 'Louvre Museum', 'Arc de Triomphe', 'Notre-Dame Cathedral', 'Sacré-Cœur', 'Musée d\'Orsay'],
            'London': ['Big Ben', 'Tower of London', 'British Museum', 'London Eye', 'Buckingham Palace', 'Tower Bridge'],
            'Cairo': ['Pyramids of Giza', 'Egyptian Museum', 'Khan el-Khalili', 'Citadel of Cairo', 'Al-Azhar Mosque', 'Cairo Tower'],
            'New York': ['Statue of Liberty', 'Central Park', 'Empire State', 'Times Square', 'Brooklyn Bridge', 'Metropolitan Museum'],
            'Tokyo': ['Senso-ji Temple', 'Tokyo Tower', 'Meiji Shrine', 'Imperial Palace', 'Shibuya Crossing', 'Tsukiji Market'],
            'Rome': ['Colosseum', 'Vatican Museums', 'Trevi Fountain', 'Pantheon', 'Roman Forum', 'Spanish Steps'],
            'Dubai': ['Burj Khalifa', 'The Dubai Mall', 'Palm Jumeirah', 'Dubai Marina', 'Burj Al Arab', 'Dubai Fountain'],
            'Sharm El Sheikh': ['Ras Mohammed National Park', 'Naama Bay', 'Mount Sinai', 'Saint Catherine\'s Monastery', 'Tiran Island', 'Soho Square'],
            'Frankfurt': ['Römer', 'Main Tower', 'Städel Museum', 'Palmengarten', 'Frankfurt Cathedral', 'Goethe House'],
            'Doha': ['Museum of Islamic Art', 'Souq Waqif', 'The Pearl-Qatar', 'Katara Cultural Village', 'Aspire Park', 'National Museum of Qatar'],
        }
        
        return fallback_data.get(city_name, [f"{city_name} City Center"])
    
    async def close(self):
        """Close the aiohttp session"""
        if self.session and not self.session.closed:
            await self.session.close()


class LiveDataScraper:
    """
    Main orchestrator for live data scraping.
    Combines Wikipedia and Wikimedia Commons data.
    """
    
    def __init__(self):
        self.wiki_scraper = WikipediaScraper()
        self.media_scraper = WikimediaScraper()
        self.pexels_scraper = PexelsScraper()
    
    async def scrape_destination_data(
        self,
        city_name: str,
        country: str,
        airport_code: str,
        limit: int = 6
    ) -> Optional[Dict]:
        """
        Scrape complete destination data with tourist attractions and photos
        
        Args:
            city_name: Name of the city
            country: Country name
            airport_code: ICAO or IATA airport code
            limit: Number of places to return
            
        Returns:
            Complete destination dictionary ready for API response
        """
        try:
            logger.info(f"Scraping data for {city_name}, {country}...")
            
            # Get list of tourist attractions
            attraction_names = await self.wiki_scraper.get_tourist_attractions(
                city_name, 
                country,
                limit=limit + 4  # Get extra in case some fail
            )
            
            if not attraction_names:
                logger.warning(f"No attractions found for {city_name}")
                return None
            
            # Scrape data for each attraction
            places = []
            for idx, attraction_name in enumerate(attraction_names):
                if len(places) >= limit:
                    break
                
                # Be respectful: Add delay between attractions (except first one)
                if idx > 0:
                    await asyncio.sleep(0.5)  # 500ms between each attraction
                
                # Get place info from Wikipedia
                place_info = await self.wiki_scraper.get_place_info(attraction_name, city_name)
                
                if not place_info:
                    logger.warning(f"No info found for {attraction_name}, skipping...")
                    continue
                
                # Small delay before fetching images
                await asyncio.sleep(0.3)  # 300ms before images
                
                # Get images concurrently from Pexels and Wikimedia Commons
                images_pexels, images_wiki = await asyncio.gather(
                    self.pexels_scraper.search_images(attraction_name, city_name, limit=6),
                    self.media_scraper.search_place_images(attraction_name, city_name, limit=6)
                )
                
                # Merge, deduplicate, take best 6
                seen_urls = set()
                merged = []
                for img in images_pexels + images_wiki:
                    if img['url'] not in seen_urls:
                        merged.append(img)
                        seen_urls.add(img['url'])
                images = merged[:6]
                
                if not images:
                    logger.warning(f"No images found for {attraction_name}, skipping...")
                    continue
                
                maps_link = f"https://www.google.com/maps/search/?api=1&query={quote(attraction_name + ' ' + city_name)}"
                
                # Build place object
                place = {
                    'name': place_info['name'],
                    'category': place_info['category'],
                    'description': place_info['description'],
                    'rating': place_info['rating'],
                    'vicinity': place_info.get('vicinity', city_name),
                    'photos': images,
                    'googleMapsLink': maps_link
                }
                
                places.append(place)
                logger.info(f"[OK] Scraped {attraction_name} ({len(images)} photos)")
            
            if not places:
                logger.error(f"Failed to scrape any valid places for {city_name}")
                return None
            
            # Build complete destination object
            destination = {
                'airportCode': airport_code,
                'cityName': city_name,
                'country': country,
                'places': places,
                'message': f"Top places to visit in {city_name}, {country}",
                'scrapedAt': datetime.utcnow().isoformat()
            }
            
            logger.info(f"[OK] Successfully scraped {len(places)} places for {city_name}")
            return destination
            
        except Exception as e:
            logger.error(f"Error scraping destination data: {e}", exc_info=True)
            return None
    
    async def close(self):
        """Close all scraper sessions"""
        await self.wiki_scraper.close()
        await self.media_scraper.close()
        await self.pexels_scraper.close()
