const express = require("express");
const flightController = require("../controllers/flightController");
const authController = require("../controllers/authController");

const router = express.Router();

// --- 1. PUBLIC ---
router.get("/updated", flightController.getUpdatedFlights);
router.get("/:id", flightController.getFlight); // NOW PUBLIC

// --- 2. PROTECTED ---
router.use(authController.protect);

router.post("/scan", flightController.scanBoardingPass);
router.get("/my-flight", flightController.getTrackedFlight);
router.post("/:id/track", flightController.trackFlight);
router.patch("/:id/cancel-track", flightController.cancelTrack);

// --- 3. ADMIN ---
router.use(authController.restrictTo("admin"));

router.route("/")
  .get(flightController.getAllFlights)
  .post(flightController.createFlight);

router.route("/:id")
  .patch(flightController.updateFlight)
  .delete(flightController.deleteFlight);

module.exports = router;
