import { Router } from "express";
import { Types } from "mongoose";
import { authenticate } from "../middleware/auth.js";
import { requireCommander } from "../middleware/requireCommander.js";
import { EvidenceModel, toPublicEvidence } from "../models/Evidence.js";
import { IncidentModel } from "../models/Incident.js";
import { UserRole } from "../types/index.js";

export const evidenceRoutes = Router();

function getRouteParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isValidObjectId(id: string): boolean {
  return /^[a-f\d]{24}$/i.test(id) && Types.ObjectId.isValid(id);
}

evidenceRoutes.get("/incidents/:incidentId/evidence", authenticate, async (req, res) => {
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

  const evidenceQuery =
    req.userRole === UserRole.INCIDENT_COMMANDER
      ? { incidentId: incident._id }
      : { incidentId: incident._id, isRevealed: true };
  const evidence = await EvidenceModel.find(evidenceQuery).sort({ createdAt: -1, _id: -1 });
  res.json(evidence.map(toPublicEvidence));
});

evidenceRoutes.patch(
  "/evidence/:evidenceId/reveal",
  authenticate,
  requireCommander,
  async (req, res) => {
  const evidenceId = getRouteParam(req.params.evidenceId);
  if (!evidenceId || !isValidObjectId(evidenceId)) {
    res.status(400).json({ message: "Evidence id must be a valid MongoDB ObjectId." });
    return;
  }

  const evidence = await EvidenceModel.findById(evidenceId);
  if (!evidence) {
    res.status(404).json({ message: "Evidence not found." });
    return;
  }

  const incident = await IncidentModel.findOne({ _id: evidence.incidentId, createdById: req.userId });
  if (!incident) {
    res.status(404).json({ message: "Evidence not found." });
    return;
  }

  if (evidence.isRevealed) {
    res.json(toPublicEvidence(evidence));
    return;
  }

  if (!req.userId) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  const revealedEvidence = await EvidenceModel.findOneAndUpdate(
    { _id: evidence._id, isRevealed: false },
    {
      $set: {
        isRevealed: true,
        revealedAt: new Date(),
        revealedById: new Types.ObjectId(req.userId),
      },
    },
    { returnDocument: "after", runValidators: true },
  );

  if (revealedEvidence) {
    res.json(toPublicEvidence(revealedEvidence));
    return;
  }

  const alreadyRevealed = await EvidenceModel.findById(evidence._id);
  if (!alreadyRevealed) {
    res.status(404).json({ message: "Evidence not found." });
    return;
  }

  res.json(toPublicEvidence(alreadyRevealed));
  },
);
