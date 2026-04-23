const crypto = require("crypto");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const RefreshToken = require("../models/refreshTokenModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const emailService = require("../utils/email");
const oauthVerifiers = require("../utils/oauthVerifiers");

// --- 1. CORE TOKEN ENGINE ---
const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
const signRefreshToken = (id) => jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN });

const createSendToken = async (user, statusCode, req, res) => {
  const accessToken = signToken(user._id);
  const rawRefreshToken = signRefreshToken(user._id);
  const hashedToken = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");

  await RefreshToken.deleteMany({ user: user._id, revokedAt: { $exists: false } });
  await RefreshToken.create({
    user: user._id,
    token: hashedToken,
    expiresAt: new Date(Date.now() + (parseInt(process.env.JWT_REFRESH_COOKIE_EXPIRES_IN) || 7) * 24 * 60 * 60 * 1000),
    createdByIp: req.ip
  });

  const cookieOptions = {
    expires: new Date(Date.now() + (parseInt(process.env.JWT_COOKIE_EXPIRES_IN) || 90) * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
    sameSite: 'strict'
  };

  res.cookie("jwt", accessToken, cookieOptions);
  res.cookie("refreshToken", rawRefreshToken, { ...cookieOptions, path: '/api/v1/users/refresh' });

  user.password = undefined;
  res.status(statusCode).json({ status: "success", token: accessToken, data: { user } });
};

// --- 2. OAUTH INTERNAL HELPER ---
const resolveOAuthUser = async (provider, profile, req, res) => {
  const { provider_id, email, name, picture } = profile;
  let user = await User.findOne({ "auth_providers.provider": provider, "auth_providers.provider_id": provider_id });

  if (!user && email) {
    user = await User.findOne({ email });
    if (user) {
      user.auth_providers.push({ provider, provider_id, linked_at: Date.now() });
      await user.save({ validateBeforeSave: false });
    }
  }

  if (!user) {
    user = await User.create({ name, email, photo: picture, auth_providers: [{ provider, provider_id }] });
  }

  await createSendToken(user, 200, req, res);
};

// --- 3. EXPORTED HANDLERS ---
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm
  });
  await createSendToken(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password +loginAttempts +lockUntil");
  if (!user) return next(new AppError("Incorrect email or password.", 401));
  if (user.isLocked) return next(new AppError("Account locked. Try again in 1 hour.", 423));
  if (!(await user.correctPassword(password, user.password))) {
    user.loginAttempts += 1;
    if (user.loginAttempts >= 5) user.lockUntil = Date.now() + 1 * 60 * 60 * 1000;
    await user.save({ validateBeforeSave: false });
    return next(new AppError("Incorrect email or password.", 401));
  }
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  await user.save({ validateBeforeSave: false });
  await createSendToken(user, 200, req, res);
});

exports.refreshToken = catchAsync(async (req, res, next) => {
  const raw = req.cookies.refreshToken;
  if (!raw) return next(new AppError("No refresh token.", 401));
  const hashedOld = crypto.createHash("sha256").update(raw).digest("hex");
  const stored = await RefreshToken.findOne({ token: hashedOld });
  if (!stored || stored.revokedAt) {
    if (stored) await RefreshToken.deleteMany({ user: stored.user });
    return next(new AppError("Token reuse detected.", 403));
  }
  const rawNew = signRefreshToken(stored.user);
  const hashedNew = crypto.createHash("sha256").update(rawNew).digest("hex");
  stored.revokedAt = Date.now();
  stored.replacedByToken = hashedNew;
  await stored.save();
  const user = await User.findById(stored.user);
  await createSendToken(user, 200, req, res);
});

exports.logout = catchAsync(async (req, res, next) => {
  const raw = req.cookies.refreshToken;
  if (raw) {
    const hashed = crypto.createHash("sha256").update(raw).digest("hex");
    await RefreshToken.findOneAndUpdate({ token: hashed }, { revokedAt: Date.now() });
  }
  res.cookie("jwt", "loggedout", { expires: new Date(Date.now() + 1 * 1000), httpOnly: true });
  res.cookie("refreshToken", "loggedout", { expires: new Date(Date.now() + 1 * 1000), httpOnly: true, path: '/api/v1/users/refresh' });
  res.status(200).json({ status: "success" });
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(200).json({ status: "success", message: "Instructions sent." });
  const clientType = req.headers["x-client-type"];
  if (clientType === "mobile") {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationCode = crypto.createHash("sha256").update(code).digest("hex");
    user.verificationCodeExpires = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });
    await emailService.sendPasswordReset(user.email, code);
  } else {
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });
    const resetURL = `${req.protocol}://${req.get("host")}/api/v1/users/resetPassword/${resetToken}`;
    await emailService.sendEmail({ email: user.email, subject: "Reset Link", message: resetURL });
  }
  res.status(200).json({ status: "success", message: "Instructions sent." });
});

exports.verifyResetCode = catchAsync(async (req, res, next) => {
  const { email, code } = req.body;
  const hashed = crypto.createHash("sha256").update(code).digest("hex");
  const user = await User.findOne({ email, verificationCode: hashed, verificationCodeExpires: { $gt: Date.now() } });
  if (!user) return next(new AppError("Invalid/expired code.", 400));
  const resetToken = jwt.sign({ id: user._id, intent: 'RESET_PASSWORD' }, process.env.JWT_SECRET, { expiresIn: "15m" });
  res.status(200).json({ status: "success", resetToken });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  let user;
  if (req.params.token) {
    const hashed = crypto.createHash("sha256").update(req.params.token).digest("hex");
    user = await User.findOne({ passwordResetToken: hashed, passwordResetExpires: { $gt: Date.now() } });
  } else if (req.body.resetToken) {
    const decoded = await promisify(jwt.verify)(req.body.resetToken, process.env.JWT_SECRET);
    if (decoded.intent !== 'RESET_PASSWORD') return next(new AppError("Invalid intent.", 403));
    user = await User.findById(decoded.id);
  }
  if (!user) return next(new AppError("Invalid/expired credentials.", 400));
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = user.verificationCode = undefined;
  await user.save();
  await createSendToken(user, 200, req, res);
});

// Social Handlers using centralized Verifiers
exports.googleAuth = catchAsync(async (req, res, next) => {
  const profile = await oauthVerifiers.verifyGoogle(req.body.idToken);
  await resolveOAuthUser("google", profile, req, res);
});

exports.githubAuth = catchAsync(async (req, res, next) => {
  const profile = await oauthVerifiers.verifyGitHub(req.body.code);
  await resolveOAuthUser("github", profile, req, res);
});

exports.facebookAuth = catchAsync(async (req, res, next) => {
  const profile = await oauthVerifiers.verifyFacebook(req.body.accessToken);
  await resolveOAuthUser("facebook", profile, req, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith("Bearer")) token = req.headers.authorization.split(" ")[1];
  else if (req.cookies.jwt) token = req.cookies.jwt;
  if (!token) return next(new AppError("Not logged in.", 401));
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);
  if (!user || user.changedPasswordAfter(decoded.iat)) return next(new AppError("Invalid session.", 401));
  req.user = user;
  next();
});

exports.protectOptional = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith("Bearer")) token = req.headers.authorization.split(" ")[1];
  else if (req.cookies.jwt) token = req.cookies.jwt;
  if (!token) return next();
  try {
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user && !user.changedPasswordAfter(decoded.iat)) req.user = user;
  } catch (err) { /* silent */ }
  next();
});

exports.restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return next(new AppError("Denied.", 403));
  next();
};
