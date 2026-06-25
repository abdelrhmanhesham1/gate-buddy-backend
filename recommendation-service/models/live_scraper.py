"""
Live Data Scraper for GateBuddy Recommendations (v5.0)

Sources:
- GitHub mwgg/Airports database  (airport geolocation)
- Overpass API / OpenStreetMap   (tourist attractions — wikidata/wikipedia tagged only)
- Wikipedia API                  (descriptions, hero images)
- Image waterfall                (Wikidata P18 → Wikipedia → Wikimedia Commons → Pexels)
"""

import asyncio
import aiohttp
import re
import logging
import os
from typing import List, Dict, Optional, Tuple
from datetime import datetime
from urllib.parse import quote
from utils.image_waterfall import image_waterfall

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OVERPASS_AGENT = "GateBuddy/5.0 (contact: support@gatebuddy.app)"
AIRPORTS_URL   = "https://raw.githubusercontent.com/mwgg/Airports/master/airports.json"
FALLBACK_IMAGE = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600"


# ── Airports Database ──────────────────────────────────────────────────────────

class AirportsDatabase:
    def __init__(self):
        self._data: Optional[Dict] = None
        self._lock = asyncio.Lock()

    async def load(self, session: aiohttp.ClientSession) -> Dict:
        async with self._lock:
            if self._data is not None:
                return self._data
            try:
                async with session.get(
                    AIRPORTS_URL,
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as resp:
                    self._data = await resp.json(content_type=None) if resp.status == 200 else {}
                    logger.info("Loaded %d airports", len(self._data))
            except Exception as e:
                logger.error("Airports DB failed: %s", e)
                self._data = {}
            return self._data

    def lookup(self, code: str) -> Optional[Dict]:
        if not self._data:
            return None
        code = code.upper()
        airport = self._data.get(code)
        if airport:
            return airport
        for entry in self._data.values():
            if entry.get("iata", "").upper() == code:
                return entry
        return None


# ── Overpass Attraction Finder ─────────────────────────────────────────────────

class OverpassAttractionFinder:
    """
    Queries Overpass for tourist attractions that have wikidata or wikipedia OSM tags.
    This guarantees all returned places are encyclopedic and have real photos available.
    Obscure local places (pharmacies, unnamed spots) are excluded by this constraint.
    """

    _ENDPOINTS = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.openstreetmap.fr/api/interpreter",
        "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    ]

    @staticmethod
    def _build_query(lat: float, lon: float, radius_m: int = 30000, limit: int = 60) -> str:
        # Only return elements that have wikidata OR wikipedia tags.
        # This ensures every result has an encyclopedic source for photos & descriptions.
        return (
            f'[out:json][timeout:30];'
            f'('
            f'  nwr(around:{radius_m},{lat},{lon})["tourism"~"attraction|museum|gallery"]["wikidata"];'
            f'  nwr(around:{radius_m},{lat},{lon})["tourism"~"attraction|museum|gallery"]["wikipedia"];'
            f'  nwr(around:{radius_m},{lat},{lon})["historic"]["wikidata"];'
            f'  nwr(around:{radius_m},{lat},{lon})["historic"]["wikipedia"];'
            f'  nwr(around:{radius_m},{lat},{lon})["amenity"~"theatre|concert_hall|arts_centre"]["wikidata"];'
            f'  nwr(around:{radius_m},{lat},{lon})["leisure"~"stadium"]["wikidata"];'
            f'  nwr(around:{radius_m},{lat},{lon})["building"~"cathedral|castle|palace|monument"]["wikidata"];'
            f');'
            f'out center {limit};'
        )

    @classmethod
    async def find(
        cls,
        session: aiohttp.ClientSession,
        lat: float,
        lon: float,
        radius_m: int = 30000,
        limit: int = 60,
    ) -> List[Dict]:
        query = cls._build_query(lat, lon, radius_m, limit)
        for endpoint in cls._ENDPOINTS:
            try:
                async with session.post(
                    endpoint,
                    data={"data": query},
                    headers={"User-Agent": OVERPASS_AGENT},
                    timeout=aiohttp.ClientTimeout(total=35),
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json(content_type=None)
                        elements = data.get("elements", [])
                        logger.info("Overpass returned %d elements from %s", len(elements), endpoint)
                        return elements
                    logger.warning("Overpass %s → HTTP %d", endpoint, resp.status)
            except Exception as e:
                logger.warning("Overpass %s failed: %s", endpoint, e)
        return []


# ── Wikipedia Description Fetcher ─────────────────────────────────────────────

class WikipediaDescriptionFetcher:
    _DEFAULT = "A popular local attraction worth visiting."

    @staticmethod
    async def fetch(session: aiohttp.ClientSession, title: str, lang: str = "en") -> str:
        try:
            lang = lang if re.match(r"^[a-z-]{2,12}$", lang) else "en"
            params = {
                "action":      "query",
                "format":      "json",
                "prop":        "extracts",
                "exintro":     True,
                "explaintext": True,
                "exchars":     200,
                "titles":      title,
                "redirects":   1,
            }
            async with session.get(
                f"https://{lang}.wikipedia.org/w/api.php",
                params=params,
                headers={"User-Agent": OVERPASS_AGENT},
                timeout=aiohttp.ClientTimeout(total=8),
            ) as resp:
                data = await resp.json(content_type=None)

            for page in data.get("query", {}).get("pages", {}).values():
                extract = page.get("extract", "").strip()
                if extract and len(extract) > 20:
                    return extract

        except Exception as e:
            logger.debug("Wikipedia desc failed for '%s': %s", title, e)

        return WikipediaDescriptionFetcher._DEFAULT


# ── Main Scraper ───────────────────────────────────────────────────────────────

class LiveDataScraper:

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
            "city":    airport.get("city", "Unknown"),
            "country": airport.get("country", "Unknown"),
            "lat":     airport.get("lat"),
            "lon":     airport.get("lon"),
        }

    def _score_element(self, el: Dict) -> int:
        tags = el.get("tags", {})
        score = 0
        # Both tags = highest priority
        if "wikidata"  in tags: score += 20
        if "wikipedia" in tags: score += 20
        # Building/feature type bonuses
        building = tags.get("building", "")
        if building in ("cathedral", "castle", "palace", "monument", "church"):
            score += 15
        tourism = tags.get("tourism", "")
        if tourism in ("museum", "gallery"):
            score += 12
        historic = tags.get("historic", "")
        if historic in ("castle", "monument", "ruins", "church", "fort", "building"):
            score += 10
        # Penalise neighbourhood/boundary shapes that sneak through
        if tags.get("landuse") or tags.get("place") in ("suburb", "neighborhood"):
            score -= 30
        return score

    def _parse_wikipedia_tag(self, tags: Dict) -> Tuple[Optional[str], Optional[str]]:
        value = tags.get("wikipedia", "")
        if not value or ":" not in value:
            return None, None
        lang, title = value.split(":", 1)
        return (lang.strip() or "en"), title.replace("_", " ").strip() or None

    async def scrape_destination_data(
        self,
        city_name: str,
        country: str,
        airport_code: str,
        limit: int = 6,
    ) -> Optional[Dict]:
        session = await self._get_session()
        await self._airports_db.load(session)

        airport = self._airports_db.lookup(airport_code)
        if not airport:
            logger.error("Airport '%s' not found", airport_code)
            return None

        lat = airport["lat"]
        lon = airport["lon"]
        resolved_city    = airport.get("city",    city_name) or city_name
        resolved_country = airport.get("country", country)   or country

        logger.info("Fetching attractions for %s (%s, %s)", resolved_city, lat, lon)

        elements = await OverpassAttractionFinder.find(session, lat, lon)
        if not elements:
            logger.warning("No Overpass results for %s", airport_code)
            return None

        # Score, deduplicate, and take top candidates
        elements.sort(key=self._score_element, reverse=True)
        named = [el for el in elements if el.get("tags", {}).get("name")]
        seen, unique = set(), []
        for el in named:
            key = el["tags"]["name"].strip().lower()
            if key not in seen:
                seen.add(key)
                unique.append(el)

        candidates = unique[: limit + 8]

        tasks = [
            self._enrich_place(session, el, resolved_city, resolved_country, lat, lon)
            for el in candidates
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        places = [r for r in results if r and not isinstance(r, Exception)][:limit]

        if not places:
            logger.error("No valid places for %s", resolved_city)
            return None

        return {
            "airportCode": airport_code.upper(),
            "cityName":    resolved_city,
            "country":     resolved_country,
            "places":      places,
            "message":     f"Top places to visit in {resolved_city}, {resolved_country}",
            "scrapedAt":   datetime.utcnow().isoformat(),
        }

    async def _enrich_place(
        self,
        session: aiohttp.ClientSession,
        element: Dict,
        city: str,
        country: str,
        fallback_lat: float,
        fallback_lon: float,
    ) -> Optional[Dict]:
        async with self._concurrency:
            tags = element.get("tags", {})
            name = tags.get("name", "").strip()
            if not name:
                return None

            p_lat = float(element.get("lat") or element.get("center", {}).get("lat", fallback_lat))
            p_lon = float(element.get("lon") or element.get("center", {}).get("lon", fallback_lon))

            wiki_lang, wiki_title = self._parse_wikipedia_tag(tags)
            wikidata_id = tags.get("wikidata")

            # Use English Wikipedia title for lookup if available; otherwise use the OSM name
            desc_title = wiki_title or name
            desc_lang  = wiki_lang  or "en"

            place = {
                "name":          name,
                "category":      _derive_category(tags),
                "rating":        4.9 if (wikidata_id and wiki_title) else (4.7 if wikidata_id or wiki_title else 4.2),
                "vicinity":      f"{p_lat:.4f}, {p_lon:.4f}",
                "googleMapsLink": f"https://www.google.com/maps/search/?api=1&query={quote(name + ', ' + city)}",
                "cityName":      city,
                "country":       country,
                "wikidataId":    wikidata_id,
                "wikidata":      wikidata_id,
                "wikipediaLang":  desc_lang,
                "wikipediaTitle": desc_title,
            }

            desc_task = WikipediaDescriptionFetcher.fetch(session, desc_title, desc_lang)
            img_task  = image_waterfall(
                place,
                session,
                google_api_key=os.getenv("GOOGLE_PLACES_API_KEY"),
                mapillary_token=os.getenv("MAPILLARY_ACCESS_TOKEN"),
                pexels_api_key=os.getenv("PEXELS_API_KEY"),
            )

            description, (image_url, image_credit) = await asyncio.gather(desc_task, img_task)

            place["description"]  = description
            place["image"]        = image_url or FALLBACK_IMAGE
            place["imageCredit"]  = image_credit or "Fallback"

            # Strip internal lookup fields before returning
            for key in ("wikidata", "wikidataId", "wikipediaLang", "wikipediaTitle", "cityName", "country"):
                place.pop(key, None)

            return place

    async def close(self):
        if self._session and not self._session.closed:
            await self._session.close()


def _derive_category(tags: Dict) -> str:
    tourism  = tags.get("tourism", "")
    historic = tags.get("historic", "")
    amenity  = tags.get("amenity", "")
    leisure  = tags.get("leisure", "")
    building = tags.get("building", "")

    if tourism == "museum" or amenity == "museum":
        return "Museum"
    if tourism == "gallery":
        return "Art Gallery"
    if tourism == "attraction":
        if building in ("cathedral", "church") or historic in ("church",):
            return "Religious Site"
        if historic in ("castle", "fort", "ruins"):
            return "Historic Site"
        return "Attraction"
    if historic:
        return "Historic Site"
    if amenity in ("theatre", "concert_hall", "arts_centre"):
        return "Culture"
    if leisure == "stadium":
        return "Stadium"
    if building in ("cathedral", "palace", "castle", "monument"):
        return "Landmark"
    return "Attraction"
