import asyncio, json
from dotenv import load_dotenv
load_dotenv()  # Load PEXELS_API_KEY from .env

from models.live_scraper import LiveDataScraper

async def test():
    scraper = LiveDataScraper()
    # Test with Dubai destinations to verify 6 places + Pexels integration
    res = await scraper.scrape_destination_data("Dubai", "United Arab Emirates", "DXB", 6)
    
    # Save output for review
    with open('output.json', 'w', encoding='utf-8') as f:
        json.dump(res, f, indent=2, ensure_ascii=False)
        
    print(f"Scraped {len(res['places'])} places")
    for p in res['places']:
        credits = [ph['credit'] for ph in p['photos']]
        pexels = sum(1 for c in credits if 'Pexels' in c)
        wiki = sum(1 for c in credits if 'Wikimedia' in c)
        print(f"  {p['name']}: {pexels} Pexels + {wiki} Wikimedia = {len(p['photos'])} photos")
        
    await scraper.close()

if __name__ == "__main__":
    asyncio.run(test())
