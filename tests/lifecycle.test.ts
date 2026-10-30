import "dotenv/config";
import type { RequestHandler } from "express";
import mongoose, { type ClientSession } from "mongoose";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAuthToken } from "../src/auth/token.js";
import { app } from "../src/app.js";
import { User } from "../src/models/User.js";
import { IncidentStatus, ResponseActionStatus, UserRole } from "../src/types/index.js";
import { IncidentModel } from "../src/models/Incident.js";
import { ResponseActionModel } from "../src/models/ResponseAction.js";
import { lockOwnedIncidentForDependencyMutation } from "../src/services/incidentDependencyMutation.js";

vi.mock("../src/middleware/ensureDatabaseConnection.js", () => ({
  ensureDatabaseConnection: ((
    _req: unknown,
    _res: unknown,
    next: () => void,
  ) => next()) as RequestHandler,
}));

vi.mock("../src/models/Incident.js", () => ({
  IncidentModel: { findOne: vi.fn(), findOneAndUpdate: vi.fn() },
  toPublicIncident: (incident: unknown) => incident,
}));

vi.mock("../src/models/ResponseAction.js", () => ({
  ResponseActionModel: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
  toPublicResponseAction: (action: unknown) => action,
}));

vi.mock("../src/services/incidentDependencyMutation.js", () => ({
  lockOwnedIncidentForDependencyMutation: vi.fn(),
}));

const commanderId = "507f1f77bcf86cd799439011";
const incidentId = "507f1f77bcf86cd799439012";
const actionId = "507f1f77bcf86cd799439013";

function tokenFor(userId = commanderId): string {
  return createAuthToken(userId);
}

function stubUser(role: UserRole = UserRole.INCIDENT_COMMANDER): void {
  const query = {
    select: vi.fn().mockResolvedValue({ isActive: true, role }),
  };
  vi.spyOn(User, "findById").mockReturnValue(query as never);
}

function stubSession(): ClientSession {
  const session = {
    withTransaction: vi.fn(async (callback: () => Promise<void>) => callback()),
    endSession: vi.fn().mockResolvedValue(undefined),
  };
  vi.spyOn(mongoose, "startSession").mockResolvedValue(session as never);
  return session as unknown as ClientSession;
}

function incident(status: IncidentStatus) {
  return {
    _id: { toString: () => incidentId },
    id: incidentId,
    title: "Fictional training incident",
    status,
    createdById: commanderId,
  };
}

function stubLockedIncident(value: ReturnType<typeof incident> | null): void {
  vi.mocked(lockOwnedIncidentForDependencyMutation).mockResolvedValue(value as never);
  vi.mocked(IncidentModel.findOne).mockReturnValue(
    { session: vi.fn().mockResolvedValue(value) } as never,
  );
}

function stubActionQuery(value: unknown): void {
  vi.mocked(ResponseActionModel.findOne).mockReturnValue(
    { session: vi.fn().mockResolvedValue(value) } as never,
  );
}

