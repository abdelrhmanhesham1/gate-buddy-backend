const mongoose = require("mongoose");

const airportSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  name: { type: String, required: true },
  operationHours: { type: String, default: "24/7" },
  contactCenter: { type: String },
  wifi: { type: Boolean, default: false },
  parkingSpaces: { type: Number }
}, { timestamps: true });

module.exports = mongoose.model("Airport", airportSchema);
