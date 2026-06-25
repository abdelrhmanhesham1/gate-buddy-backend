/**
 * Deep-test chatbot quality and recommendation service
 * node scripts/testChatAndRec.js
 */
const https = require("https");
const http = require("http");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../variables.env") });

const PROD = "https://gate-buddy-backend-production-f6df.up.railway.app/api/v1";
const REC_URL = process.env.AI_REC_URL || "http://localhost:8000";
let TOKEN = "";

function req(method, url, body, token) {
  return new Promise((resolve) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (payload) headers["Content-Length"] = Buffer.byteLength(payload);
    const full = url.startsWith("http") ? url : PROD + url;
    const parsed = new URL(full);
    const transport = parsed.protocol === "https:" ? https : http;
    const options = { hostname: parsed.hostname, port: parsed.port || (parsed.protocol === "https:" ? 443 : 80), path: parsed.pathname + parsed.search, method, headers };
    const r = transport.request(options, (res) => {
      let data = ""; res.on("data", c => data += c);
      res.on("end", () => { try { resolve({ status: res.statusCode, body: JSON.parse(data) }); } catch { resolve({ status: res.statusCode, body: { raw: data.slice(0, 500) } }); } });
    });
    r.on("error", e => resolve({ status: 0, body: { error: e.message } }));
    if (payload) r.write(payload);
    r.end();
  });
}

async function login() {
  const email = `chattest_${Date.now()}@test.com`;
  await req("POST", "/users/signup", { name: "Chat Tester", email, password: "Pass@1234", passwordConfirm: "Pass@1234" });
  const r = await req("POST", "/users/login", { email, password: "Pass@1234" });
  TOKEN = r.body.token || r.body.data?.accessToken;
  console.log(`\n✅ Logged in as ${email}\n`);
}

async function testChat() {
  const questions = [
    "Where is Starbucks in Schiphol airport?",
    "What lounges are available for business class passengers?",
    "Is there a prayer room at Schiphol and where is it?",
    "Is there free WiFi at Schiphol airport?",
    "Where can I exchange currency?",
    "What restaurants are open past 10pm?",
    "My flight is KL 0601 — what is the current status?",
    "Where can I find a pharmacy or medical centre?",
    "How do I get from Departure Hall 2 to the E Pier gates?",
    "Are there any delays at the airport today?",
  ];

  console.log("═══════════════════════════════════════════════════");
  console.log("  CHATBOT QUALITY TEST — Production");
  console.log("═══════════════════════════════════════════════════\n");

  let history = [];
  for (const q of questions) {
    const r = await req("POST", "/chat/query", { message: q, history }, TOKEN);
    const reply = r.body.data?.reply;
    const ok = r.status === 200 && reply && reply.length > 10;
    console.log(`Q: ${q}`);
    console.log(`A: ${reply || JSON.stringify(r.body).slice(0, 200)}`);
    console.log(`${ok ? "✅" : "❌"} [${r.status}] ${reply?.split(" ").length || 0} words\n`);
    // Add to history for multi-turn
    if (reply) {
      history.push({ role: "user", text: q });
      history.push({ role: "assistant", text: reply });
    }
  }
}

async function testRecommendation() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  RECOMMENDATION SERVICE TEST");
  console.log("═══════════════════════════════════════════════════\n");

  // Test via the local Python service
  const r = await req("POST", REC_URL + "/recommend", { airportCode: "AMS", limit: 6 });
  console.log(`Status: ${r.status}`);

  if (r.status === 200) {
    const { cityName, country, places } = r.body;
    console.log(`City: ${cityName}, ${country}`);
    console.log(`Places returned: ${places?.length || 0}\n`);
    for (const p of (places || [])) {
      const hasImage = p.image && p.image.startsWith("http");
      const imgStatus = hasImage ? "✅ IMG" : "❌ NO_IMG";
      console.log(`  ${imgStatus} ${p.name} [${p.category}]`);
      console.log(`         ${p.description?.slice(0, 80) || "(no description)"}`);
      console.log(`         Image source: ${p.imageCredit || "none"} | ${p.image?.slice(0, 60) || "N/A"}`);
    }
  } else {
    console.log(`⚠️  Recommendation service not reachable at ${REC_URL}`);
    console.log(`   Body: ${JSON.stringify(r.body).slice(0, 200)}`);
    console.log(`\n   To start locally: cd recommendation-service && python app.py`);
    console.log(`   Then the Node backend calls it via AI_REC_URL=${REC_URL}`);
    console.log(`\n   On Railway: add it as a second service in the same project.`);
  }
}

async function testServicePhotos() {
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  SERVICE PHOTOS CHECK — Production API");
  console.log("═══════════════════════════════════════════════════\n");

  const r = await req("GET", "/services?limit=100", null, TOKEN);
  const services = r.body.data?.services || r.body.data?.data || [];
  console.log(`Total services from API: ${services.length}`);

  const noPhoto = services.filter(s => !s.images?.length);
  const withPhoto = services.filter(s => s.images?.length > 0);
  console.log(`With photos: ${withPhoto.length}`);
  console.log(`Without photos: ${noPhoto.length}`);

  if (noPhoto.length) {
    console.log("\nMissing photos:");
    noPhoto.forEach(s => console.log(`  ❌ [${s.category}] ${s.name}`));
  }

  // Show photo URL sample per category
  const seen = new Set();
  console.log("\nSample photo per category:");
  for (const s of withPhoto) {
    if (!seen.has(s.category)) {
      seen.add(s.category);
      const img = s.images[0];
      const url = typeof img === "string" ? img : img?.url || img?.src || "";
      console.log(`  ${s.category}: ${url.slice(0, 90)}`);
    }
  }
}

(async () => {
  await login();
  await testChat();
  await testServicePhotos();
  await testRecommendation();
})().catch(console.error);
