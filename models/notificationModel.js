const mongoose = require("mongoose");
const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ["FLIGHT_UPDATE", "SECURITY", "PROMOTION", "GENERAL"], default: "GENERAL" },
  read: { type: Boolean, default: false, index: true },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });
notificationSchema.index({ recipient: 1, createdAt: -1 });
module.exports = mongoose.model("Notification", notificationSchema);
