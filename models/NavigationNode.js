const mongoose = require("mongoose");

const navigationNodeSchema = new mongoose.Schema(
  {
    nodeId: { type: String, required: true, unique: true },
    name: { type: String },
    type: {
      type: String,
      enum: [
        "gate",
        "shop",
        "restaurant",
        "checkpoint",
        "elevator",
        "stairs",
        "entrance",
        "corridor",
        "room",
      ],
    },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    level: { type: Number, default: 0 },
    connectedTo: [
      {
        nodeId: { type: String },
        distanceMeters: { type: Number },
      },
    ],
    serviceRef: { type: mongoose.Schema.ObjectId, ref: "Service" },
  },
  { timestamps: true }
);

navigationNodeSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("NavigationNode", navigationNodeSchema);
