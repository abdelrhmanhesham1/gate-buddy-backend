/**
 * End-to-end endpoint audit for GateBuddy API
 * Run: node scripts/auditEndpoints.js [local|prod]
 *   local → http://localhost:3001/api/v1
 *   prod  → https://gate-buddy-backend-production-f6df.up.railway.app/api/v1
 */
const https = require("https");
const http = require("http");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../variables.env") });

const ENV = process.argv[2] || "prod";
const BASE =
  ENV === "local"
    ? "http://localhost:3001/api/v1"
    : "https://gate-buddy-backend-production-f6df.up.railway.app/api/v1";

console.log(`\nTarget: ${BASE}\n`);

let TOKEN = "";
let FLIGHT_ID = "";
let SERVICE_ID = "";

const results = [];

function req(method, url, body, token) {
  return new Promise((resolve) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (payload) headers["Content-Length"] = Buffer.byteLength(payload);

    const fullUrl = BASE + url;
    const parsed = new URL(fullUrl);
    const transport = parsed.protocol === "https:" ? https : http;
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers,
    };

    const r = transport.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        let json;
        try { json = JSON.parse(data); } catch { json = { raw: data.slice(0, 200) }; }
        resolve({ status: res.statusCode, body: json });
      });
    });
    r.on("error", (e) => resolve({ status: 0, body: { error: e.message } }));
    if (payload) r.write(payload);
    r.end();
  });
}

function check(name, res, expectedStatus, validator) {
  const statusOk = res.status === expectedStatus;
  const validOk = !validator || validator(res.body);
  const ok = statusOk && validOk;
  console.log(`${ok ? "✅" : "❌"} [${res.status}] ${name}`);
  if (!ok) {
    if (!statusOk) console.log(`     Expected HTTP ${expectedStatus}, got ${res.status}`);
    if (!validOk) console.log(`     Validator failed. Body: ${JSON.stringify(res.body).slice(0, 300)}`);
  }
  results.push({ name, ok, status: res.status });
  return ok;
}

