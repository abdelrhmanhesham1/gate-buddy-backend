const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Please tell us your name!"], trim: true },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, "Please provide a valid email"],
      required: [function () { return !this.auth_providers || this.auth_providers.length === 0; }, "Email is required"],
    },
    password: { type: String, select: false, minlength: 8, required: [function () { return !this.auth_providers || this.auth_providers.length === 0; }, "Password is required"] },
    passwordConfirm: { type: String, required: [function () { return !this.auth_providers || this.auth_providers.length === 0; }, "Please confirm password"], validate: { validator: function (el) { return el === this.password; }, message: "Passwords do not match!" } },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    active: { type: Boolean, default: true, select: false },
    auth_providers: [{ provider: { type: String, enum: ["google", "facebook", "github"], required: true }, provider_id: { type: String, required: true }, email_verified: Boolean, linked_at: { type: Date, default: Date.now } }],
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
    verificationCode: { type: String, select: false },
    verificationCodeExpires: { type: Date, select: false },
    // UI Preferences
    preferences: {
      darkMode: { type: Boolean, default: false },
      language: { type: String, default: "en", enum: ["en", "ar", "fr"] },
      pushEnabled: { type: Boolean, default: true }
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ "auth_providers.provider": 1, "auth_providers.provider_id": 1 }, { unique: true, sparse: true });

userSchema.virtual("isLocked").get(function() { return !!(this.lockUntil && this.lockUntil > Date.now()); });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.methods.correctPassword = async function (cand, userPass) { return await bcrypt.compare(cand, userPass); };
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) { if (this.passwordChangedAt) { const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10); return JWTTimestamp < changedTimestamp; } return false; };
userSchema.methods.createPasswordResetToken = function () { const resetToken = crypto.randomBytes(32).toString("hex"); this.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex"); this.passwordResetExpires = Date.now() + 10 * 60 * 1000; return resetToken; };

module.exports = mongoose.model("User", userSchema);
