const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");

describe("Auth & Stats API", () => {
  // Gracefully close connection after tests
  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe("GET /api/v1/stats", () => {
    it("should return successfully with metrics", async () => {
      const res = await request(app).get("/api/v1/stats");
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toHaveProperty("metrics");
    });
  });

  describe("POST /api/v1/users/login", () => {
    it("should fail with incorrect credentials", async () => {
      const res = await request(app)
        .post("/api/v1/users/login")
        .send({ email: "invalid@test.com", password: "wrong" });
      
      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toBe("fail");
    });

    it("should enforce validation rules", async () => {
      const res = await request(app)
        .post("/api/v1/users/login")
        .send({ email: "invalid-email", password: "123" });
      
      expect(res.statusCode).toEqual(400);
    });
  });
});
