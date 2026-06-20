"""
Live Data Scraper for GateBuddy Recommendations (v4.0)
Sources:
- GitHub mwgg/Airports database (airport geolocation)
- Overpass API / OpenStreetMap (nearby tourist attractions)
- Wikipedia API (place descriptions)
- DuckDuckGo / Public Media Proxy (high-quality photos, keyless)
"""

import asyncio
import aiohttp
import re
import json
import logging
from typing import List, Dict, Optional, Tuple
from datetime import datetime
from urllib.parse import quote, quote_plus

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
OVERPASS_AGENT = "AirportRec/1.0"
FALLBACK_IMAGE = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600"
AIRPORTS_URL = "https://raw.githubusercontent.com/mwgg/Airports/master/airports.json"


class AirportsDatabase:
    """In-memory cache of the GitHub airports dataset."""

    def __init__(self):
        self._data: Optional[Dict] = None
        self._lock = asyncio.Lock()

    async def load(self, session: aiohttp.ClientSession) -> Dict:
        async with self._lock:
            if self._data is not None:
                return self._data
            try:
                logger.info("Downloading airports database ...")
                async with session.get(
                    AIRPORTS_URL,
                    headers={"User-Agent": USER_AGENT},
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as resp:
                    if resp.status == 200:
                        self._data = await resp.json(content_type=None)
                        logger.info(f"Loaded {len(self._data)} airports")
                    else:
                        logger.error(f"Airports DB HTTP {resp.status}")
                        self._data = {}
            except Exception as e:
                logger.error(f"Failed to load airports DB: {e}")
                self._data = {}
            return self._data

    def lookup(self, code: str) -> Optional[Dict]:
        if self._data is None:
            return None
        code = code.upper()
        airport = self._data.get(code)
        if airport:
            return airport
        for entry in self._data.values():
            if entry.get("iata", "").upper() == code:
                return entry
        return None


class ImageFetcher:
    """Fetches real photos via a modernized keyless proxy pipeline."""

    _VALID_EXT = (".jpg", ".jpeg", ".png")

    @staticmethod
    async def fetch(session: aiohttp.ClientSession, query: str) -> Tuple[str, str]:
        try:
            # Modern Keyless Proxy Request bypassing raw vapi regex strings
            url = f"https://duckduckgo.com/html/?q={quote_plus(query)}+travel+attraction"
            headers = {"User-Agent": USER_AGENT}
            
            async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=6)) as resp:
                if resp.status == 200:
                    html = await resp.text()
                    # Fallback structural search parsing img URLs from modern DuckDuckGo layouts
                    links = re.findall(r'//img\.duckduckgo\.com/iu/\?u=([^&]+)', html)
                    for link in links:
                        unquoted = quote_plus(link)
                        if any(unquoted.lower().endswith(ext) for ext in ImageFetcher._VALID_EXT):
                            return unquoted, "Web Media"
        except Exception as e:
            logger.debug(f"Image proxy bypass failed for '{query}': {e}")

        return FALLBACK_IMAGE, "Unsplash License"


class WikipediaDescriptionFetcher:
    """Fetches introductory summary from Wikipedia."""

    _API = "https://en.wikipedia.org/w/api.php"
    _DEFAULT = "A popular local attraction worth visiting."

    @staticmethod
    async def fetch(session: aiohttp.ClientSession, title: str) -> str:
        try:
            params = {
                "action": "query",
                "format": "json",
                "prop": "extracts",
                "exintro": True,
                "explaintext": True,
                "exchars": 180,
                "titles": title,
                "redirects": 1,
            }
            async with session.get(
                WikipediaDescriptionFetcher._API,
                params=params,
                headers={"User-Agent": OVERPASS_AGENT},
                timeout=aiohttp.ClientTimeout(total=8),
            ) as resp:
                data = await resp.json()

            pages = data.get("query", {}).get("pages", {})
            if pages:
                extract = list(pages.values())[0].get("extract", "").strip()
                if extract:
                    return extract

        except Exception as e:
            logger.debug(f"Wikipedia fetch failed for '{title}': {e}")

        return WikipediaDescriptionFetcher._DEFAULT


class OverpassAttractionFinder:
    """Discovers tourist attractions near coordinates via Overpass / OSM."""

    _URL = "https://overpass.openstreetmap.fr/api/interpreter"

    @staticmethod
    async def find(
        session: aiohttp.ClientSession,
        lat: float,
        lon: float,
        radius_m: int = 25000,
        limit: int = 40,
    ) -> List[Dict]:
        query = (
            f'[out:json][timeout:25];'
            f'nwr(around:{radius_m},{lat},{lon})["tourism"="attraction"];'
            f'out center {limit};'
        )
        try:
            async with session.post(
                OverpassAttractionFinder._URL,
                data={"data": query},
                headers={"User-Agent": OVERPASS_AGENT},
                timeout=aiohttp.ClientTimeout(total=30),
            ) as resp:
                if resp.status != 200:
                    logger.error(f"Overpass HTTP {resp.status}")
                    return []
                data = await resp.json()
                return data.get("elements", [])
        except Exception as e:
            logger.error(f"Overpass query failed: {e}")
            return []


