"""
Image sourcing waterfall for GateBuddy recommendation places.

Strategy order (highest → lowest accuracy):
  0  Wikidata P18         — editorially assigned image for the exact entity
  1  Wikipedia pageimage  — hero photo from the place's Wikipedia article (by OSM tag)
  2  Wikipedia search     — find article by name+city, get hero photo (no tag needed)
  3  Wikimedia Commons    — search Commons files by place name
  4  Mapillary            — GPS-indexed street photos (free tier)
  5  Pexels exact         — exact name+city query, no generic "landmark" padding
  6  OSM static map tile  — always geo-correct fallback
"""
import aiohttp
import hashlib
import logging
from urllib.parse import quote, quote_plus
from utils.wikidata_enricher import get_wikidata_image, resolve_english_name
from utils.image_validator import validate_image_url

logger = logging.getLogger(__name__)


# ── Strategy 0: Wikidata P18 ─────────────────────────────────────────────────

async def _strategy_wikidata_p18(place, session):
    url = await get_wikidata_image(place, session)
    if url and await validate_image_url(url, session):
        return url, "Wikimedia Commons"
    return None, None


# ── Strategy 1: Wikipedia pageimage (via OSM wikipedia tag) ──────────────────

async def _strategy_wikipedia_pageimage(place, session):
    lang   = place.get("wikipediaLang", "en")
    title  = place.get("wikipediaTitle")
    if not title:
        return None, None

    try:
        params = {
            "action":      "query",
            "format":      "json",
            "titles":      title,
            "prop":        "pageimages",
            "piprop":      "original|thumbnail",
            "pithumbsize": "800",
        }
        async with session.get(
            f"https://{lang}.wikipedia.org/w/api.php",
            params=params,
            headers={"User-Agent": "GateBuddy/1.0"},
            timeout=aiohttp.ClientTimeout(total=8),
        ) as resp:
            if resp.status != 200:
                return None, None
            data = await resp.json(content_type=None)

        for page in data.get("query", {}).get("pages", {}).values():
            img = (
                page.get("original", {}).get("source")
                or page.get("thumbnail", {}).get("source")
            )
            if img and await validate_image_url(img, session):
                return img, "Wikipedia"
    except Exception as exc:
        logger.debug("Wikipedia pageimage failed for '%s': %s", title, exc)

    return None, None


# ── Strategy 2: Wikipedia search by name + city (no tag needed) ──────────────

async def _strategy_wikipedia_search(place, session):
    name    = (place.get("nameEn") or place.get("name", "")).strip()
    city    = (place.get("cityName") or "").strip()
    country = (place.get("country")  or "").strip()

    # Try progressively broader searches until we find an article
    queries = []
    if city:
        queries.append(f"{name} {city}")
    queries.append(f"{name} {country}")
    queries.append(name)

    for q in queries:
        result = await _wikipedia_search_pageimage(q, session)
        if result[0]:
            return result

    return None, None


async def _wikipedia_search_pageimage(query, session):
    """
    Searches Wikipedia for query, returns the hero image of the top result.
    Single API call using generator=search + prop=pageimages.
    """
    try:
        params = {
            "action":       "query",
            "format":       "json",
            "generator":    "search",
            "gsrsearch":    query,
            "gsrnamespace": "0",
            "gsrlimit":     "3",
            "prop":         "pageimages",
            "piprop":       "original|thumbnail",
            "pithumbsize":  "800",
        }
        async with session.get(
            "https://en.wikipedia.org/w/api.php",
            params=params,
            headers={"User-Agent": "GateBuddy/1.0"},
            timeout=aiohttp.ClientTimeout(total=8),
        ) as resp:
            if resp.status != 200:
                return None, None
            data = await resp.json(content_type=None)

        pages = data.get("query", {}).get("pages", {})
        for page in sorted(pages.values(), key=lambda p: p.get("index", 999)):
            if page.get("ns", -1) != 0:
                continue
            img = (
                page.get("original", {}).get("source")
                or page.get("thumbnail", {}).get("source")
            )
            if img and await validate_image_url(img, session):
                return img, "Wikipedia"

    except Exception as exc:
        logger.debug("Wikipedia search failed for '%s': %s", query, exc)

    return None, None


