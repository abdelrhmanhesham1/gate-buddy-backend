const Device = require("../models/deviceModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

exports.registerDevice = catchAsync(async (req, res, next) => {
  const { deviceToken, deviceType } = req.body;
  if (!deviceToken || !deviceType) return next(new AppError("Token and type required", 400));

  const device = await Device.findOneAndUpdate(
    { fcmToken: deviceToken },
    { fcmToken: deviceToken, platform: deviceType, user: req.user.id, lastUsed: Date.now() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(200).json({ status: "success", data: { device } });
});

exports.deleteDevice = catchAsync(async (req, res, next) => {
  const { deviceToken } = req.body;
  await Device.findOneAndDelete({ fcmToken: deviceToken, user: req.user.id });
  res.status(204).json({ status: "success", data: null });
});
