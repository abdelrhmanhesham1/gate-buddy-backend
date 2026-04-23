const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

router.use(authController.protect);
router.use(authController.restrictTo("admin"));

const analyticsController = require("../controllers/analyticsController");
// router.get("/dashboard", analyticsController.getDashboardStats); // moved to analytics

module.exports = router;