# ── Strategy 3: Wikimedia Commons search ─────────────────────────────────────

async def _strategy_wikimedia_commons(place, session):
    """
    Searches Wikimedia Commons for photos matching the place name.
    Returns the first valid, well-sized photo found.
    """
    name    = (place.get("nameEn") or place.get("name", "")).strip()
    city    = (place.get("cityName") or "").strip()
    query   = f"{name} {city}".strip() if city else name

    try:
        params = {
            "action":       "query",
            "format":       "json",
            "list":         "search",
            "srsearch":     query,
            "srnamespace":  "6",   # File namespace
            "srlimit":      "10",
            "srprop":       "title",
        }
        async with session.get(
            "https://commons.wikimedia.org/w/api.php",
            params=params,
            headers={"User-Agent": "GateBuddy/1.0"},
            timeout=aiohttp.ClientTimeout(total=8),
        ) as resp:
            if resp.status != 200:
                return None, None
            data = await resp.json(content_type=None)

        titles = [r["title"] for r in data.get("query", {}).get("search", [])]
        # Filter to image files only (exclude SVGs, audio, etc.)
        image_titles = [
            t for t in titles
            if any(t.lower().endswith(ext) for ext in (".jpg", ".jpeg", ".png"))
        ]

        if not image_titles:
            return None, None

        # Batch-fetch imageinfo for candidates
        info_params = {
            "action":       "query",
            "format":       "json",
            "titles":       "|".join(image_titles[:5]),
            "prop":         "imageinfo",
            "iiprop":       "url",
            "iiurlwidth":   "800",
        }
        async with session.get(
            "https://commons.wikimedia.org/w/api.php",
            params=info_params,
            headers={"User-Agent": "GateBuddy/1.0"},
            timeout=aiohttp.ClientTimeout(total=8),
        ) as resp2:
            if resp2.status != 200:
                return None, None
            info_data = await resp2.json(content_type=None)

        for page in info_data.get("query", {}).get("pages", {}).values():
            info_list = page.get("imageinfo", [])
            if not info_list:
                continue
            img_url = info_list[0].get("thumburl") or info_list[0].get("url")
            if img_url and await validate_image_url(img_url, session):
                return img_url, "Wikimedia Commons"

    except Exception as exc:
        logger.debug("Wikimedia Commons search failed for '%s': %s", name, exc)

    return None, None


# ── Strategy 4: Mapillary (GPS-indexed, free tier) ───────────────────────────

async def _strategy_mapillary(place, session, mapillary_token):
    if not mapillary_token:
        return None, None
    vicinity = place.get("vicinity", "")
    try:
        lat, lng = [float(p.strip()) for p in vicinity.split(",")]
    except (ValueError, AttributeError):
        return None, None

    url = (
        f"https://graph.mapillary.com/images"
        f"?access_token={mapillary_token}"
        f"&fields=id,thumb_1024_url"
        f"&bbox={lng-0.001},{lat-0.001},{lng+0.001},{lat+0.001}"
        f"&limit=5"
    )
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=6)) as resp:
            if resp.status != 200:
                return None, None
            data = await resp.json(content_type=None)
            for img in data.get("data", []):
                image_url = img.get("thumb_1024_url")
                if image_url and await validate_image_url(image_url, session):
                    return image_url, "Mapillary"
    except Exception as exc:
        logger.debug("Mapillary failed for '%s': %s", place.get("name"), exc)

    return None, None


# ── Strategy 5: Pexels exact name query ──────────────────────────────────────

