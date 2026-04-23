const { GoogleGenerativeAI } = require("@google/generative-ai");
const Service = require("../models/serviceModel");
const Flight = require("../models/flightModel");
const NavigationNode = require("../models/NavigationNode");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const getLocalContext = async (input) => {
  let context = "";
  const flightNo = input.match(/[a-z]{2}\d{3,4}/i)?.[0]?.toUpperCase();
  if (flightNo) {
    const flight = await Flight.findOne({ flightNumber: flightNo });
    if (flight) context += ` Flight ${flightNo} is ${flight.status}. Gate: ${flight.departure?.gate || "TBD"}.`;
  }
  
  if (input.includes("gate") || input.includes("navigate") || input.includes("how do I get")) {
    const gateMatch = input.match(/gate\s*([a-z0-9]+)/i);
    if (gateMatch) {
      const gateName = gateMatch[1].toUpperCase();
      const node = await NavigationNode.findOne({ name: new RegExp(gateMatch[1], "i") });
      if (node) {
        context += ` Gate ${gateName} is located on level ${node.level}. You can tap 'Locate on Map' to see step-by-step routing.`;
      } else {
        context += ` Gate ${gateName} coordinates are loaded in the system map.`;
      }
    }
  }

  if (input.includes("shop") || input.includes("eat") || input.includes("food")) {
    const services = await Service.find({ category: { $in: ["SHOPS", "RESTAURANTS"] }, status: "Open" }).limit(3); 
    if (services.length > 0) context += ` Recommended: ${services.map(s => s.name).join(", ")}.`;
  }
  return context;
};

exports.chat_with_gemini = catchAsync(async (req, res, next) => {
  const { message } = req.body;
  if (!message) return next(new AppError("Message is required", 400));

  const localContext = await getLocalContext(message);
  const prompt = `You are GateBuddy AI (Schiphol Airport). Context: ${localContext}. Question: ${message}. Keep it under 50 words.`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  res.status(200).json({ status: "success", data: { response } });
});