async function run() {
  console.log("══════════════════════════════════════════════════");
  console.log("  GateBuddy API Audit — " + new Date().toISOString());
  console.log("══════════════════════════════════════════════════");

  // ── AUTH ─────────────────────────────────────────────────────────────────
  console.log("\n── AUTH ──────────────────────────────────────────");

  const email = `audit_${Date.now()}@test.com`;

  let r = await req("POST", "/users/signup", { name: "Audit Bot", email, password: "Pass@1234", passwordConfirm: "Pass@1234" });
  check("POST /users/signup → 201", r, 201, b => b.status === "success");
  TOKEN = r.body.token || r.body.data?.accessToken || TOKEN;

  r = await req("POST", "/users/login", { email, password: "Pass@1234" });
  check("POST /users/login → 200", r, 200, b => b.status === "success");
  TOKEN = r.body.token || r.body.data?.accessToken || TOKEN;

  r = await req("POST", "/users/login", { email, password: "badpass" });
  check("POST /users/login (wrong pw) → 401", r, 401);

  r = await req("GET", "/users/me", null, TOKEN);
  check("GET /users/me → 200", r, 200, b => !!b.data);

  r = await req("PATCH", "/users/updateMe", { name: "Audit Updated" }, TOKEN);
  check("PATCH /users/updateMe → 200", r, 200, b => b.status === "success");

  // Email should not be changeable
  r = await req("PATCH", "/users/updateMe", { email: "hacker@evil.com", name: "X" }, TOKEN);
  const userData = r.body.data?.data || r.body.data?.user || {};
  const emailBlocked = r.status === 200 && userData.email !== "hacker@evil.com";
  console.log(`${emailBlocked ? "✅" : "❌"} [${r.status}] PATCH /users/updateMe (email not changeable)`);
  results.push({ name: "updateMe email blocked", ok: emailBlocked, status: r.status });

  r = await req("PATCH", "/users/updateMyPassword", { passwordCurrent: "Pass@1234", password: "NewPass@5678", passwordConfirm: "NewPass@5678" }, TOKEN);
  check("PATCH /users/updateMyPassword → 200", r, 200, b => b.status === "success");
  TOKEN = r.body.token || r.body.data?.accessToken || TOKEN;

  r = await req("POST", "/users/login", { email, password: "NewPass@5678" });
  check("POST /users/login (new password) → 200", r, 200, b => b.status === "success");
  TOKEN = r.body.token || r.body.data?.accessToken || TOKEN;

  r = await req("POST", "/users/forgotPassword", { email });
  check("POST /users/forgotPassword → 200", r, 200, b => b.status === "success");

  r = await req("POST", "/users/logout", null, TOKEN);
  check("POST /users/logout → 200", r, 200, b => b.status === "success");

  r = await req("GET", "/users/me", null, TOKEN);
  check("GET /users/me (header token valid after cookie logout) → 200", r, 200);

  r = await req("GET", "/users/me", null, null);
  check("GET /users/me (no token) → 401", r, 401);

  // ── FLIGHTS ──────────────────────────────────────────────────────────────
  console.log("\n── FLIGHTS ───────────────────────────────────────");

  r = await req("GET", "/flights", null, TOKEN);
  check("GET /flights → 200", r, 200, b => Array.isArray(b.data?.flights));
  if (r.body.data?.flights?.length) FLIGHT_ID = r.body.data.flights[0]._id;

  r = await req("GET", "/flights?direction=departure", null, TOKEN);
  check("GET /flights?direction=departure → 200", r, 200, b => Array.isArray(b.data?.flights));

  r = await req("GET", "/flights?direction=arrival", null, TOKEN);
  check("GET /flights?direction=arrival → 200", r, 200);

  r = await req("GET", "/flights?status=DELAYED", null, TOKEN);
  check("GET /flights?status=DELAYED → 200", r, 200);

  r = await req("GET", "/flights/updated", null, TOKEN);
  check("GET /flights/updated → 200", r, 200);

  if (FLIGHT_ID) {
    r = await req("GET", `/flights/${FLIGHT_ID}`, null, TOKEN);
    check("GET /flights/:id → 200", r, 200, b => !!b.data?.flight);

    r = await req("GET", `/flights/${FLIGHT_ID}/updates`, null, TOKEN);
    check("GET /flights/:id/updates → 200", r, 200, b => Array.isArray(b.data?.updates));

    r = await req("POST", `/flights/${FLIGHT_ID}/track`, { reminderMinutes: 30 }, TOKEN);
    check("POST /flights/:id/track → 201", r, 201, b => b.status === "success");
  }

  r = await req("GET", "/flights/my-flight", null, TOKEN);
  check("GET /flights/my-flight → 200", r, 200);

  if (FLIGHT_ID) {
    r = await req("PATCH", `/flights/${FLIGHT_ID}/cancel-track`, null, TOKEN);
    check("PATCH /flights/:id/cancel-track → 200", r, 200);
  }

  // ── SERVICES ─────────────────────────────────────────────────────────────
  console.log("\n── SERVICES ──────────────────────────────────────");

  r = await req("GET", "/services", null, TOKEN);
  check("GET /services → 200 with results", r, 200, b => (b.results || 0) > 0);
  const svcArr = r.body.data?.services || r.body.data?.data;
  if (Array.isArray(svcArr) && svcArr.length) SERVICE_ID = svcArr[0]._id;

  for (const cat of ["SHOPS", "RESTAURANTS", "ACCESSIBILITY", "COUNTERS", "FINANCIAL", "VIP_SERVICES"]) {
    r = await req("GET", `/services?category=${cat}`, null, TOKEN);
    check(`GET /services?category=${cat} → results > 0`, r, 200, b => (b.results || 0) > 0);
  }

  r = await req("GET", "/services/search?q=Starbucks", null, TOKEN);
  check("GET /services/search?q=Starbucks → 200", r, 200);

  r = await req("GET", "/services/search", null, TOKEN);
  check("GET /services/search (no q) → 400", r, 400);

  r = await req("GET", "/services/nearby?lat=52.3086&lng=4.7641&radius=500", null, TOKEN);
  check("GET /services/nearby → 200", r, 200);

  if (SERVICE_ID) {
    r = await req("GET", `/services/${SERVICE_ID}`, null, TOKEN);
    check("GET /services/:id → 200", r, 200);
  }

  // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
  console.log("\n── NOTIFICATIONS ─────────────────────────────────");

  r = await req("GET", "/notifications", null, TOKEN);
  check("GET /notifications → 200", r, 200, b => Array.isArray(b.data?.notifications));

  r = await req("GET", "/notifications/unread-count", null, TOKEN);
  check("GET /notifications/unread-count → 200", r, 200, b => typeof b.data?.unreadCount === "number");

  r = await req("PATCH", "/notifications/read-all", null, TOKEN);
  check("PATCH /notifications/read-all → 200 with count", r, 200, b => typeof b.count === "number");

  // ── DEVICES ───────────────────────────────────────────────────────────────
  console.log("\n── DEVICES ───────────────────────────────────────");

  const fakeToken = `fcm_audit_${Date.now()}`;
  r = await req("POST", "/devices/register", { deviceToken: fakeToken, deviceType: "android" }, TOKEN);
  check("POST /devices/register → 201", r, 201, b => b.status === "success");

  r = await req("POST", "/devices/register", { deviceToken: fakeToken, deviceType: "ios" }, TOKEN);
  check("POST /devices/register (re-register same token) → 201", r, 201, b => b.status === "success");

  r = await req("POST", "/devices/register", {}, TOKEN);
  check("POST /devices/register (no token) → 400", r, 400);

  // ── NAVIGATION ────────────────────────────────────────────────────────────
  console.log("\n── NAVIGATION ────────────────────────────────────");

  r = await req("GET", "/navigation/nodes", null, TOKEN);
  check("GET /navigation/nodes → 200 array", r, 200, b => Array.isArray(b.data));

  r = await req("POST", "/navigation/find-path", { fromNodeId: "C01", toNodeId: "E18" }, TOKEN);
  const navOk = r.status !== 500;
  console.log(`${navOk ? "✅" : "❌"} [${r.status}] POST /navigation/find-path (no nodes → not 500)`);
  results.push({ name: "POST /navigation/find-path", ok: navOk, status: r.status });

  // ── CHAT ──────────────────────────────────────────────────────────────────
  console.log("\n── CHAT ──────────────────────────────────────────");

  r = await req("POST", "/chat/query", { message: "Where is Starbucks in Schiphol?" }, TOKEN);
  check("POST /chat/query → 200 with reply", r, 200, b => typeof b.data?.reply === "string" && b.data.reply.length > 0);

  r = await req("POST", "/chat/query", {}, TOKEN);
  check("POST /chat/query (no message) → 400", r, 400);

  // ── HOME ──────────────────────────────────────────────────────────────────
  console.log("\n── HOME ──────────────────────────────────────────");

  r = await req("GET", "/home", null, TOKEN);
  check("GET /home → 200", r, 200, b => b.status === "success");

  // ── STATS ─────────────────────────────────────────────────────────────────
  console.log("\n── STATS ─────────────────────────────────────────");

  r = await req("GET", "/stats", null, null);
  check("GET /stats → 200 (public)", r, 200, b => b.data?.metrics);

  r = await req("POST", "/stats/rate", { rating: 5, review: "Audit test!" }, TOKEN);
  check("POST /stats/rate → 201", r, 201, b => b.data?.rating?.rating === 5);

  r = await req("POST", "/stats/rate", { rating: 4, review: "injection test", user: "000000000000000000000000" }, TOKEN);
  const injBlocked = r.status === 201 && r.body.data?.rating?.user !== "000000000000000000000000";
  console.log(`${injBlocked ? "✅" : "❌"} [${r.status}] POST /stats/rate (user injection blocked)`);
  results.push({ name: "POST /stats/rate user injection blocked", ok: injBlocked, status: r.status });

  // ── FAQs ──────────────────────────────────────────────────────────────────
  console.log("\n── FAQs ──────────────────────────────────────────");

  r = await req("GET", "/faqs", null, TOKEN);
  check("GET /faqs → 200 with results", r, 200, b => (b.results || b.data?.length || 0) > 0);

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  const passed = results.filter(x => x.ok).length;
  const failed = results.filter(x => !x.ok).length;
  console.log(`\n══════════════════════════════════════════════════`);
  console.log(`  RESULTS: ${passed} passed  |  ${failed} failed`);
  if (failed > 0) {
    console.log("\n  FAILURES:");
    results.filter(x => !x.ok).forEach(x => console.log(`    ❌ ${x.name} [${x.status}]`));
  }
  console.log("══════════════════════════════════════════════════\n");

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(console.error);