async def _strategy_pexels_exact(place, session, pexels_api_key):
    if not pexels_api_key:
        return None, None

    name    = (place.get("nameEn") or place.get("name", "")).strip()
    city    = (place.get("cityName") or "").strip()
    country = (place.get("country") or "").strip()

    # Use exact place name — no "landmark" padding which causes generic results
    queries = []
    if city:
        queries.append(f'"{name}" {city}')
    queries.append(f"{name} {country}")

    for query in queries:
        try:
            async with session.get(
                "https://api.pexels.com/v1/search",
                params={"query": query, "per_page": 5, "orientation": "landscape"},
                headers={"Authorization": pexels_api_key},
                timeout=aiohttp.ClientTimeout(total=8),
            ) as resp:
                if resp.status != 200:
                    continue
                data = await resp.json(content_type=None)
                for photo in data.get("photos", []):
                    src = photo.get("src", {})
                    img_url = src.get("large2x") or src.get("large")
                    if img_url and await validate_image_url(img_url, session):
                        return img_url, "Pexels"
        except Exception as exc:
            logger.debug("Pexels failed for '%s': %s", name, exc)

    return None, None


# ── Strategy 6: OSM static map tile ──────────────────────────────────────────

async def _strategy_osm_static_map(place, session):
    vicinity = place.get("vicinity", "")
    try:
        lat, lng = [float(p.strip()) for p in vicinity.split(",")]
    except (ValueError, AttributeError):
        return None, None

    url = (
        f"https://staticmap.openstreetmap.de/staticmap.php"
        f"?center={lat},{lng}&zoom=16&size=600x400"
        f"&markers={lat},{lng},red"
    )
    return url, "OpenStreetMap"


# ── Main Waterfall Entry Point ────────────────────────────────────────────────

async def image_waterfall(
    place: dict,
    session: aiohttp.ClientSession,
    bing_scraper=None,
    google_api_key: str | None = None,
    mapillary_token: str | None = None,
    pexels_api_key: str | None = None,
) -> tuple[str | None, str | None]:
    """
    Ranked waterfall returning the first verified, place-accurate image.

    Order (highest → lowest accuracy):
      0  Wikidata P18          (entity-pinned, editorially verified)
      1  Wikipedia pageimage   (article hero, via OSM wikipedia tag)
      2  Wikipedia name search (article hero, found by name+city — no tag needed)
      3  Wikimedia Commons     (curated, searched by place name)
      4  Mapillary             (GPS-indexed street photos)
      5  Pexels exact          (exact name+city query)
      6  OSM static map        (always geo-correct, not a photo)
    """
    name = place.get("name", "")

    # Pre-enrich: resolve English name for non-Latin scripts
    resolved_name = None
    if not _is_latin(name):
        resolved_name = await resolve_english_name(place, session)
        if resolved_name:
            place["nameEn"] = resolved_name

    # S0: Wikidata P18
    url, credit = await _strategy_wikidata_p18(place, session)
    if url:
        logger.debug("[S0-Wikidata] %s", name)
        return url, credit

    # S1: Wikipedia pageimage (via OSM tag)
    url, credit = await _strategy_wikipedia_pageimage(place, session)
    if url:
        logger.debug("[S1-Wikipedia-tag] %s", name)
        return url, credit

    # S2: Wikipedia search by name+city (no OSM tag needed)
    url, credit = await _strategy_wikipedia_search(place, session)
    if url:
        logger.debug("[S2-Wikipedia-search] %s", name)
        return url, credit

    # S3: Wikimedia Commons search
    url, credit = await _strategy_wikimedia_commons(place, session)
    if url:
        logger.debug("[S3-Wikimedia-Commons] %s", name)
        return url, credit

    # S4: Mapillary (GPS)
    url, credit = await _strategy_mapillary(place, session, mapillary_token)
    if url:
        logger.debug("[S4-Mapillary] %s", name)
        return url, credit

    # S5: Pexels exact
    url, credit = await _strategy_pexels_exact(place, session, pexels_api_key)
    if url:
        logger.debug("[S5-Pexels] %s", name)
        return url, credit

    # S6: OSM static map
    url, credit = await _strategy_osm_static_map(place, session)
    if url:
        logger.debug("[S6-OSM] %s", name)
        return url, credit

    logger.warning("[NULL] No image found for '%s'", name)
    return None, None


def _is_latin(text: str) -> bool:
    if not text:
        return True
    latin_count = sum(1 for c in text if c.isascii() and c.isalpha())
    return latin_count / max(len([c for c in text if c.isalpha()]), 1) > 0.6
