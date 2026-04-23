import os
import aiohttp
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

class PexelsScraper:
    
    def __init__(self):
        self.api_key = os.getenv("PEXELS_API_KEY")
        self.base_url = "https://api.pexels.com/v1/search"
        self.session = None
        if not self.api_key:
            logger.warning("PEXELS_API_KEY is not set. Pexels scraper will fail authentication.")

    async def get_session(self):
        """Get or create aiohttp session with Pexels auth header"""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession(
                headers={
                    "Authorization": self.api_key or ""
                }
            )
        return self.session

    async def search_images(self, place_name: str, city: str, limit: int = 6) -> List[Dict[str, str]]:
        """
        Search for images of a tourist attraction on Pexels.
        """
        if not self.api_key:
            return []

        session = await self.get_session()
        query = f"{place_name} {city}"
        params = {
            "query": query,
            "per_page": limit
        }

        try:
            async with session.get(self.base_url, params=params) as response:
                if response.status != 200:
                    text = await response.text()
                    logger.error(f"Pexels API Error {response.status}: {text[:200]}")
                    return []
                
                data = await response.json()
                photos = data.get("photos", [])
                
                results = []
                for photo in photos:
                    results.append({
                        "url": photo["src"]["large2x"],  # highest quality
                        "credit": f"Photo by {photo['photographer']} on Pexels"
                    })
                
                return results

        except Exception as e:
            logger.error(f"Pexels fetch failed for {query}: {e}")
            return []

    async def close(self):
        """Close the aiohttp session"""
        if self.session and not self.session.closed:
            await self.session.close()
