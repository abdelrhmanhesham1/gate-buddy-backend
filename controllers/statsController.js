const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const Flight = require("../models/flightModel");
const FlightTrack = require("../models/flightTrackModel");
const Service = require("../models/serviceModel");
const User = require("../models/userModel");
const Rating = require("../models/ratingModel");
const appConfig = require("../config/appConfig");

exports.getGlobalStats = catchAsync(async (req, res, next) => {
  const [
    activeUsers,
    flightsTracked,
    delays,
    avgRatingData
  ] = await Promise.all([
    User.countDocuments({ active: { $ne: false } }),
    FlightTrack.countDocuments({ isActive: true }),
    Flight.countDocuments({ status: "DELAYED" }),
    Rating.aggregate([
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" }
        }
      }
    ])
  ]);

  res.status(200).json({
    status: "success",
    data: {
      metrics: {
        activeUsers,
        flightsTracked,
        delays,
        airportsCovered: appConfig.airportSettings.airportsCovered,
        userRating: avgRatingData.length > 0 ? `${avgRatingData[0].avgRating.toFixed(1)}/5` : "4.5/5"
      }
    }
  });
});

exports.createRating = catchAsync(async (req, res, next) => {
  const { rating, review } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    return next(new AppError("Rating must be between 1 and 5.", 400));
  }

  const newRating = await Rating.findOneAndUpdate(
    { user: req.user.id },
    { rating, review, user: req.user.id },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(201).json({ status: "success", data: { rating: newRating } });
});
