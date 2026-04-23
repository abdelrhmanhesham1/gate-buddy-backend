const mongoose = require("mongoose");
const deviceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
  fcmToken: { type: String, required: true },
  platform: { type: String, enum: ["ios", "android", "web"], required: true },
  lastUsed: { type: Date, default: Date.now },
}, { timestamps: true });
deviceSchema.index({ fcmToken: 1 }, { unique: true });
module.exports = mongoose.model("Device", deviceSchema);
