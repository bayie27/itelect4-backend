import "dotenv/config";
import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAuthToken } from "../src/auth/token.js";
import { app } from "../src/app.js";
import { User } from "../src/models/User.js";
import { UserRole } from "../src/types/index.js";

// The real guard waits for Atlas before reaching the route. This test keeps
// the rest of the Express pipeline real while allowing auth behavior to run
// without a database or a deployed service.
vi.mock("../src/middleware/ensureDatabaseConnection.js", () => ({
  ensureDatabaseConnection: ((
    _req: unknown,
    _res: unknown,
    next: () => void,
  ) => next()) as RequestHandler,
}));

function tokenFor(userId: string): string {
  return createAuthToken(userId);
}

function stubActiveCommanderLookup(): void {
  const query = {
    select: vi.fn().mockResolvedValue({
      isActive: true,
      role: UserRole.INCIDENT_COMMANDER,
    }),
  };

  vi.spyOn(User, "findById").mockReturnValue(query as never);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/ai", () => {
  it("answers 401 when there is no token", async () => {
    const response = await request(app)
      .post("/api/ai")
      .send({
        incidentId: "507f1f77bcf86cd799439011",
        prompt: "Summarize the fictional containment timeline.",
      });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("No token. Send Authorization: Bearer <token>");
  });

  it("answers 401 when the token was signed with another secret", async () => {
    const forgedToken = jwt.sign({ sub: "fictional-user-001" }, "not-the-secret");

    const response = await request(app)
      .post("/api/ai")
      .set("Authorization", `Bearer ${forgedToken}`)
      .send({
        incidentId: "507f1f77bcf86cd799439011",
        prompt: "Summarize the fictional containment timeline.",
      });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Token is invalid or has expired.");
  });

  it("lets a valid token through authentication, then validates the CIRS request", async () => {
    stubActiveCommanderLookup();

    const response = await request(app)
      .post("/api/ai")
      .set("Authorization", `Bearer ${tokenFor("fictional-user-001")}`)
      .send({
        incidentId: "507f1f77bcf86cd799439011",
        prompt: "Too short",
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      message: "Validation failed",
      errors: ["Describe the report focus in at least 20 characters."],
    });
  });
});
