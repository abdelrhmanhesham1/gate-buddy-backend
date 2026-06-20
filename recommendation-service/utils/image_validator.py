import re
import aiohttp
from urllib.parse import urlparse

TRUSTED_DOMAINS = frozenset({
    "upload.wikimedia.org",
    "commons.wikimedia.org",
    "maps.googleapis.com",
    "lh3.googleusercontent.com",
    "lh5.googleusercontent.com",
    "geo0.ggpht.com",
    "streetviewpixels-pa.googleapis.com",
    "media-cdn.tripadvisor.com",
    "images.mapillary.com",
    "cdn.getyourguide.com",
    "live.staticflickr.com",
    "fastly.4sqi.net",
})

BLOCKED_DOMAINS = frozenset({
    "wallpapercave.com",
    "wallpaperflare.com",
    "wallpaperaccess.com",
    "i.ytimg.com",
    "ytimg.com",
    "pinimg.com",
    "shutterstock.com",
    "gettyimages.com",
    "istockphoto.com",
    "alamy.com",
    "dreamstime.com",
    "depositphotos.com",
    "stock.adobe.com",
})

BLOCKED_EXTENSIONS = frozenset({
    ".pdf", ".svg", ".gif", ".docx", ".epub", ".webp"
})

IRRELEVANT_PATH_PATTERN = re.compile(
    r"(logo|icon|banner|avatar|thumbnail|placeholder|default|noimage|"
    r"sprite|flag|badge|button|arrow|background|pattern|texture|"
    r"wallpaper|stock|generic|header|footer)",
    re.IGNORECASE
)

async def validate_image_url(
    url: str,
    session: aiohttp.ClientSession
) -> bool:
    """
    Returns True only if the URL passes all trust and format checks.

    Checks (in order):
      1. Domain not in BLOCKED_DOMAINS
      2. Extension not in BLOCKED_EXTENSIONS
      3. Path does not match irrelevant content patterns
      4. HEAD request returns HTTP 200 with image/* Content-Type
      5. Content-Length >= 15KB (rejects icons and thumbnails)

    Never raises — returns False on any exception.
    """
    try:
        parsed = urlparse(url)
        domain = parsed.netloc.lower().lstrip("www.")
        path_lower = parsed.path.lower()

        if domain in BLOCKED_DOMAINS:
            return False

        if any(path_lower.endswith(ext) for ext in BLOCKED_EXTENSIONS):
            return False

        if IRRELEVANT_PATH_PATTERN.search(parsed.path):
            return False

        async with session.head(
            url,
            timeout=aiohttp.ClientTimeout(total=5),
            allow_redirects=True
        ) as resp:
            if resp.status != 200:
                return False

            content_type = resp.headers.get("Content-Type", "")
            if not content_type.startswith("image/"):
                return False

            content_length = int(resp.headers.get("Content-Length", "999999"))
            if content_length < 15_000:
                return False

        return True

    except Exception:
        return False


def compute_bing_trust_score(url: str) -> int:
    """
    Scores a Bing candidate URL for venue-image likelihood.
    Higher score = more likely to be a real photo of the place.
    Used to rank Bing results before validation attempts.
    """
    parsed = urlparse(url)
    domain = parsed.netloc.lower().lstrip("www.")
    score = 0

    if domain in TRUSTED_DOMAINS:
        score += 30
    if domain in BLOCKED_DOMAINS:
        score -= 100
    if "ytimg.com" in domain:
        score -= 80
    if any(d in domain for d in ("reuters", "bbc", "cnn", "wtop", "arabianbusiness")):
        score -= 20  # News sites serve article images, not venue photos
    if any(d in domain for d in ("tripadvisor", "getyourguide", "flickr", "mapillary")):
        score += 25
    if IRRELEVANT_PATH_PATTERN.search(parsed.path):
        score -= 40

    return score
