const express = require("express");
const homeController = require("../controllers/homeController");
const authController = require("../controllers/authController");

const router = express.Router();

// Publicly accessible for the Landing Page, but optionally retrieves User-specific track data
router.get("/", authController.protectOptional, homeController.getHomeData);

module.exports = router;
