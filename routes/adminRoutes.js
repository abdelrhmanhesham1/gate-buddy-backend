const express = require("express");
const authController = require("../controllers/authController");
const analyticsController = require("../controllers/analyticsController");

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authController.protect);
router.use(authController.restrictTo("admin"));

// Admin Analytics
router.get("/dashboard", analyticsController.getDashboardStats);

module.exports = router;
