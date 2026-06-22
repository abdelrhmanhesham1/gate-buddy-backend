const NavigationNode = require("../models/NavigationNode");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

/**
 * Dijkstra's algorithm for shortest path finding
 * @param {Array} nodes - Array of NavigationNode objects
 * @param {String} startId - Start node ID
 * @param {String} endId - End node ID
 * @returns {Array} - Array of node IDs representing the shortest path
 */
const dijkstra = (nodes, startId, endId) => {
  const distances = {};
  const previous = {};
  const unvisited = new Set();
  const nodeMap = {};

  // Initialize
  for (const node of nodes) {
    distances[node.nodeId] = Infinity;
    previous[node.nodeId] = null;
    unvisited.add(node.nodeId);
    nodeMap[node.nodeId] = node;
  }

  if (distances[startId] === undefined) return [];

  distances[startId] = 0;

  while (unvisited.size > 0) {
    // Find smallest unvisited
    let current = null;
    let minDistance = Infinity;

    for (const nodeId of unvisited) {
      if (distances[nodeId] < minDistance) {
        minDistance = distances[nodeId];
        current = nodeId;
      }
    }

    if (current === null) break;
    if (current === endId) break;

    unvisited.delete(current);

    const currentNode = nodeMap[current];
    if (currentNode && currentNode.connectedTo) {
      for (const neighbor of currentNode.connectedTo) {
        if (!unvisited.has(neighbor.nodeId)) continue;

        const newDist = distances[current] + neighbor.distanceMeters;
        if (newDist < distances[neighbor.nodeId]) {
          distances[neighbor.nodeId] = newDist;
          previous[neighbor.nodeId] = current;
        }
      }
    }
  }

  // Reconstruct path
  const path = [];
  let curr = endId;

  if (previous[curr] !== null || curr === startId) {
    while (curr !== null) {
      path.unshift(curr);
      curr = previous[curr];
    }
  }

  return path;
};

/**
 * Find shortest path between two navigation nodes
 * Uses Dijkstra's algorithm for pathfinding
 * @route POST /api/v1/navigation/find-path
 * @param {String} req.body.fromNodeId - Starting node ID
 * @param {String} req.body.toNodeId - Destination node ID
 * @returns {Object} - Path data with array of nodes and total count
 */
exports.findPath = catchAsync(async (req, res, next) => {
  const { fromNodeId, toNodeId } = req.body;

  if (!fromNodeId || !toNodeId) {
    return next(new AppError("fromNodeId and toNodeId are required", 400));
  }

  if (fromNodeId === toNodeId) {
    return next(new AppError("fromNodeId and toNodeId must be different", 400));
  }

  const nodes = await NavigationNode.find();
  if (nodes.length < 2) {
    return next(new AppError("Not enough nodes in navigation database", 500));
  }

  const pathIds = dijkstra(nodes, fromNodeId, toNodeId);

  if (!pathIds || pathIds.length === 0 || pathIds[0] !== fromNodeId) {
    return next(new AppError("No path found between the specified nodes", 404));
  }

  // Map path nodeIds to full node objects
  const nodeMap = {};
  for (const n of nodes) {
    nodeMap[n.nodeId] = n;
  }

  const path = pathIds.map((id) => nodeMap[id]);

  res.status(200).json({
    status: "success",
    data: {
      path,
      totalNodes: path.length,
      totalDistance: path.reduce((sum, node, i) => {
        if (i === 0) return 0;
        return sum + (path[i - 1].connectedTo?.find((c) => c.nodeId === node.nodeId)?.distanceMeters || 0);
      }, 0),
    },
  });
});

/**
 * Get all navigation nodes, optionally filtered by level
 * @route GET /api/v1/navigation/nodes
 * @query {Number} level - Optional floor level to filter nodes
 * @returns {Array} - Array of navigation nodes
 */
exports.getNodes = catchAsync(async (req, res, next) => {
  const { level } = req.query;

  const filter = level ? { level: Number(level) } : {};

  const nodes = await NavigationNode.find(filter).select(
    "nodeId name type level location connectedTo"
  );

  if (!nodes || nodes.length === 0) {
    return next(new AppError("No navigation nodes found", 404));
  }

  res.status(200).json({
    status: "success",
    results: nodes.length,
    data: nodes,
  });
});
