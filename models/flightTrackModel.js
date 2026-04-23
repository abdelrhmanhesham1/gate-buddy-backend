const mongoose = require("mongoose");

const flightTrackSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    flight: { type: mongoose.Schema.ObjectId, ref: "Flight", required: true },
    isActive: { type: Boolean, default: true },
    reminderMinutes: { type: Number, default: 25 },
    notificationsSent: [{ minutesBefore: Number, sentAt: { type: Date, default: Date.now } }],
  },
  { timestamps: true }
);

flightTrackSchema.index({ user: 1, flight: 1 }, { unique: true });
module.exports = mongoose.model("FlightTrack", flightTrackSchema);
