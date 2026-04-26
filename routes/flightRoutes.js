const express = require("express");
const flightController = require("../controllers/flightController");
const authController = require("../controllers/authController");

const router = express.Router();

// --- 1. PUBLIC ---
// These are accessible to everyone (no login required)
router.get("/", flightController.getAllFlights);
router.get("/updated", flightController.getUpdatedFlights);

// --- 2. PROTECTED (USER) ---
// These require a valid JWT token
router.use(authController.protect);

router.get("/my-flight", flightController.getTrackedFlight);
router.get("/:id", flightController.getFlight);
router.post("/scan", flightController.scanBoardingPass);
router.post("/:id/track", flightController.trackFlight);
router.patch("/:id/cancel-track", flightController.cancelTrack);

// --- 3. ADMIN ONLY ---
// These require 'admin' role
router.use(authController.restrictTo("admin"));

router.post("/", flightController.createFlight);
router.patch("/:id", flightController.updateFlight);
router.delete("/:id", flightController.deleteFlight);

module.exports = router;
