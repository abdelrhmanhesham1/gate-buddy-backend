const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: ["COUNTERS", "FINANCIAL", "VIP_SERVICES", "ACCESSIBILITY", "SHOPS", "RESTAURANTS"] },
    subCategory: String,
    description: String,
    status: { type: String, default: "Open", enum: ["Open", "Closed", "Busy", "Available"] },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    terminal: String,
    gate: String,
    zone: String,
    rating: { type: Number, default: 0, min: 0, max: 5 },
    images: [String],
    cuisine: [String],
    waitTime: { type: Number, default: 0 },
    operatingHours: { type: String, default: "24/24" },
    
    contactNumber: String,
    amenities: [String], // for VIP & Accessibility features list
    
    // UI Specific: Airline Counters
    airline: String,
    airlineLogo: String,
    gates: [String],
    services: [String], // ["Check-in", "Baggage Drop", "Special Assistance"]
  },
  { timestamps: true }
);

serviceSchema.index({ location: "2dsphere" });
module.exports = mongoose.model("Service", serviceSchema);
