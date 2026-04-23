const mongoose = require("mongoose");

const flightUpdateSchema = new mongoose.Schema(
  {
    flight: { type: mongoose.Schema.ObjectId, ref: "Flight", required: true },
    updateType: { type: String, enum: ["STATUS", "GATE", "TIME"], required: true },
    field: String,
    before: String,
    after: String,
    timestamp: { type: Date, default: Date.now, index: { expires: "30d" } },
  },
  { timestamps: true }
);

flightUpdateSchema.index({ flight: 1, timestamp: -1 });
module.exports = mongoose.model("FlightUpdate", flightUpdateSchema);
