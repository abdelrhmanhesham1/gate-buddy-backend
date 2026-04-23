const Service = require("../models/serviceModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const APIFeatures = require("../utils/apiFeatures");

exports.getAllServices = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Service.find(), req.query).filter().sort().limitFields().paginate();
  const services = await features.query;
  res.status(200).json({ status: "success", results: services.length, data: { services } });
});

exports.searchServices = catchAsync(async (req, res, next) => {
  const { q } = req.query;
  const services = await Service.find(
    { $text: { $search: q } },
    { score: { $meta: "textScore" } }
  ).sort({ score: { $meta: "textScore" } });

  res.status(200).json({ status: "success", data: { services } });
});

exports.getNearbyServices = catchAsync(async (req, res, next) => {
  const { lng, lat, distance = 500 } = req.query;
  if (!lng || !lat) return next(new AppError("Longitude and Latitude are required.", 400));

  const services = await Service.find({
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
        $maxDistance: parseInt(distance),
      },
    }
  });

  res.status(200).json({ status: "success", data: { services } });
});

exports.getCounterStats = catchAsync(async (req, res, next) => {
  const stats = await Service.aggregate([
    { $match: { category: "COUNTERS" } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $eq: ["$status", "Open"] }, 1, 0] } },
        closed: { $sum: { $cond: [{ $eq: ["$status", "Closed"] }, 1, 0] } },
      }
    }
  ]);

  res.status(200).json({ status: "success", data: stats[0] || { total: 0, open: 0, closed: 0 } });
});

exports.getService = catchAsync(async (req, res, next) => {
  const service = await Service.findById(req.params.id);
  if (!service) return next(new AppError("Service not found.", 404));
  res.status(200).json({ status: "success", data: { service } });
});

exports.createService = catchAsync(async (req, res, next) => {
  const service = await Service.create(req.body);
  res.status(201).json({ status: "success", data: { service } });
});

exports.updateService = catchAsync(async (req, res, next) => {
  const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!service) return next(new AppError("Service not found.", 404));
  res.status(200).json({ status: "success", data: { service } });
});

exports.deleteService = catchAsync(async (req, res, next) => {
  const service = await Service.findByIdAndDelete(req.params.id);
  if (!service) return next(new AppError("Service not found.", 404));
  res.status(204).json({ status: "success", data: null });
});
