const axios = require("axios");

class RecommendationService {
  constructor() {
    this.failureCount = 0;
    this.lastFailure = null;
    this.CIRCUIT_THRESHOLD = 5;
    this.COOL_DOWN_MS = 60000; // 1 minute cooldown
  }

  async getRecommendationsSafe(destinationCode, userId = null) {
    // 1. Check Circuit Breaker
    if (this.failureCount >= this.CIRCUIT_THRESHOLD && (Date.now() - this.lastFailure < this.COOL_DOWN_MS)) {
      return this._getStaticFallbacks(); 
    }

    try {
      // 2. Optimized POST Request to Python FastAPI Service
      const response = await axios.post(`${process.env.AI_REC_URL}/recommend`, { 
        airportCode: destinationCode, 
        userId,
        limit: 6 
      }, {
        timeout: 12000 // 12s timeout to accommodate live scraping + polite delays
      });
      
      this.failureCount = 0;
      // Map Python 'places' to frontend expected array
      return response.data.places;
    } catch (err) {
      this.failureCount++;
      this.lastFailure = Date.now();
      console.error(`AI Rec Service Error: ${err.message}`);
      return this._getStaticFallbacks();
    }
  }

  _getStaticFallbacks() {
    return [
      { name: "Duty Free Shop", category: "Shopping", description: "Tax-free luxury goods and souvenirs.", rating: 4.5 },
      { name: "Executive Lounge", category: "VIP", description: "Premium relaxation and business facilities.", rating: 4.8 },
      { name: "Food Court", category: "Dining", description: "Diverse selection of international cuisines.", rating: 4.2 }
    ];
  }
}

module.exports = new RecommendationService();
