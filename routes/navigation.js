const express = require("express");
const navigationController = require("../controllers/navigationController");

const router = express.Router();

// Find shortest path between two nodes using Dijkstra's algorithm
router.post("/find-path", navigationController.findPath);

// Get all navigation nodes (optionally filtered by level)
router.get("/nodes", navigationController.getNodes);

module.exports = router;
