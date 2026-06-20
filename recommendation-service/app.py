from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import uvicorn
import os
import traceback
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from models.destination_recommender import DestinationRecommender

recommender: Optional[DestinationRecommender] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle clean engine initialization and shutdown execution structures"""
    global recommender
    recommender = DestinationRecommender()
    print("[START] Recommendation engine initialized (Algorithmic Sorting Mode)")
    yield
    if recommender:
        await recommender.close()
    print("[STOP] Recommendation engine connections safely freed")

app = FastAPI(
    title="Gate Buddy Destination Recommendation Service",
    version="4.0.0",
    description="Live web scraping recommendation engine optimized with OSM weight-ranking heuristics.",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("ALLOWED_ORIGIN", "*")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- REQUEST / RESPONSE MODELS ---

class RecommendationRequest(BaseModel):
    airportCode: str = Field(
        ..., 
        min_length=3, 
        max_length=4,
        description="ICAO (4-letter) or IATA (3-letter) airport code",
        example="HECA"
    )
    userId: Optional[str] = Field(None, description="Optional user identifier string")
    limit: int = Field(default=6, ge=1, le=12, description="Target item limit count")

class Place(BaseModel):
    name: str
    category: str
    description: str
    image: str
    imageCredit: Optional[str] = None
    rating: float
    vicinity: Optional[str] = None
    googleMapsLink: str

class RecommendationResponse(BaseModel):
    airportCode: str
    cityName: str
    country: str
    places: List[Place]
    message: str

class DestinationInfo(BaseModel):
    airportCode: str
    cityName: str
    country: str

class StatsResponse(BaseModel):
    totalDestinations: int
    totalPlaces: int
    averagePlacesPerDestination: float

# --- API ROUTING ENDPOINTS ---

@app.get("/health")
async def health_check():
    cache_stats = recommender.get_cache_stats() if recommender else {}
    return {
        "status": "healthy",
        "service": "destination-recommendation-engine",
        "version": "4.0.0",
        "engineOptimization": "OSM Popularity Weight Indexing Engine",
        **cache_stats
    }

@app.post("/recommend", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest):
    if not recommender:
        raise HTTPException(status_code=503, detail="Recommendation system context uninitialized.")
        
    try:
        result = await recommender.get_recommendations_for_airport(
            airport_code=request.airportCode.upper(),
            user_id=request.userId,
            limit=request.limit
        )
        
        if not result or not result.get("places"):
            raise HTTPException(
                status_code=404,
                detail=f"No high-confidence locations mapped near airport {request.airportCode.upper()}."
            )
        
        return RecommendationResponse(**result)
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"🔥 Processing Exception Mapped:\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": str(e),
                "type": type(e).__name__,
                "msg": "Data extraction engine tracking unexpected variant payload formatting."
            }
        )

@app.get("/destinations", response_model=List[DestinationInfo])
async def get_all_destinations():
    if not recommender:
         return []
    return await recommender.get_all_destinations()

@app.get("/stats", response_model=StatsResponse)
async def get_stats():
    if not recommender:
        return {"totalDestinations": 0, "totalPlaces": 0, "averagePlacesPerDestination": 0.0}
    return await recommender.get_destination_stats()

@app.delete("/cache")
async def clear_cache(airportCode: Optional[str] = None):
    if not recommender:
        raise HTTPException(status_code=503, detail="Engine uninitialized")
        
    recommender.clear_cache(airportCode)
    await recommender.clear_disk_cache(airportCode)
    
    return {
        "success": True,
        "message": f"Cache pipeline flushed for identifier: {airportCode.upper() if airportCode else 'ALL'}"
    }

@app.get("/")
async def root():
    return {"status": "online", "engine": "GateBuddy Location Engine v4.0"}


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")