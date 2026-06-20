import unicodedata

AMBIGUOUS_PREFIXES = {"the ", "al ", "el ", "le ", "la ", "a "}

COMMON_NOUNS = {
    "waterfall", "beach", "walk", "view", "palm", "creek", "lake",
    "garden", "gate", "bridge", "tower", "island", "bay", "frame",
    "point", "market", "mall", "park", "square", "dome", "fountain",
    "valley", "falls", "canyon", "ridge", "grove", "springs",
}

VENUE_SUFFIXES = {
    "Attraction"  : "attraction visit",
    "Museum"      : "museum building",
    "Mall"        : "shopping mall",
    "Park"        : "park entrance",
    "Beach"       : "beach view",
    "Restaurant"  : "restaurant facade",
    "Hotel"       : "hotel building",
    "Mosque"      : "mosque architecture",
    "Church"      : "church building",
    "Temple"      : "temple exterior",
    "Monument"    : "monument landmark",
    "Castle"      : "castle historic site",
    "Palace"      : "palace historic site",
    "Gallery"     : "art gallery",
    "Stadium"     : "stadium aerial",
    "Market"      : "market souq",
    "Roundabout"  : "roundabout landmark",
    "Zoo"         : "zoo entrance",
    "Aquarium"    : "aquarium building",
    "ThemePark"   : "theme park entrance",
}

def is_latin(text: str) -> bool:
    """
    Returns True if all letter characters in text are Latin-script.
    Used to determine whether Wikidata English label resolution is needed.
    """
    return all(
        unicodedata.category(c).startswith("L") and ord(c) < 0x0250
        for c in text if not c.isspace()
    )

def is_ambiguous_name(name: str) -> bool:
    """
    Detects place names that are common English nouns likely to be
    misinterpreted literally by image search engines.
    Examples: 'The Waterfall', 'Al Garden', 'The Walk'
    """
    lower = name.lower().strip()
    for prefix in AMBIGUOUS_PREFIXES:
        if lower.startswith(prefix):
            remainder = lower[len(prefix):].split()
            if remainder and remainder[0] in COMMON_NOUNS:
                return True
    return False

def build_identity_locked_query(place: dict, resolved_name: str | None = None) -> str:
    """
    Constructs a geo-anchored, identity-locked Bing image search query.

    Three-layer lock:
      Layer 1 — Quote-wrap forces exact phrase match (proper noun, not keyword)
      Layer 2 — City + country anchors geographic context before Bing parses the name
      Layer 3 — Venue-type suffix anchors visual category to a real place photo

    For ambiguous names ('The Waterfall'), city is prepended BEFORE the quoted name
    to establish geographic intent before Bing processes the common noun.

    Args:
        place: Full place object dict
        resolved_name: English name resolved from Wikidata (preferred over original if available)

    Returns:
        Query string ready for Bing image search
    """
    name     = (resolved_name or place.get("name", "")).strip()
    city     = (place.get("cityName") or place.get("city", "")).strip()
    country  = place.get("country", "").strip()
    category = place.get("category", "Attraction")
    suffix   = VENUE_SUFFIXES.get(category, "landmark")

    if not name:
        return f"{city} {country} {suffix}"

    if is_ambiguous_name(name):
        # City FIRST: establishes geo context before Bing parses the common noun
        return f'{city} "{name}" {country} {suffix} place'
    else:
        return f'"{name}" {city} {country} {suffix}'
