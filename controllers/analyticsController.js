const Flight = require("../models/flightModel");
const User = require("../models/userModel");
const Notification = require("../models/notificationModel");
const Rating = require("../models/ratingModel");
const catchAsync = require("../utils/catchAsync");

/**
 * Admin Dashboard Statistics
 * Returns comprehensive system metrics
 */
exports.getDashboardStats = catchAsync(async (req, res, next) => {
  const [userCount, flightCount, activeNotifications, avgRating] = await Promise.all([
    User.countDocuments(),
    Flight.countDocuments(),
    Notification.countDocuments({ read: false }),
    Rating.aggregate([{ $group: { _id: null, avg: { $avg: "$rating" } } }]),
  ]);

  res.status(200).json({
    status: "success",
    data: {
      metrics: {
        totalUsers: userCount,
        totalFlights: flightCount,
        unreadNotifications: activeNotifications,
        averageRating: avgRating[0]?.avg || 0,
        timestamp: new Date().toISOString(),
      },
    },
  });
});
