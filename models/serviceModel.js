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
      coordinates: { 
        type: [Number], 
        required: true,
        validate: {
          validator: function(val) {
            return Array.isArray(val) && val.length === 2 && !isNaN(val[0]) && !isNaN(val[1]);
          },
          message: "Location coordinates must be an array of two numbers [longitude, latitude]"
        }
      },
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
serviceSchema.index({ name: "text", description: "text", subCategory: "text" });
module.exports = mongoose.model("Service", serviceSchema);
