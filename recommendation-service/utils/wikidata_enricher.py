import aiohttp
import hashlib
from urllib.parse import quote

async def resolve_english_name(
    place: dict,
    session: aiohttp.ClientSession
) -> str | None:
    """
    Resolves the English label of a place entity from Wikidata using its
    wikidata tag from the OSM Overpass result.

    Used to build accurate Bing queries for Arabic/non-Latin named places.
    Example: 'دوار السمك' → 'Fish Roundabout' → correct Dubai landmark photos.

    Returns English label string, or None if unresolvable.
    Never raises — all errors return None.
    """
    wikidata_id = place.get("wikidataId") or place.get("wikidata")
    if not wikidata_id:
        return None

    url = f"https://www.wikidata.org/wiki/Special:EntityData/{wikidata_id}.json"
    try:
        async with session.get(
            url,
            timeout=aiohttp.ClientTimeout(total=5)
        ) as resp:
            if resp.status != 200:
                return None
            data = await resp.json(content_type=None)
            entity = data.get("entities", {}).get(wikidata_id, {})
            labels = entity.get("labels", {})

            if "en" in labels:
                return labels["en"]["value"]

            # Fall back to any Latin-script label
            LATIN_FALLBACKS = ("fr", "de", "es", "it", "pt", "nl", "sv")
            for lang in LATIN_FALLBACKS:
                if lang in labels:
                    return labels[lang]["value"]

            return None
    except Exception:
        return None


async def get_wikidata_image(
    place: dict,
    session: aiohttp.ClientSession
) -> str | None:
    """
    Fetches the P18 'image' property from Wikidata for the exact OSM entity.

    P18 images are editorially assigned to specific real-world places —
    zero ambiguity, zero topical mismatch. This is the highest-trust image
    source available without an API key.

    Constructs Wikimedia Commons CDN URL using MD5 path routing
    (required by Commons CDN — not optional).

    Returns a direct Wikimedia Commons 800px thumbnail URL, or None.
    Never raises — all errors return None.
    """
    wikidata_id = place.get("wikidataId") or place.get("wikidata")
    if not wikidata_id:
        return None

    url = f"https://www.wikidata.org/wiki/Special:EntityData/{wikidata_id}.json"
    try:
        async with session.get(
            url,
            timeout=aiohttp.ClientTimeout(total=5)
        ) as resp:
            if resp.status != 200:
                return None
            data = await resp.json(content_type=None)
            entity = data.get("entities", {}).get(wikidata_id, {})
            claims = entity.get("claims", {})
            p18 = claims.get("P18", [])

            if not p18:
                return None

            filename = p18[0]["mainsnak"]["datavalue"]["value"]
            filename = filename.replace(" ", "_")

            md5 = hashlib.md5(filename.encode("utf-8")).hexdigest()
            encoded = quote(filename, safe="")

            image_url = (
                f"https://upload.wikimedia.org/wikipedia/commons/thumb/"
                f"{md5[0]}/{md5[:2]}/{encoded}/800px-{encoded}"
            )
            return image_url

    except Exception:
        return None
