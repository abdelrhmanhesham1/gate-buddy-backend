const express = require("express");
const deviceController = require("../controllers/deviceController");
const authController = require("../controllers/authController");

const router = express.Router();

router.use(authController.protect);
router.post("/register", deviceController.registerDevice);
router.post("/unregister", deviceController.deleteDevice);

module.exports = router;
