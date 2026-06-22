const rateLimit = require("express-rate-limit");
const AppError = require("../utils/AppError");

// Skip rate limiting in test environment
const skipInTest = (req, res) => process.env.NODE_ENV === "test";

// General auth rate limiter
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Increased for test environment
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  trustProxy: false, // Disable trust proxy validation for tests
  handler: (req, res, next) => {
    next(new AppError("Too many requests. Please try again later.", 429));
  },
});

// Strict limiter for forgot password
exports.forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  message: "Too many password reset requests, please try again after an hour",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: skipInTest,
  trustProxy: false,
});

// Login limiter
exports.loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many login attempts, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  trustProxy: false,
});

// Stricter limiter for social oauth (prevent token exchange spam)
exports.oauthSocialLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100,
  message: "Too many social login attempts, please try again after 5 minutes",
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  trustProxy: false,
  handler: (req, res, next) => {
    next(new AppError("OAuth rate limit exceeded. Please try again later.", 429));
  },
});

// Search limiter
exports.searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 searches per min
  message: "Search limit exceeded. Please try again after 1 minute",
});

// Recommendation service limiter
exports.recommendationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 reqs per 15 mins
  message: "Too many recommendation requests. Please wait.",
});
