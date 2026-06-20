import aiohttp
import logging
from utils.wikidata_enricher import get_wikidata_image, resolve_english_name
from utils.query_builder import build_identity_locked_query, is_latin
from utils.image_validator import validate_image_url, compute_bing_trust_score

logger = logging.getLogger(__name__)

# ── Strategy 0: Wikidata P18 ─────────────────────────────────────────────────

async def _strategy_wikidata_p18(
    place: dict,
    session: aiohttp.ClientSession
) -> tuple[str | None, str | None]:
    """
    Fetch the editorially-verified P18 image for the exact Wikidata entity.
    Requires wikidata= tag from OSM Overpass result.
    Trust level: HIGHEST — assigned by human editors to the specific place.
    """
    url = await get_wikidata_image(place, session)
    if url and await validate_image_url(url, session):
        return url, "Wikimedia Commons"
    return None, None


# ── Strategy 1: Wikipedia pageimages ─────────────────────────────────────────

async def _strategy_wikipedia_pageimage(
    place: dict,
    session: aiohttp.ClientSession
) -> tuple[str | None, str | None]:
    """
    Fetch the hero image from the Wikipedia article for this place.
    Uses the pageimages API prop — zero extra HTTP call if description
    fetch is already hitting the same endpoint in the pipeline.
    Trust level: HIGH — editorial photo tied to a specific article.
    """
    name    = place.get("name", "").strip()
    city    = place.get("cityName") or place.get("city", "")
    lang    = place.get("wikipediaLang", "en")
    titles  = f"{name} {city}".strip()

    url = (
        f"https://{lang}.wikipedia.org/w/api.php"
        f"?action=query&titles={titles}&prop=pageimages"
        f"&piprop=original&pithumbsize=800&format=json"
    )
    try:
        async with session.get(
            url,
            timeout=aiohttp.ClientTimeout(total=6)
        ) as resp:
            if resp.status != 200:
                return None, None
            data = await resp.json(content_type=None)
            pages = data.get("query", {}).get("pages", {})
            for page in pages.values():
                if page.get("ns", -1) == -1:
                    continue
                original = page.get("original", {}).get("source")
                thumbnail = page.get("thumbnail", {}).get("source")
                image_url = original or thumbnail
                if image_url and await validate_image_url(image_url, session):
                    return image_url, "Wikipedia"
            return None, None
    except Exception as exc:
        logger.debug("Wikipedia pageimage failed for '%s': %s", name, exc)
        return None, None


# ── Strategy 2: Google Places Photos ─────────────────────────────────────────

async def _strategy_google_places_photo(
    place: dict,
    session: aiohttp.ClientSession,
    google_api_key: str | None
) -> tuple[str | None, str | None]:
    """
    Fetch a photo tied to the exact Google Places ID.
    Photos are indexed by venue record, not keyword — zero topical ambiguity.
    Trust level: HIGHEST (when available) — visitor and business photos of the exact place.

    Requires GOOGLE_PLACES_API_KEY. Skipped silently if key is absent.
    Extracts Place ID from googleMapsLink query param 'query' field as fallback,
    or uses place.get('placeId') if already resolved upstream.
    """
    if not google_api_key:
        return None, None

    place_id = place.get("placeId")

    if not place_id:
        # Attempt extraction from googleMapsLink
        from urllib.parse import urlparse, parse_qs
        link = place.get("googleMapsLink", "")
        qs = parse_qs(urlparse(link).query)
        query_val = qs.get("query", [None])[0]
        if not query_val:
            return None, None

        # Resolve Place ID via Places Text Search
        search_url = (
            f"https://maps.googleapis.com/maps/api/place/findplacefromtext/json"
            f"?input={query_val}&inputtype=textquery&fields=place_id"
            f"&key={google_api_key}"
        )
        try:
            async with session.get(
                search_url,
                timeout=aiohttp.ClientTimeout(total=6)
            ) as resp:
                if resp.status != 200:
                    return None, None
                data = await resp.json(content_type=None)
                candidates = data.get("candidates", [])
                if not candidates:
                    return None, None
                place_id = candidates[0].get("place_id")
        except Exception as exc:
            logger.debug("Google Places ID resolution failed: %s", exc)
            return None, None

    if not place_id:
        return None, None

    # Fetch photo reference
    details_url = (
        f"https://maps.googleapis.com/maps/api/place/details/json"
        f"?place_id={place_id}&fields=photos&key={google_api_key}"
    )
    try:
        async with session.get(
            details_url,
            timeout=aiohttp.ClientTimeout(total=6)
        ) as resp:
            if resp.status != 200:
                return None, None
            data = await resp.json(content_type=None)
            photos = data.get("result", {}).get("photos", [])
            if not photos:
                return None, None

            photo_ref = photos[0].get("photo_reference")
            if not photo_ref:
                return None, None

            photo_url = (
                f"https://maps.googleapis.com/maps/api/place/photo"
                f"?maxwidth=800&photoreference={photo_ref}&key={google_api_key}"
            )
            if await validate_image_url(photo_url, session):
                return photo_url, "Google Places"
            return None, None
    except Exception as exc:
        logger.debug("Google Places photo fetch failed: %s", exc)
        return None, None


# ── Strategy 3: Mapillary (GPS-indexed) ──────────────────────────────────────

