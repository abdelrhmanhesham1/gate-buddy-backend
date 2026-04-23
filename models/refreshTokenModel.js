const mongoose = require("mongoose");
const refreshTokenSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
  token: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  createdByIp: String,
  revokedAt: Date,
  replacedByToken: String,
}, { timestamps: true });
module.exports = mongoose.model("RefreshToken", refreshTokenSchema);