beforeEach(() => {
  stubUser();
  stubSession();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PATCH /api/incidents/:incidentId/status", () => {
  it("rejects skipped transitions without writing the new status", async () => {
    stubLockedIncident(incident(IncidentStatus.DETECTED));

    const response = await request(app)
      .patch(`/api/incidents/${incidentId}/status`)
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ status: IncidentStatus.RESOLVED });

    expect(response.status).toBe(409);
    expect(IncidentModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("records the containment time on a valid transition", async () => {
    const contained = incident(IncidentStatus.CONTAINED);
    stubLockedIncident(incident(IncidentStatus.INVESTIGATING));
    vi.mocked(IncidentModel.findOneAndUpdate).mockResolvedValue(contained as never);

    const response = await request(app)
      .patch(`/api/incidents/${incidentId}/status`)
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ status: IncidentStatus.CONTAINED });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe(IncidentStatus.CONTAINED);
    expect(IncidentModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: IncidentStatus.INVESTIGATING }),
      { $set: expect.objectContaining({ status: IncidentStatus.CONTAINED, containedAt: expect.any(Date) }) },
      expect.objectContaining({ session: expect.anything(), returnDocument: "after" }),
    );
  });

  it("clears the containment time when reopening an incident for investigation", async () => {
    const investigating = incident(IncidentStatus.INVESTIGATING);
    stubLockedIncident(incident(IncidentStatus.CONTAINED));
    vi.mocked(IncidentModel.findOneAndUpdate).mockResolvedValue(investigating as never);

    const response = await request(app)
      .patch(`/api/incidents/${incidentId}/status`)
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ status: IncidentStatus.INVESTIGATING });

    expect(response.status).toBe(200);
    expect(IncidentModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: IncidentStatus.CONTAINED }),
      { $set: { status: IncidentStatus.INVESTIGATING }, $unset: { containedAt: "" } },
      expect.objectContaining({ session: expect.anything(), returnDocument: "after" }),
    );
  });

  it("keeps resolved incidents terminal", async () => {
    stubLockedIncident(incident(IncidentStatus.RESOLVED));

    const response = await request(app)
      .patch(`/api/incidents/${incidentId}/status`)
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ status: IncidentStatus.INVESTIGATING });

    expect(response.status).toBe(409);
    expect(IncidentModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("blocks resolution while an action is still proposed", async () => {
    stubLockedIncident(incident(IncidentStatus.CONTAINED));
    stubActionQuery({ _id: actionId });

    const response = await request(app)
      .patch(`/api/incidents/${incidentId}/status`)
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ status: IncidentStatus.RESOLVED });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("INCIDENT_HAS_OPEN_ACTIONS");
    expect(IncidentModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("resolves a contained incident after its actions are rejected", async () => {
    const resolved = incident(IncidentStatus.RESOLVED);
    stubLockedIncident(incident(IncidentStatus.CONTAINED));
    stubActionQuery(null);
    vi.mocked(IncidentModel.findOneAndUpdate).mockResolvedValue(resolved as never);

    const response = await request(app)
      .patch(`/api/incidents/${incidentId}/status`)
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ status: IncidentStatus.RESOLVED });

    expect(response.status).toBe(200);
    expect(IncidentModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: IncidentStatus.CONTAINED }),
      { $set: expect.objectContaining({ status: IncidentStatus.RESOLVED, resolvedAt: expect.any(Date) }) },
      expect.objectContaining({ session: expect.anything(), returnDocument: "after" }),
    );
  });

  it("requires a commander and an incident owned by that commander", async () => {
    stubUser(UserRole.RESPONDER);
    const forbidden = await request(app)
      .patch(`/api/incidents/${incidentId}/status`)
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ status: IncidentStatus.TRIAGING });

    expect(forbidden.status).toBe(403);
    expect(lockOwnedIncidentForDependencyMutation).not.toHaveBeenCalled();

    stubUser(UserRole.INCIDENT_COMMANDER);
    stubLockedIncident(null);
    const notFound = await request(app)
      .patch(`/api/incidents/${incidentId}/status`)
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ status: IncidentStatus.TRIAGING });

    expect(notFound.status).toBe(404);
  });
});

describe("PATCH /api/actions/:actionId/status", () => {
  it("lets the owning commander reject a proposed action", async () => {
    stubLockedIncident(incident(IncidentStatus.DETECTED));
    stubActionQuery({ _id: actionId, incidentId, status: ResponseActionStatus.PROPOSED });
    const rejected = { _id: actionId, status: ResponseActionStatus.REJECTED };
    vi.mocked(ResponseActionModel.findOneAndUpdate).mockResolvedValue(rejected as never);

    const response = await request(app)
      .patch(`/api/actions/${actionId}/status`)
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ status: ResponseActionStatus.REJECTED });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe(ResponseActionStatus.REJECTED);
    expect(ResponseActionModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: ResponseActionStatus.PROPOSED }),
      { $set: { status: ResponseActionStatus.REJECTED } },
      expect.objectContaining({ session: expect.anything(), returnDocument: "after" }),
    );
  });

  it("does not expose action approval or completion in the demo slice", async () => {
    const response = await request(app)
      .patch(`/api/actions/${actionId}/status`)
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ status: ResponseActionStatus.APPROVED });

    expect(response.status).toBe(400);
    expect(ResponseActionModel.findOne).not.toHaveBeenCalled();
  });

  it("requires the owning commander and a proposed action", async () => {
    stubLockedIncident(null);
    stubActionQuery({ _id: actionId, incidentId, status: ResponseActionStatus.PROPOSED });

    const notFound = await request(app)
      .patch(`/api/actions/${actionId}/status`)
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ status: ResponseActionStatus.REJECTED });

    expect(notFound.status).toBe(404);
    expect(ResponseActionModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects action updates from responders and actions that are not proposed", async () => {
    stubUser(UserRole.RESPONDER);
    const forbidden = await request(app)
      .patch(`/api/actions/${actionId}/status`)
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ status: ResponseActionStatus.REJECTED });
    expect(forbidden.status).toBe(403);

    stubUser(UserRole.INCIDENT_COMMANDER);
    stubActionQuery({ _id: actionId, incidentId, status: ResponseActionStatus.APPROVED });
    const wrongStatus = await request(app)
      .patch(`/api/actions/${actionId}/status`)
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ status: ResponseActionStatus.REJECTED });

    expect(wrongStatus.status).toBe(409);
    expect(ResponseActionModel.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
