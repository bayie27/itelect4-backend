import type { RequestHandler } from "express";
import { UserRole } from "../types/index.js";

export const requireCommander: RequestHandler = (req, res, next) => {
  if (!req.userId) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  if (req.userRole !== UserRole.INCIDENT_COMMANDER) {
    res.status(403).json({ message: "Incident commander role required." });
    return;
  }

  next();
};
