const { GoogleGenerativeAI } = require("@google/generative-ai");
const Service = require("../models/serviceModel");
const Flight = require("../models/flightModel");
const FlightTrack = require("../models/flightTrackModel");
const NavigationNode = require("../models/NavigationNode");
const Faq = require("../models/faqModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const SYSTEM_PROMPT = `You are GateBuddy, the AI assistant for Amsterdam Airport Schiphol (AMS).
You help passengers with real-time flight info, gate locations, airport services, shops, restaurants, lounges, navigation, and general airport questions.

Rules:
- Be friendly, concise, and helpful. Max 120 words per reply.
- Always use information from the DB context provided — it is live and accurate.
- When mentioning services, include their zone/terminal and opening hours if known.
- If a user asks about their flight, use their tracked flight data.
- If you don't have specific data, give the best general Schiphol answer.
- Do not make up gate numbers, times, or service names not in the context.
- Respond in the same language the user writes in.`;

// ── Build rich context from DB ────────────────────────────────────────────────
async function buildContext(message, userId) {
  const msg = message.toLowerCase();
  const parts = [];

  // 1. User's tracked flight
  if (userId) {
    const track = await FlightTrack.findOne({ user: userId, isActive: true })
      .populate({
        path: "flight",
        select: "flightNumber status airline route departure arrival type",
      })
      .lean();

    if (track?.flight) {
      const f = track.flight;
      const dep = f.departure || {};
      const arr = f.arrival || {};
      parts.push(
        `USER'S TRACKED FLIGHT: ${f.flightNumber} | Status: ${f.status}` +
        (dep.scheduledTime ? ` | Scheduled: ${new Date(dep.scheduledTime).toUTCString()}` : "") +
        (dep.estimatedTime ? ` | Estimated: ${new Date(dep.estimatedTime).toUTCString()}` : "") +
        (dep.gate ? ` | Gate: ${dep.gate}` : "") +
        (dep.checkInCounter ? ` | Check-in: ${dep.checkInCounter}` : "") +
        (dep.boardingTime ? ` | Boarding: ${new Date(dep.boardingTime).toUTCString()}` : "") +
        (arr.airportCode ? ` | Destination: ${arr.airportCode}` : "") +
        (f.airline?.name ? ` | Airline: ${f.airline.name}` : "")
      );
    }
  }

  // 2. Flight lookup by flight number in message
  const flightNoMatch = message.match(/\b([A-Z]{2}\d{3,4}|[A-Z0-9]{2}\d{3,4})\b/i);
  if (flightNoMatch) {
    const flightNo = flightNoMatch[0].toUpperCase();
    const flight = await Flight.findOne({ flightNumber: flightNo })
      .select("flightNumber status airline route departure arrival")
      .lean();
    if (flight) {
      const dep = flight.departure || {};
      const arr = flight.arrival || {};
      parts.push(
        `FLIGHT ${flightNo}: Status=${flight.status}` +
        (dep.gate ? `, Gate=${dep.gate}` : "") +
        (dep.scheduledTime ? `, Scheduled=${new Date(dep.scheduledTime).toUTCString()}` : "") +
        (dep.estimatedTime ? `, Estimated=${new Date(dep.estimatedTime).toUTCString()}` : "") +
        (arr.airportCode ? `, Destination=${arr.airportCode}` : "")
      );
    }
  }

  // 3. Services — match by category keywords or general service query
  const categoryMap = {
    lounge: "VIP_SERVICES",
    vip: "VIP_SERVICES",
    "business class": "VIP_SERVICES",
    shop: "SHOPS",
    store: "SHOPS",
    "duty free": "SHOPS",
    book: "SHOPS",
    pharmacy: "SHOPS",
    eat: "RESTAURANTS",
    food: "RESTAURANTS",
    coffee: "RESTAURANTS",
    restaurant: "RESTAURANTS",
    café: "RESTAURANTS",
    cafe: "RESTAURANTS",
    bar: "RESTAURANTS",
    burger: "RESTAURANTS",
    pizza: "RESTAURANTS",
    atm: "FINANCIAL",
    bank: "FINANCIAL",
    currency: "FINANCIAL",
    exchange: "FINANCIAL",
    money: "FINANCIAL",
    "check-in": "COUNTERS",
    counter: "COUNTERS",
    baggage: "COUNTERS",
    wheelchair: "ACCESSIBILITY",
    accessible: "ACCESSIBILITY",
    prayer: "ACCESSIBILITY",
    baby: "ACCESSIBILITY",
    medical: "ACCESSIBILITY",
    lost: "ACCESSIBILITY",
  };

  let serviceCategory = null;
  for (const [keyword, cat] of Object.entries(categoryMap)) {
    if (msg.includes(keyword)) { serviceCategory = cat; break; }
  }

  // Text search for specific service names
  let serviceFilter = { status: "Open" };
  if (serviceCategory) serviceFilter.category = serviceCategory;

  // If message mentions a brand name, text search
  const brandMatch = message.match(/starbucks|burger king|kfc|mcdonald|heinemann|rituals|kl[mn]|la place|pret|caffe|lavazza|relay|paul |lagardere/i);
  let services = [];
  if (brandMatch) {
    services = await Service.find(
      { $text: { $search: brandMatch[0] }, status: "Open" },
      { score: { $meta: "textScore" } }
    ).sort({ score: { $meta: "textScore" } }).limit(5).lean();
  }

  if (services.length === 0 && (serviceCategory || msg.includes("service") || msg.includes("where") || msg.includes("find"))) {
    services = await Service.find(serviceFilter)
      .select("name category subCategory zone terminal operatingHours description amenities")
      .limit(6)
      .lean();
  }

  if (services.length > 0) {
    const svcLines = services.map(s =>
      `• ${s.name} [${s.category}]` +
      (s.zone ? ` — ${s.zone}` : "") +
      (s.terminal ? `, ${s.terminal}` : "") +
      (s.operatingHours ? ` (${s.operatingHours})` : "") +
      (s.description ? ` | ${s.description.slice(0, 80)}` : "")
    );
    parts.push("AVAILABLE SERVICES:\n" + svcLines.join("\n"));
  }

  // 4. Navigation nodes for gate/location queries
  if (msg.includes("gate") || msg.includes("navigate") || msg.includes("how do i get") || msg.includes("where is") || msg.includes("how to get")) {
    const nodes = await NavigationNode.find()
      .select("nodeId name type level zone")
      .limit(30)
      .lean();
    if (nodes.length > 0) {
      const nodeLines = nodes.map(n => `${n.nodeId}: ${n.name} (Level ${n.level}, ${n.zone || n.type})`);
      parts.push("NAVIGATION NODES:\n" + nodeLines.join("\n"));
    }
  }

  // 5. Relevant FAQs
  const faqKeywords = ["wifi", "prayer", "lost", "luggage", "medical", "navigate", "track", "lounge", "currency", "train", "bus", "taxi"];
  if (faqKeywords.some(k => msg.includes(k))) {
    const faqs = await Faq.find().select("question answer").lean();
    if (faqs.length) {
      const faqLines = faqs.map(f => `Q: ${f.question}\nA: ${f.answer}`);
      parts.push("AIRPORT FAQs:\n" + faqLines.join("\n\n"));
    }
  }

  // 6. Live flight summary if asking about delays/status
  if (msg.includes("delay") || msg.includes("cancel") || msg.includes("flight status") || msg.includes("departures") || msg.includes("arrivals")) {
    const [delayed, cancelled, onTime] = await Promise.all([
      Flight.countDocuments({ status: "DELAYED" }),
      Flight.countDocuments({ status: "CANCELLED" }),
      Flight.countDocuments({ status: "ON_TIME" }),
    ]);
    parts.push(`LIVE AIRPORT STATUS: On-time flights: ${onTime} | Delayed: ${delayed} | Cancelled: ${cancelled}`);
  }

  return parts.join("\n\n");
}

exports.chat_with_gemini = catchAsync(async (req, res, next) => {
  const { message, history = [] } = req.body;
  if (!message || !message.trim()) return next(new AppError("Message is required.", 400));

  const dbContext = await buildContext(message, req.user?.id);

  const contextBlock = dbContext
    ? `\n\n=== LIVE SCHIPHOL DATABASE CONTEXT ===\n${dbContext}\n=== END CONTEXT ===`
    : "";

  // Build chat history for multi-turn
  const chatHistory = history
    .slice(-8) // keep last 4 exchanges
    .filter(h => h.role && h.text)
    .map(h => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.text }],
    }));

  const chat = model.startChat({
    history: chatHistory,
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT + contextBlock }] },
    generationConfig: { maxOutputTokens: 300, temperature: 0.4 },
  });

  const result = await chat.sendMessage(message);
  const reply = result.response.text().trim();

  res.status(200).json({ status: "success", data: { reply } });
});
