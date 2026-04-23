from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import uvicorn
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load environment variables at the very beginning
load_dotenv()

from models.destination_recommender import DestinationRecommender

# Initialize recommender (needs to be global for lifespan access)
recommender = None

# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events"""
    global recommender
    # Startup
    recommender = DestinationRecommender()
    print("[START] Recommendation service started (Live Scraping Mode)")
    yield
    # Shutdown
    await recommender.close()
    print("[STOP] Recommendation service stopped")

app = FastAPI(
    title="Gate Buddy Destination Recommendation Service",
    version="3.0.0",
    description="Live web scraping recommendation system - Returns 6 places with real-time data from Wikipedia & Wikimedia Commons",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("ALLOWED_ORIGIN", "*")],  # Restrict this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 
# REQUEST/RESPONSE MODELS
# 

class RecommendationRequest(BaseModel):
    airportCode: str = Field(
        ..., 
        min_length=3, 
        max_length=4,
        description="ICAO (4-letter) or IATA (3-letter) airport code",
        example="HECA"
    )
    userId: Optional[str] = Field(
        None,
        description="Optional user ID for future personalization"
    )
    limit: int = Field(
        default=6, 
        ge=1, 
        le=12,
        description="Number of places to return (default: 6 for frontend grid)"
    )

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
    iataCode: Optional[str] = None
    cityName: str
    country: str

class StatsResponse(BaseModel):
    totalDestinations: int
    totalPlaces: int
    averagePlacesPerDestination: float

# 
# API ENDPOINTS
# 

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    cache_stats = recommender.get_cache_stats() if recommender else {}
    
    return {
        "status": "healthy",
        "service": "destination-recommendation",
        "version": "3.0.0",
        "dataSource": "Live Web Scraping (Wikipedia + Wikimedia Commons)",
        "caching": "24-hour in-memory cache",
        **cache_stats
    }

@app.post("/recommend", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest):
    """
    Get destination recommendations with shuffled photos.
    Each request returns different images for variety.
    
    - **airportCode**: ICAO (e.g., HECA) or IATA (e.g., CAI) code
    - **userId**: Optional for future personalization
    - **limit**: Number of places (default: 6 for frontend)
    
    Returns exactly 6 places by default, perfect for 2x3 grid layout.
    """
    try:
        result = await recommender.get_recommendations_for_airport(
            airport_code=request.airportCode.upper(),
            user_id=request.userId,
            limit=request.limit
        )
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail=f"No recommendations available for airport {request.airportCode}. "
                       f"Airport not in our database yet."
            )
        
        return RecommendationResponse(**result)
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detailed = traceback.format_exc()
        print(f"🔥 Recommendation Error:\n{error_detailed}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": str(e),
                "type": type(e).__name__,
                "msg": "Could not retrieve recommendations at this time."
            }
        )

@app.get("/destinations", response_model=List[DestinationInfo])
async def get_all_destinations():
    """
    Get list of all available destinations in the database.
    Useful for checking coverage and debugging.
    """
    try:
        destinations = await recommender.get_all_destinations()
        return destinations
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching destinations: {str(e)}"
        )

@app.get("/stats", response_model=StatsResponse)
async def get_stats():
    """
    Get statistics about the recommendation database.
    Shows total destinations, places, and averages.
    """
    try:
        stats = await recommender.get_destination_stats()
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching stats: {str(e)}"
        )

@app.delete("/cache")
async def clear_cache(airportCode: Optional[str] = None):
    """
    Clear cache (both memory and disk) for specific airport or all cached data.
    Useful for forcing fresh data scraping.
    
    - **airportCode**: Optional airport code to clear (if None, clears all)
    """
    try:
        # Clear memory cache
        recommender.clear_cache(airportCode)
        
        # Clear disk cache
        await recommender.clear_disk_cache(airportCode)
        
        if airportCode:
            return {
                "success": True,
                "message": f"Cache cleared for airport {airportCode} (memory + disk)",
                "clearedAirport": airportCode.upper()
            }
        else:
            return {
                "success": True,
                "message": "All cache cleared (memory + disk)"
            }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error clearing cache: {str(e)}"
        )

@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "Gate Buddy Recommendation Service v3.0",
        "dataSource": "Live Web Scraping (Wikipedia + Wikimedia Commons)",
        "defaultLimit": 6,
        "features": [
            "Real-time data scraping from Wikipedia",
            "High-quality photos from Wikimedia Commons",
            "24-hour intelligent caching",
            "Multiple photos per place (shuffled for variety)",
            "First request: 2-5 seconds, cached: <50ms",
            "Returns 6 places by default (perfect for 2x3 grid)",
            "Supports all major airports worldwide"
        ],
        "endpoints": {
            "health": "GET /health",
            "recommend": "POST /recommend",
            "destinations": "GET /destinations (cached only)",
            "stats": "GET /stats",
            "clearCache": "DELETE /cache (optional airport code)"
        }
    }

# 
# RUN SERVER
# 

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info"
    )