class LiveDataScraper:
    """Main orchestrator resolving airport data using robust location ranking algorithms."""

    def __init__(self):
        self._session: Optional[aiohttp.ClientSession] = None
        self._airports_db = AirportsDatabase()
        self._concurrency = asyncio.Semaphore(4)

    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session

    async def get_city_info(self, airport_code: str) -> Optional[Dict]:
        session = await self._get_session()
        await self._airports_db.load(session)
        airport = self._airports_db.lookup(airport_code)
        if not airport:
            return None
        return {
            "city": airport.get("city", "Unknown"),
            "country": airport.get("country", "Unknown"),
        }

    def _calculate_popularity_score(self, element: Dict) -> int:
        """Calculates popularity index based on OpenStreetMap tags."""
        tags = element.get("tags", {})
        score = 0
        
        # High value indicators
        if "wikipedia" in tags: score += 15
        if "wikidata" in tags: score += 10
        if "historic" in tags: score += 5
        if tags.get("building") in ["palace", "castle", "cathedral", "temple", "monument"]: score += 12
        if tags.get("attraction") in ["theme_park", "museum", "viewpoint"]: score += 8
        
        # Exclude broad neighborhoods, boundaries, or generic landuse types
        if tags.get("landuse") or tags.get("place") in ["suburb", "neighborhood"]:
            score -= 20
            
        return score

    async def scrape_destination_data(
        self,
        city_name: str,
        country: str,
        airport_code: str,
        limit: int = 6,
    ) -> Optional[Dict]:
        session = await self._get_session()

        airports = await self._airports_db.load(session)
        airport = self._airports_db.lookup(airport_code)
        if not airport:
            logger.error(f"Airport '{airport_code}' not found in database")
            return None

        lat, lon = airport["lat"], airport["lon"]
        resolved_city = airport.get("city", city_name) or city_name
        resolved_country = airport.get("country", country) or country

        logger.info(f"Scraping via Overpass for {resolved_city} ({lat}, {lon}) ...")

        elements = await OverpassAttractionFinder.find(session, lat, lon)
        if not elements:
            logger.warning(f"Overpass returned no attractions for {airport_code}")
            return None

        # Sort dynamically using our compound scoring algorithm
        elements.sort(key=self._calculate_popularity_score, reverse=True)

        named_elements = [el for el in elements if el.get("tags", {}).get("name")]

        seen_names = set()
        unique_elements = []
        for el in named_elements:
            name = el["tags"]["name"].strip()
            if name.lower() not in seen_names:
                seen_names.add(name.lower())
                unique_elements.append(el)

        candidates = unique_elements[: limit + 6]

        tasks = [
            self._enrich_place(session, el, resolved_city, lat, lon)
            for el in candidates
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        places = []
        for result in results:
            if isinstance(result, Exception) or result is None:
                continue
            places.append(result)
            if len(places) >= limit:
                break

        if not places:
            logger.error(f"No valid places enriched for {resolved_city}")
            return None

        return {
            "airportCode": airport_code.upper(),
            "cityName": resolved_city,
            "country": resolved_country,
            "places": places,
            "message": f"Top places to visit in {resolved_city}, {resolved_country}",
            "scrapedAt": datetime.utcnow().isoformat(),
        }

    async def _enrich_place(
        self,
        session: aiohttp.ClientSession,
        element: Dict,
        city: str,
        fallback_lat: float,
        fallback_lon: float,
    ) -> Optional[Dict]:
        async with self._concurrency:
            tags = element.get("tags", {})
            name = tags["name"]

            p_lat = element.get("lat") or element.get("center", {}).get("lat", fallback_lat)
            p_lon = element.get("lon") or element.get("center", {}).get("lon", fallback_lon)

            # Build clean Google Maps Query link
            search_query = f"{name}, {city}"
            maps_link = f"https://www.google.com/maps/search/?api=1&query={quote(search_query)}"

            desc_task = WikipediaDescriptionFetcher.fetch(session, name)
            img_task = ImageFetcher.fetch(session, f"{name} {city}")

            description, (image_url, image_credit) = await asyncio.gather(desc_task, img_task)

            return {
                "name": name,
                "category": tags.get("tourism", "Attraction").title(),
                "description": description,
                "image": image_url,
                "imageCredit": image_credit,
                "rating": 4.8 if ("wikipedia" in tags or "wikidata" in tags) else 4.2,
                "vicinity": tags.get("addr:full") or tags.get("addr:street") or f"{p_lat:.4f}, {p_lon:.4f}",
                "googleMapsLink": maps_link,
            }

    async def close(self):
        if self._session and not self._session.closed:
            await self._session.close()