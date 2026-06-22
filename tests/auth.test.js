const dotenv = require("dotenv");
dotenv.config({ path: "./variables.env" });
const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");
const User = require("../models/userModel");
const RefreshToken = require("../models/refreshTokenModel");

describe("Authentication Tests", () => {
  const testUser = {
    name: "Test User",
    email: "test@example.com",
    password: "TestPass123",
    passwordConfirm: "TestPass123",
  };

  const anotherUser = {
    name: "Another User",
    email: "another@example.com",
    password: "AnotherPass123",
    passwordConfirm: "AnotherPass123",
  };

  beforeAll(async () => {
    await mongoose.connect(process.env.DATABASE_URL);
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await RefreshToken.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({});
    await RefreshToken.deleteMany({});
    await mongoose.connection.close();
  });

  // ─── SIGNUP TESTS ───
  describe("POST /api/v1/users/signup", () => {
    test("✅ Should signup with valid credentials", async () => {
      const res = await request(app)
        .post("/api/v1/users/signup")
        .send(testUser)
        .expect(201);

      expect(res.body.status).toBe("success");
      expect(res.body.token).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.user.password).toBeUndefined();

      const user = await User.findOne({ email: testUser.email });
      expect(user).toBeDefined();
    });

    test("❌ Should reject duplicate email", async () => {
      await request(app).post("/api/v1/users/signup").send(testUser).expect(201);

      const res = await request(app)
        .post("/api/v1/users/signup")
        .send(testUser)
        .expect(400);

      expect(res.body.status).toMatch(/error|fail/);
      expect(res.body.message).toContain("already registered");
    });

    test("❌ Should reject empty password", async () => {
      const res = await request(app)
        .post("/api/v1/users/signup")
        .send({
          ...testUser,
          password: "",
          passwordConfirm: "",
        })
        .expect(400);

      expect(res.body.status).toMatch(/error|fail/);
      expect(res.body.message).toContain("Password");
    });

    test("❌ Should reject mismatched passwords", async () => {
      const res = await request(app)
        .post("/api/v1/users/signup")
        .send({
          ...testUser,
          passwordConfirm: "DifferentPass123",
        })
        .expect(400);

      expect(res.body.status).toMatch(/error|fail/);
      expect(res.body.message).toContain("do not match");
    });

    test("❌ Should reject short password", async () => {
      const res = await request(app)
        .post("/api/v1/users/signup")
        .send({
          ...testUser,
          password: "Pass1",
          passwordConfirm: "Pass1",
        })
        .expect(400);

      expect(res.body.status).toMatch(/error|fail/);
      expect(res.body.message).toContain("at least 8 characters");
    });

    test("❌ Should reject invalid email", async () => {
      const res = await request(app)
        .post("/api/v1/users/signup")
        .send({
          ...testUser,
          email: "invalid-email",
        })
        .expect(400);

      expect(res.body.status).toMatch(/error|fail/);
      expect(res.body.message).toContain("valid email");
    });
  });

  // ─── LOGIN TESTS ───
  describe("POST /api/v1/users/login", () => {
    beforeEach(async () => {
      await request(app).post("/api/v1/users/signup").send(testUser).expect(201);
    });

    test("✅ Should login with valid credentials", async () => {
      const res = await request(app)
        .post("/api/v1/users/login")
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(res.body.status).toBe("success");
      expect(res.body.token).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email);
    });

    test("❌ Should reject non-existent email", async () => {
      const res = await request(app)
        .post("/api/v1/users/login")
        .send({
          email: "nonexistent@example.com",
          password: testUser.password,
        })
        .expect(401);

      expect(res.body.message).toContain("Incorrect");
    });

    test("❌ Should reject wrong password", async () => {
      const res = await request(app)
        .post("/api/v1/users/login")
        .send({
          email: testUser.email,
          password: "WrongPass123",
        })
        .expect(401);

      expect(res.body.message).toContain("Incorrect");
    });

    test("❌ Should reject missing email", async () => {
      const res = await request(app)
        .post("/api/v1/users/login")
        .send({
          password: testUser.password,
        })
        .expect(400);

      expect(res.body.message).toContain("email");
    });

    test("❌ Should reject missing password", async () => {
      const res = await request(app)
        .post("/api/v1/users/login")
        .send({
          email: testUser.email,
        })
        .expect(400);

      expect(res.body.message).toContain("Password");
    });

    test("✅ Should set JWT cookie on successful login", async () => {
      const res = await request(app)
        .post("/api/v1/users/login")
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(res.headers["set-cookie"]).toBeDefined();
      const cookies = res.headers["set-cookie"].join(";");
      expect(cookies).toContain("jwt");
    });

    test("✅ Should lock account after 5 failed attempts", async () => {
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post("/api/v1/users/login")
          .send({
            email: testUser.email,
            password: "WrongPass123",
          })
          .expect(401);
      }

      const res = await request(app)
        .post("/api/v1/users/login")
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(423);

      expect(res.body.message).toContain("locked");
    }, 30000);

    test("✅ Should reset login attempts on successful login", async () => {
      await request(app)
        .post("/api/v1/users/login")
        .send({
          email: testUser.email,
          password: "WrongPass123",
        })
        .expect(401);

      await request(app)
        .post("/api/v1/users/login")
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const user = await User.findOne({ email: testUser.email }).select("+loginAttempts");
      expect(user.loginAttempts).toBe(0);
    });
  });

  // ─── CONCURRENT SIGNUP TEST ───
  describe("Concurrent Signup (Race Condition)", () => {
    test("✅ Should handle concurrent signups with same email", async () => {
      const promises = [
        request(app).post("/api/v1/users/signup").send(testUser),
        request(app).post("/api/v1/users/signup").send(testUser),
      ];

      const results = await Promise.all(promises);
      const statuses = results.map((r) => r.status).sort();
      expect(statuses).toEqual([201, 400]);

      const users = await User.find({ email: testUser.email });
      expect(users.length).toBe(1);
    });
  });

  // ─── EMAIL CASE INSENSITIVITY ───
  describe("Email Case Insensitivity", () => {
    test("✅ Should treat different email cases as duplicates", async () => {
      await request(app)
        .post("/api/v1/users/signup")
        .send({
          ...testUser,
          email: "test@example.com",
        })
        .expect(201);

      const res = await request(app)
        .post("/api/v1/users/signup")
        .send({
          ...testUser,
          email: "TEST@EXAMPLE.COM",
        })
        .expect(400);

      expect(res.body.message).toContain("already registered");
    });

    test("✅ Should login with different email case", async () => {
      await request(app).post("/api/v1/users/signup").send(testUser).expect(201);

      const res = await request(app)
        .post("/api/v1/users/login")
        .send({
          email: testUser.email.toUpperCase(),
          password: testUser.password,
        })
        .expect(200);

      expect(res.body.status).toBe("success");
    });
  });

  // ─── STATS API ───
  describe("GET /api/v1/stats", () => {
    test("should return successfully with metrics", async () => {
      const res = await request(app).get("/api/v1/stats");
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toHaveProperty("metrics");
    });
  });
});