async def _strategy_mapillary(
    place: dict,
    session: aiohttp.ClientSession,
    mapillary_token: str | None
) -> tuple[str | None, str | None]:
    """
    Query Mapillary for street-level photos at the place's GPS coordinates.
    Photos are indexed by location, not by name — works for any venue regardless
    of notability or language of the name.
    Trust level: HIGH — geo-pinned to exact coordinates.

    Requires MAPILLARY_ACCESS_TOKEN (free tier available).
    Skipped silently if token absent or vicinity is not parseable lat/lng.
    """
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
        async with session.get(
            url,
            timeout=aiohttp.ClientTimeout(total=6)
        ) as resp:
            if resp.status != 200:
                return None, None
            data = await resp.json(content_type=None)
            images = data.get("data", [])
            for img in images:
                image_url = img.get("thumb_1024_url")
                if image_url and await validate_image_url(image_url, session):
                    return image_url, "Mapillary"
            return None, None
    except Exception as exc:
        logger.debug("Mapillary fetch failed for '%s': %s", place.get("name"), exc)
        return None, None


# ── Strategy 4: Identity-Locked Bing Scrape ───────────────────────────────────

async def _strategy_bing_identity_locked(
    place: dict,
    session: aiohttp.ClientSession,
    bing_scraper,
    resolved_name: str | None
) -> tuple[str | None, str | None]:
    """
    Bing image search with a geo-anchored, quote-wrapped identity-lock query.
    Falls back only after all venue-ID-anchored strategies have failed.

    Differences from the broken original:
      - Query uses resolved English name for non-Latin place names
      - Place name is quote-wrapped to force exact phrase match
      - City + country + venue suffix anchor geographic and visual context
      - Ambiguous names (e.g. 'The Waterfall') have city prepended before the name
      - Candidates are scored and ranked before validation attempts
      - Only top-3 candidates by trust score are attempted

    Trust level: PROBABILISTIC — improved but not guaranteed.
    """
    query = build_identity_locked_query(place, resolved_name)
    try:
        candidates = await bing_scraper.search(query)
    except Exception as exc:
        logger.debug("Bing scrape failed for query '%s': %s", query, exc)
        return None, None

    if not candidates:
        return None, None

    scored = sorted(
        candidates,
        key=lambda url: compute_bing_trust_score(url),
        reverse=True
    )

    for url in scored[:3]:
        try:
            if await validate_image_url(url, session):
                return url, "Bing Search"
        except Exception:
            continue

    return None, None


# ── Strategy 5: OSM Static Map Tile ──────────────────────────────────────────

async def _strategy_osm_static_map(
    place: dict,
    session: aiohttp.ClientSession
) -> tuple[str | None, str | None]:
    """
    Constructs an OpenStreetMap static tile URL centered on the place coordinates.
    Always geo-correct — never topically wrong.
    Not a photo, but always renders the right location.
    Used as the last resort before returning null.
    """
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
) -> tuple[str | None, str | None]:
    """
    Executes a ranked waterfall of image sourcing strategies, returning the
    first verified, venue-accurate image found.

    Strategy order (highest to lowest trust):
      0 — Wikidata P18          (entity-assigned, editorially verified, free)
      1 — Wikipedia pageimages  (article hero photo, free)
      2 — Google Places Photos  (venue-ID-tied, requires API key)
      3 — Mapillary             (GPS-indexed street photos, free tier)
      4 — Bing identity-lock    (geo-anchored keyword search, probabilistic)
      5 — OSM static map tile   (always geo-correct, not a photo)
      6 — null                  (safe fallback, frontend shows category icon)

    Pre-enrichment:
      For non-Latin place names, resolves English label from Wikidata
      before building the Bing query in Strategy 4. Stores resolved name
      on the place object as 'nameEn' for downstream use.

    Args:
        place:           Full place object dict
        session:         Shared aiohttp.ClientSession (never created internally)
        bing_scraper:    Existing scraper instance (demoted to Strategy 4)
        google_api_key:  GOOGLE_PLACES_API_KEY from env (optional)
        mapillary_token: MAPILLARY_ACCESS_TOKEN from env (optional)

    Returns:
        (image_url, image_credit) — both None if all strategies fail
    """
    name = place.get("name", "")

    # Pre-enrichment: resolve English name for non-Latin scripts
    resolved_name = None
    if not is_latin(name):
        resolved_name = await resolve_english_name(place, session)
        if resolved_name:
            place["nameEn"] = resolved_name
            logger.debug("Resolved '%s' → '%s'", name, resolved_name)

    # Strategy 0: Wikidata P18
    url, credit = await _strategy_wikidata_p18(place, session)
    if url:
        logger.debug("[S0-Wikidata] %s → %s", name, url)
        return url, credit

    # Strategy 1: Wikipedia pageimages
    url, credit = await _strategy_wikipedia_pageimage(place, session)
    if url:
        logger.debug("[S1-Wikipedia] %s → %s", name, url)
        return url, credit

    # Strategy 2: Google Places Photos
    url, credit = await _strategy_google_places_photo(place, session, google_api_key)
    if url:
        logger.debug("[S2-GooglePlaces] %s → %s", name, url)
        return url, credit

    # Strategy 3: Mapillary
    url, credit = await _strategy_mapillary(place, session, mapillary_token)
    if url:
        logger.debug("[S3-Mapillary] %s → %s", name, url)
        return url, credit

    # Strategy 4: Identity-locked Bing
    if bing_scraper:
        url, credit = await _strategy_bing_identity_locked(
            place, session, bing_scraper, resolved_name
        )
        if url:
            logger.debug("[S4-Bing] %s → %s", name, url)
            return url, credit

    # Strategy 5: OSM static map tile
    url, credit = await _strategy_osm_static_map(place, session)
    if url:
        logger.debug("[S5-OSM] %s → %s", name, url)
        return url, credit

    # Strategy 6: Null — safe, intentional, frontend must handle gracefully
    logger.warning("[S6-Null] No image found for '%s'", name)
    return None, None
