import { Router } from "express";
import mongoose, { Types } from "mongoose";
import { authenticate } from "../middleware/auth.js";
import { IncidentModel } from "../models/Incident.js";
import {
  ResponseActionModel,
  toPublicResponseAction,
  type ResponseActionDocument,
} from "../models/ResponseAction.js";
import { lockOwnedIncidentForDependencyMutation } from "../services/incidentDependencyMutation.js";
import { IncidentStatus, ResponseActionStatus } from "../types/index.js";

export const responseActionRoutes = Router();

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getRouteParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isValidObjectId(id: string): boolean {
  return /^[a-f\d]{24}$/i.test(id) && Types.ObjectId.isValid(id);
}

function isPriority(value: unknown): value is 1 | 2 | 3 {
  return value === 1 || value === 2 || value === 3;
}

function hasOnlyKeys(body: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(body).every((key) => allowed.includes(key));
}

responseActionRoutes.get("/incidents/:incidentId/actions", authenticate, async (req, res) => {
  const incidentId = getRouteParam(req.params.incidentId);
  if (!incidentId || !isValidObjectId(incidentId)) {
    res.status(400).json({ message: "Incident id must be a valid MongoDB ObjectId." });
    return;
  }

  const incident = await IncidentModel.findOne({ _id: incidentId, createdById: req.userId });
  if (!incident) {
    res.status(404).json({ message: "Incident not found." });
    return;
  }

  const actions = await ResponseActionModel.find({ incidentId: incident._id }).sort({ createdAt: -1, _id: -1 });
  res.json(actions.map(toPublicResponseAction));
});

responseActionRoutes.post("/incidents/:incidentId/actions", authenticate, async (req, res) => {
  const incidentId = getRouteParam(req.params.incidentId);
  if (!incidentId || !isValidObjectId(incidentId)) {
    res.status(400).json({ message: "Incident id must be a valid MongoDB ObjectId." });
    return;
  }

  const body = asObject(req.body);
  const allowed = ["title", "description", "priority"] as const;
  if (!body || !hasOnlyKeys(body, allowed) || Object.keys(body).length !== allowed.length) {
    res.status(400).json({ message: "Provide only a title, description, and priority." });
    return;
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (title.length < 3 || description.length < 10 || !isPriority(body.priority)) {
    res.status(400).json({ message: "Title, description, and a priority from 1 to 3 are required." });
    return;
  }
  const priority = body.priority;

  if (!req.userId) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  const session = await mongoose.startSession();
  const transactionResult: {
    action: ResponseActionDocument | undefined;
    result: "created" | "not-found" | "resolved" | "changed";
  } = { action: undefined, result: "created" };

  try {
    await session.withTransaction(async () => {
      transactionResult.action = undefined;
      transactionResult.result = "created";

      const incident = await lockOwnedIncidentForDependencyMutation(
        session,
        incidentId,
        req.userId!,
        { $ne: IncidentStatus.RESOLVED },
      );

      if (!incident) {
        const existingIncident = await IncidentModel.findOne({
          _id: incidentId,
          createdById: req.userId,
        }).session(session);
        transactionResult.result = !existingIncident
          ? "not-found"
          : existingIncident.status === IncidentStatus.RESOLVED
            ? "resolved"
            : "changed";
        return;
      }

      const [createdAction] = await ResponseActionModel.create(
        [
          {
            incidentId: incident._id,
            title,
            description,
            priority,
            status: ResponseActionStatus.PROPOSED,
            proposedById: new Types.ObjectId(req.userId),
          },
        ],
        { session },
      );
      transactionResult.action = createdAction;
    });
  } finally {
    await session.endSession();
  }

  if (transactionResult.result === "not-found") {
    res.status(404).json({ message: "Incident not found." });
    return;
  }

  if (transactionResult.result === "resolved") {
    res.status(409).json({ message: "Response actions cannot be added to a resolved incident." });
    return;
  }

  if (transactionResult.result === "changed" || !transactionResult.action) {
    res.status(409).json({ message: "Incident changed while the action was being saved; reload and retry." });
    return;
  }

  res.status(201).json(toPublicResponseAction(transactionResult.action));
});
