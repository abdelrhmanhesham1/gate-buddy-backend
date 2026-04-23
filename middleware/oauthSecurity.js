const crypto = require("crypto");
const AppError = require("../utils/AppError");

/**
 * CSRF Protection (State Verification)
 * 1. Generates a random state and stores it in session
 * 2. Client passes this state to provider
 * 3. Provider returns it, we verify against session
 */
exports.generateOAuthState = (req, res, next) => {
  const state = crypto.randomBytes(16).toString("hex");
  req.session = req.session || {}; // Fallback if session middleware isn't fully set up
  req.session.oauthState = state;
  res.locals.oauthState = state;
  next();
};

exports.verifyOAuthState = (req, res, next) => {
  const { state } = req.body;
  const savedState = req.session?.oauthState;

  if (!state || state !== savedState) {
    return next(new AppError("OAuth State Validation Failed (CSRF Detected)", 403));
  }

  // Clear state after use
  delete req.session.oauthState;
  next();
};

/**
 * OIDC Nonce Validation (Replay Protection)
 */
exports.generateNonce = (req, res, next) => {
  const nonce = crypto.randomBytes(16).toString("hex");
  req.session = req.session || {};
  req.session.oauthNonce = nonce;
  res.locals.oauthNonce = nonce;
  next();
};

exports.verifyNonce = (nonce, savedNonce) => {
  if (!nonce || nonce !== savedNonce) {
    throw new AppError("OIDC Nonce Validation Failed (Replay Attack Detected)", 403);
  }
};
