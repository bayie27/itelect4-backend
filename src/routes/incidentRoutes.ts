import { Router } from "express";
import mongoose, { Types } from "mongoose";
import { authenticate } from "../middleware/auth.js";
import { requireCommander } from "../middleware/requireCommander.js";
import { IncidentModel, toPublicIncident } from "../models/Incident.js";
import { IncidentSeverity, IncidentStatus } from "../types/index.js";

export const incidentRoutes = Router();
incidentRoutes.use(authenticate);

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isValidIncidentId(id: string): boolean {
  return /^[a-f\d]{24}$/i.test(id) && Types.ObjectId.isValid(id);
}

function getRouteParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isSeverity(value: unknown): value is IncidentSeverity {
  return typeof value === "string" && Object.values(IncidentSeverity).includes(value as IncidentSeverity);
}

function hasOnlyKeys(body: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(body).every((key) => allowed.includes(key));
}

function canUpdateField(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

incidentRoutes.get("/", async (req, res) => {
  const incidents = await IncidentModel.find({ createdById: req.userId }).sort({ reportedAt: -1, _id: -1 });
  res.json(incidents.map(toPublicIncident));
});

incidentRoutes.get("/:incidentId", async (req, res) => {
  const incidentId = getRouteParam(req.params.incidentId);
  if (!incidentId || !isValidIncidentId(incidentId)) {
    res.status(400).json({ message: "Incident id must be a valid MongoDB ObjectId." });
    return;
  }

  const incident = await IncidentModel.findOne({ _id: incidentId, createdById: req.userId });
  if (!incident) {
    res.status(404).json({ message: "Incident not found." });
    return;
  }

  res.json(toPublicIncident(incident));
});

incidentRoutes.post("/", requireCommander, async (req, res) => {
  const body = asObject(req.body);
  if (!body) {
    res.status(400).json({ message: "A JSON object is required." });
    return;
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const summary = typeof body.summary === "string" ? body.summary.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";

  if (!title || !summary || !description || !isSeverity(body.severity)) {
    res.status(400).json({ message: "Title, summary, description, and a valid severity are required." });
    return;
  }

  if (req.userId === undefined) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  const incident = await IncidentModel.create({
    title,
    summary,
    description,
    severity: body.severity,
    status: IncidentStatus.DETECTED,
    commanderId: new Types.ObjectId(req.userId),
    createdById: new Types.ObjectId(req.userId),
  });

  res.status(201).json(toPublicIncident(incident));
});

incidentRoutes.patch("/:incidentId", requireCommander, async (req, res) => {
  const incidentId = getRouteParam(req.params.incidentId);
  if (!incidentId || !isValidIncidentId(incidentId)) {
    res.status(400).json({ message: "Incident id must be a valid MongoDB ObjectId." });
    return;
  }

  const body = asObject(req.body);
  const allowed = ["title", "summary", "description", "severity"] as const;
  if (!body || !hasOnlyKeys(body, allowed) || Object.keys(body).length === 0) {
    res.status(400).json({ message: "Provide one or more editable incident fields." });
    return;
  }

  const update: Record<string, string> = {};
  for (const field of ["title", "summary", "description"] as const) {
    if (body[field] !== undefined) {
      if (!canUpdateField(body[field])) {
        res.status(400).json({ message: `${field} must be a non-empty string.` });
        return;
      }
      update[field] = body[field].trim();
    }
  }

  if (body.severity !== undefined) {
    if (!isSeverity(body.severity)) {
      res.status(400).json({ message: "Severity must be low, medium, high, or critical." });
      return;
    }
    update.severity = body.severity;
  }

  const incident = await IncidentModel.findOneAndUpdate(
    { _id: incidentId, createdById: req.userId },
    { $set: update },
    { returnDocument: "after", runValidators: true },
  );

  if (!incident) {
    res.status(404).json({ message: "Incident not found." });
    return;
  }

  res.json(toPublicIncident(incident));
});

incidentRoutes.delete("/:incidentId", requireCommander, async (req, res) => {
  const incidentId = getRouteParam(req.params.incidentId);
  if (!incidentId || !isValidIncidentId(incidentId)) {
    res.status(400).json({ message: "Incident id must be a valid MongoDB ObjectId." });
    return;
  }

  const query = { _id: incidentId, createdById: req.userId };
  const incident = await IncidentModel.findOne(query);
  if (!incident) {
    res.status(404).json({ message: "Incident not found." });
    return;
  }

  if (incident.status !== IncidentStatus.DETECTED) {
    res.status(409).json({ message: "Only detected incidents can be deleted." });
    return;
  }

  const database = mongoose.connection.db;
  if (!database) {
    throw new Error("Database connection is not available.");
  }

  const incidentObjectId = new Types.ObjectId(incidentId);
  const dependencyQuery = { incidentId: { $in: [incidentObjectId, incidentId] } };
  const [action, evidence] = await Promise.all([
    database.collection("responseactions").findOne(dependencyQuery),
    database.collection("evidences").findOne(dependencyQuery),
  ]);

  if (action || evidence) {
    res.status(409).json({
      message: "Incidents with response actions or evidence cannot be deleted.",
      code: "INCIDENT_HAS_DEPENDENCIES",
    });
    return;
  }

  const deleted = await IncidentModel.findOneAndDelete({
    ...query,
    status: IncidentStatus.DETECTED,
  });

  if (!deleted) {
    res.status(409).json({ message: "Incident changed while deletion was being checked; reload and retry." });
    return;
  }

  res.status(204).end();
});
