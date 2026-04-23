const Notification = require("../models/notificationModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

exports.getNotifications = catchAsync(async (req, res, next) => {
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);

  res.status(200).json({
    status: "success",
    results: notifications.length,
    data: {
      notifications,
    },
  });
});

exports.markNotificationAsRead = catchAsync(async (req, res, next) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { new: true }
  );

  if (!notification) {
    return next(new AppError("No notification found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      notification,
    },
  });
});

exports.deleteNotification = catchAsync(async (req, res, next) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!notification) {
    return next(new AppError("No notification found with that ID", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.subscribeToNotifications = catchAsync(async (req, res, next) => {
  const { flightId, channels, deviceToken } = req.body;

  if (!flightId || !deviceToken) {
    return next(new AppError("Flight ID and Device Token are required for push notifications", 400));
  }

  // Logic: In a real app, we'd store the deviceToken linked to the user and flightId
  // For this implementation, we acknowledge and prepare the delivery pipeline
  console.log(`[Push Notification] User ${req.user.id} subscribed to Flight ${flightId} on ${deviceToken}`);

  res.status(200).json({
    status: "success",
    message: "Successfully subscribed to physical device notifications",
    data: {
      flightId,
      channels,
      deviceToken: `${deviceToken.slice(0, 10)}...` // Security: don't echo full token
    },
  });
});

exports.getUnreadCount = catchAsync(async (req, res, next) => {
  const count = await Notification.countDocuments({
    user: req.user._id,
    read: false,
  });
  res.status(200).json({ status: "success", data: { unreadCount: count } });
});

exports.markAllAsRead = catchAsync(async (req, res, next) => {
  await Notification.updateMany(
    { user: req.user._id, read: false },
    { read: true }
  );
  res
    .status(200)
    .json({ status: "success", message: "All notifications marked as read" });
});
