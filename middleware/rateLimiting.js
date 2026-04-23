const rateLimit = require("express-rate-limit");
const AppError = require("../utils/AppError");

// General auth rate limiter
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new AppError("Too many requests. Please try again later.", 429));
  },
});

// Strict limiter for forgot password
exports.forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: "Too many password reset requests, please try again after an hour",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Login limiter
exports.loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts
  message: "Too many login attempts, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for social oauth (prevent token exchange spam)
exports.oauthSocialLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 attempts per 5 mins
  message: "Too many social login attempts, please try again after 5 minutes",
  standardHeaders: true,
  legacyHeaders: false,
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
