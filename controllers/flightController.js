const Flight = require("../models/flightModel");
const FlightTrack = require("../models/flightTrackModel");
const Airport = require("../models/airportModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const APIFeatures = require("../utils/apiFeatures");
const { parse } = require("bcbp");

// Services
const weatherService = require("../utils/weatherService");
const aiService = require("../utils/recommendationService");

/**
 * INTERNAL HELPER: Robust BCBP Parser (Resolution 792)
 */
const parseBoardingPass = (data) => {
  try {
    const destinationCode = data.slice(33, 36).trim();
    const carrier = data.slice(36, 39).trim();
    const number = data.slice(39, 44).trim();
    const flightNumber = `${carrier}${number}`;

    const isValid = /^[A-Z0-9]{2,3}$/.test(carrier) && 
                    /^\d{1,4}$/.test(number) && 
                    /^[A-Z]{3}$/.test(destinationCode);
    
    if (isValid) return { flightNumber, destinationCode };

    const bcbpData = parse(data);
    const leg = bcbpData.legs[0];
    return {
      flightNumber: `${leg.operatingCarrierDesignator}${leg.flightNumber}`.trim(),
      destinationCode: leg.destinationAirportCode
    };
  } catch (err) {
    return null;
  }
};

// --- HANDLERS ---

exports.getUpdatedFlights = catchAsync(async (req, res, next) => {
  const flights = await Flight.find({ status: { $ne: "ON_TIME" } })
    .populate("updates")
    .sort("-updatedAt")
    .limit(30);
  res.status(200).json({ status: "success", data: { flights } });
});

exports.scanBoardingPass = catchAsync(async (req, res, next) => {
  const { barcodeData } = req.body;
  if (!barcodeData) return next(new AppError("Scan data missing.", 400));

  const parsed = parseBoardingPass(barcodeData);
  if (!parsed) return next(new AppError("Invalid boarding pass format.", 400));

  const flight = await Flight.findOne({ flightNumber: parsed.flightNumber });
  if (!flight) return next(new AppError("Flight not found.", 404));

  const [weather, recommendations] = await Promise.all([
    weatherService.getArrivalWeather(flight.route.to),
    aiService.getRecommendationsSafe(flight.route.toCode, req.user.id)
  ]);

  await FlightTrack.findOneAndUpdate(
    { user: req.user.id, flight: flight._id },
    { isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(200).json({
    status: "success",
    data: {
      flight,
      weather,
      recommendations,
      arrivalTime: weatherService.getArrivalTimeFormatted(flight.arrival.scheduledTime)
    }
  });
});

exports.getTrackedFlight = catchAsync(async (req, res, next) => {
  // Priority 1: User specified "findOne" without sort
  const track = await FlightTrack.findOne({ user: req.user.id, isActive: true }).populate("flight");

  if (!track) return next(new AppError("No active tracking.", 404));

  const flight = track.flight;
  const destinationCode = flight.route.toCode;

  // Execute external API calls and DB queries concurrently
  const [airport, weather, recommendations] = await Promise.all([
    Airport.findOne({ code: destinationCode }).catch(() => null),
    weatherService.getArrivalWeather(flight.route.to),
    aiService.getRecommendationsSafe(destinationCode, req.user.id)
  ]);

  res.status(200).json({
    status: "success",
    data: {
      flight,
      weather,
      recommendations,
      airport: airport || null,
      arrivalTime: weatherService.getArrivalTimeFormatted(flight.arrival.scheduledTime)
    }
  });
});

exports.cancelTrack = catchAsync(async (req, res, next) => {
  const track = await FlightTrack.findOneAndUpdate(
    { user: req.user.id, flight: req.params.id },
    { isActive: false },
    { new: true }
  );
  if (!track) return next(new AppError("Track entry not found.", 404));
  res.status(200).json({ status: "success", message: "Tracking stopped." });
});

exports.getAllFlights = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Flight.find(), req.query).filter().sort().limitFields().paginate();
  const flights = await features.query;
  res.status(200).json({ status: "success", results: flights.length, data: { flights } });
});

exports.getFlight = catchAsync(async (req, res, next) => {
  const flight = await Flight.findById(req.params.id).populate("updates");
  if (!flight) return next(new AppError("Not found.", 404));
  res.status(200).json({ status: "success", data: { flight } });
});

exports.createFlight = catchAsync(async (req, res, next) => {
  const flight = await Flight.create(req.body);
  res.status(201).json({ status: "success", data: { flight } });
});

exports.trackFlight = catchAsync(async (req, res, next) => {
  const flightId = req.params.id;
  const { reminderMinutes = 25 } = req.body;

  const flight = await Flight.findById(flightId);
  if (!flight) return next(new AppError("Flight not found.", 404));

  const track = await FlightTrack.findOneAndUpdate(
    { user: req.user.id, flight: flightId },
    { isActive: true, reminderMinutes },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(200).json({ status: "success", data: { track } });
});

exports.updateFlight = catchAsync(async (req, res, next) => {
  const flight = await Flight.findById(req.params.id);
  if (!flight) return next(new AppError("Not found.", 404));

  // Security: Nested-Aware Whitelist
  const allowedFields = {
    status: req.body.status,
    "departure.gate": req.body.departure?.gate,
    "departure.actualTime": req.body.departure?.actualTime,
    "departure.boardingTime": req.body.departure?.boardingTime,
    "departure.checkInCounter": req.body.departure?.checkInCounter,
    "arrival.actualTime": req.body.arrival?.actualTime,
    "arrival.gate": req.body.arrival?.gate,
  };

  Object.entries(allowedFields).forEach(([key, value]) => {
    if (value !== undefined) {
      const parts = key.split(".");
      if (parts.length === 2) {
        flight[parts[0]][parts[1]] = value;
      } else {
        flight[key] = value;
      }
    }
  });

  await flight.save();
  res.status(200).json({ status: "success", data: { flight } });
});

exports.deleteFlight = catchAsync(async (req, res, next) => {
  const flight = await Flight.findByIdAndDelete(req.params.id);
  if (!flight) return next(new AppError("Not found.", 404));
  res.status(204).json({ status: "success", data: null });
});
