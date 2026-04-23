const NodeCache = require("node-cache");
const Flight = require("../models/flightModel");
const FlightTrack = require("../models/flightTrackModel");
const Service = require("../models/serviceModel");
const User = require("../models/userModel");
const Rating = require("../models/ratingModel");
const catchAsync = require("../utils/catchAsync");
const appConfig = require("../config/appConfig");

// Cache for 5 minutes
const homeCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

exports.getHomeData = catchAsync(async (req, res, next) => {
  const cacheKey = "dashboard_static_metrics";
  let cachedData = homeCache.get(cacheKey);

  if (!cachedData) {
    // 1. Calculate Average Rating from DB
    const stats = await Rating.aggregate([
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
        },
      },
    ]);
    const userRatingVal = stats.length > 0 ? stats[0].avgRating.toFixed(1) : "5.0";

    // 2. Fetch all other metrics
    const [
      updatedFlights,
      featuredServices,
      activeUsers,
      delayedCount,
      trackedCount
    ] = await Promise.all([
      Flight.find({ status: { $ne: "ON_TIME" } }).limit(4).lean(),
      Service.find({ rating: { $gte: 4 } }).limit(6).lean(),
      User.countDocuments({ active: { $ne: false } }),
      Flight.countDocuments({ status: "DELAYED" }),
      FlightTrack.countDocuments({ isActive: true })
    ]);

    cachedData = {
      updatedFlights,
      featuredServices,
      metrics: {
        activeUsers,
        flightsTracked: trackedCount,
        delays: delayedCount,
        airportsCovered: appConfig.airportSettings.airportsCovered,
        userRating: `${userRatingVal}/5`
      },
      categories: ["COUNTERS", "FINANCIAL", "VIP_SERVICES", "ACCESSIBILITY", "SHOPS", "RESTAURANTS"]
    };

    homeCache.set(cacheKey, cachedData);
  }

  let userTrack = null;
  if (req.user) {
    userTrack = await FlightTrack.findOne({ user: req.user.id, isActive: true })
      .populate("flight")
      .lean();
  }

  res.status(200).json({
    status: "success",
    data: {
      userTrack,
      ...cachedData
    }
  });
});
