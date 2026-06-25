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
    "images.pexels.com",
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

# Only block these extensions when they appear as the final file extension
BLOCKED_EXTENSIONS = frozenset({
    ".pdf", ".svg", ".gif", ".docx", ".epub"
})

# Match against filename only (last path segment), not the full path
# This avoids blocking Wikimedia URLs whose path contains /thumb/ or /commons/
IRRELEVANT_FILENAME_PATTERN = re.compile(
    r"(logo|icon|banner|avatar|placeholder|default|noimage|"
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
      2. File extension not in BLOCKED_EXTENSIONS (checked against filename only)
      3. Filename does not match irrelevant content patterns
      4. HEAD request returns HTTP 200 with image/* Content-Type
      5. Content-Length >= 10KB (rejects icons; Wikimedia thumbs may omit this header)

    Never raises — returns False on any exception.
    """
    try:
        parsed = urlparse(url)
        domain = parsed.netloc.lower().lstrip("www.")

        if domain in BLOCKED_DOMAINS:
            return False

        # Extract filename only (last path component)
        filename = parsed.path.rstrip("/").rsplit("/", 1)[-1].lower()

        if any(filename.endswith(ext) for ext in BLOCKED_EXTENSIONS):
            return False

        if IRRELEVANT_FILENAME_PATTERN.search(filename):
            return False

        async with session.head(
            url,
            timeout=aiohttp.ClientTimeout(total=8),
            allow_redirects=True
        ) as resp:
            if resp.status != 200:
                return False

            content_type = resp.headers.get("Content-Type", "")
            if not content_type.startswith("image/"):
                return False

            # Some CDNs omit Content-Length; treat missing as OK
            raw_length = resp.headers.get("Content-Length")
            if raw_length and int(raw_length) < 10_000:
                return False

        return True

    except Exception:
        return False


def compute_bing_trust_score(url: str) -> int:
    parsed = urlparse(url)
    domain = parsed.netloc.lower().lstrip("www.")
    filename = parsed.path.rstrip("/").rsplit("/", 1)[-1]
    score = 0

    if domain in TRUSTED_DOMAINS:
        score += 30
    if domain in BLOCKED_DOMAINS:
        score -= 100
    if "ytimg.com" in domain:
        score -= 80
    if any(d in domain for d in ("reuters", "bbc", "cnn", "wtop", "arabianbusiness")):
        score -= 20
    if any(d in domain for d in ("tripadvisor", "getyourguide", "flickr", "mapillary")):
        score += 25
    if IRRELEVANT_FILENAME_PATTERN.search(filename):
        score -= 40

    return score
