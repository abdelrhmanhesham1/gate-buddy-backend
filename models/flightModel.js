const mongoose = require("mongoose");

const flightSchema = new mongoose.Schema(
  {
    flightNumber: { type: String, required: [true, "Flight must have a number"], index: true },
    airline: { name: { type: String, required: true }, logo: String },
    type: { type: String, enum: ["domestic", "international"], default: "international" },
    direction: { type: String, enum: ["departure", "arrival"], required: true },
    route: {
      from: String,
      fromCode: { type: String, uppercase: true, minlength: 3, maxlength: 3 },
      to: String,
      toCode: { type: String, uppercase: true, minlength: 3, maxlength: 3 },
    },
    departure: { terminal: String, gate: String, nodeId: String, scheduledTime: { type: Date, required: true }, actualTime: Date },
    arrival: { terminal: String, gate: String, nodeId: String, scheduledTime: { type: Date, required: true }, actualTime: Date },
    status: { 
      type: String, 
      default: "ON_TIME", 
      enum: ["ON_TIME", "BOARDING", "DELAYED", "LANDED", "CANCELLED", "GATE_CHANGED", "DEPARTED", "IN_FLIGHT"] 
    },
    expireAt: { type: Date, index: { expires: 0 } },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

flightSchema.virtual("updates", { ref: "FlightUpdate", foreignField: "flight", localField: "_id" });

flightSchema.pre("save", function (next) {
  const completionTime = this.arrival?.actualTime || this.departure?.actualTime;
  if (completionTime) this.expireAt = new Date(completionTime.getTime() + 30 * 60 * 1000);
  next();
});

module.exports = mongoose.model("Flight", flightSchema);
