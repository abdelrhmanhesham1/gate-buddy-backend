const express = require('express');
const NavigationNode = require('../models/NavigationNode');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

const router = express.Router();

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

router.post('/find-path', catchAsync(async (req, res, next) => {
  const { fromNodeId, toNodeId } = req.body;

  if (!fromNodeId || !toNodeId) {
    return next(new AppError("fromNodeId and toNodeId are required", 400));
  }

  const nodes = await NavigationNode.find();
  if (nodes.length < 2) {
    return next(new AppError("Not enough nodes to calculate path", 500));
  }

  const pathIds = dijkstra(nodes, fromNodeId, toNodeId);

  if (!pathIds || pathIds.length === 0 || pathIds[0] !== fromNodeId) {
    return next(new AppError("No path found", 404));
  }

  // Map path nodeIds to full node objects
  const nodeMap = {};
  for (const n of nodes) {
    nodeMap[n.nodeId] = n;
  }

  const path = pathIds.map(id => nodeMap[id]);

  res.status(200).json({
    status: "success",
    data: {
      path,
      totalNodes: path.length
    }
  });
}));

router.get('/nodes', catchAsync(async (req, res, next) => {
  const { level } = req.query;

  const nodes = await NavigationNode.find(
    level ? { level: Number(level) } : {}
  ).select(
    "nodeId name type level location connectedTo"
  );

  res.status(200).json({
    status: "success",
    results: nodes.length,
    data: nodes,
  });
}));

module.exports = router;
