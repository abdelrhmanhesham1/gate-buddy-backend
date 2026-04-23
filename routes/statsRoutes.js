const express = require("express");
const statsController = require("../controllers/statsController");
const authController = require("../controllers/authController");

const router = express.Router();

// Allow all users to see public stats, or restrict if needed. 
// For now, making it public as per current dashboard requirements.
router.get("/", statsController.getGlobalStats);

// Protected routes
router.use(authController.protect);
router.post("/rate", statsController.createRating);

module.exports = router;
