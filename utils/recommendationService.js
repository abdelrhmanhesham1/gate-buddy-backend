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
      {
        name: "Duty Free Shop",
        category: "Shopping",
        description: "Tax-free luxury goods, travel essentials, and souvenirs inside the airport.",
        rating: 4.5,
        vicinity: "Airport terminal",
        image: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800",
        imageCredit: "Unsplash",
        googleMapsLink: "https://www.google.com/maps/search/?api=1&query=duty%20free%20shop%20airport"
      },
      {
        name: "Executive Lounge",
        category: "VIP",
        description: "Quiet seating, refreshments, and business facilities before departure.",
        rating: 4.8,
        vicinity: "Airport terminal",
        image: "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=800",
        imageCredit: "Unsplash",
        googleMapsLink: "https://www.google.com/maps/search/?api=1&query=airport%20executive%20lounge"
      },
      {
        name: "Food Court",
        category: "Dining",
        description: "A convenient selection of quick meals, cafes, and international food options.",
        rating: 4.2,
        vicinity: "Airport terminal",
        image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800",
        imageCredit: "Unsplash",
        googleMapsLink: "https://www.google.com/maps/search/?api=1&query=airport%20food%20court"
      }
    ];
  }
}

module.exports = new RecommendationService();
