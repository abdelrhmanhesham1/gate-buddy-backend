const Device = require("../models/deviceModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

exports.registerDevice = catchAsync(async (req, res, next) => {
  const { deviceToken, deviceType } = req.body;
  if (!deviceToken) return next(new AppError("FCM token is required.", 400));
  if (!deviceType) return next(new AppError("Device type is required.", 400));

  // findOneAndUpdate with upsert can race on unique index — use replaceOne with upsert instead
  await Device.replaceOne(
    { fcmToken: deviceToken },
    { fcmToken: deviceToken, platform: deviceType, user: req.user.id, lastUsed: new Date() },
    { upsert: true }
  );
  const device = await Device.findOne({ fcmToken: deviceToken });

  res.status(201).json({ status: "success", data: { device } });
});

exports.deleteDevice = catchAsync(async (req, res, next) => {
  const { deviceToken } = req.body;
  await Device.findOneAndDelete({ fcmToken: deviceToken, user: req.user.id });
  res.status(204).json({ status: "success", data: null });
});
