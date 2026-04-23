const express = require("express");
const authController = require("../controllers/authController");
const userController = require("../controllers/userController");
const { validateSignup, validateLogin } = require("../middleware/validation");
const { loginLimiter, authLimiter, oauthSocialLimiter, forgotPasswordLimiter } = require("../middleware/rateLimiting");

const router = express.Router();

// --- 1. AUTHENTICATION ---
router.post("/signup", authLimiter, validateSignup, authController.signup);
router.post("/login", loginLimiter, validateLogin, authController.login);
router.post("/logout", authController.logout);

// OAuth
router.post("/google", oauthSocialLimiter, authController.googleAuth);
router.post("/github", oauthSocialLimiter, authController.githubAuth);
router.post("/facebook", oauthSocialLimiter, authController.facebookAuth);

// Hybrid Recovery
router.post("/forgotPassword", forgotPasswordLimiter, authController.forgotPassword);
router.post("/verifyResetCode", authController.verifyResetCode);
router.patch("/resetPassword", authController.resetPassword);
router.patch("/resetPassword/:token", authController.resetPassword);

// Rotation
router.post("/refresh", authController.refreshToken);

// --- 2. PROTECTED ---
router.use(authController.protect);

router.get("/me", userController.getMe, userController.getUser);
router.patch("/updateMe", userController.updateMe);
router.delete("/deleteMe", userController.deleteMe);

// --- 3. ADMIN ---
router.use(authController.restrictTo("admin"));

router.route("/")
  .get(userController.getAllUsers)
  .post(userController.createUser);

router.route("/:id")
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
