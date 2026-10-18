import { Router } from "express";
import { Types } from "mongoose";
import { authenticate } from "../middleware/auth.js";
import { IncidentModel } from "../models/Incident.js";
import { IncidentReportModel, toPublicIncidentReport } from "../models/IncidentReport.js";

export const reportRoutes = Router();
reportRoutes.use(authenticate);

function isValidObjectId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value) && Types.ObjectId.isValid(value);
}

reportRoutes.get("/incidents/:incidentId/reports", async (req, res) => {
  const incidentId = req.params.incidentId;
  if (typeof incidentId !== "string" || !isValidObjectId(incidentId)) {
    res.status(400).json({ message: "Incident id must be a valid MongoDB ObjectId." });
    return;
  }

  const incident = await IncidentModel.findOne({ _id: incidentId, createdById: req.userId });
  if (!incident) {
    res.status(404).json({ message: "Incident not found." });
    return;
  }

  const reports = await IncidentReportModel.find({ incidentId: incident._id }).sort({ version: -1 });
  res.json(
    reports.map((report) => {
      const publicReport = toPublicIncidentReport(report);
      const { content: _content, ...summary } = publicReport;
      return summary;
    }),
  );
});

reportRoutes.get("/reports/:reportId", async (req, res) => {
  const reportId = req.params.reportId;
  if (typeof reportId !== "string" || !isValidObjectId(reportId)) {
    res.status(400).json({ message: "Report id must be a valid MongoDB ObjectId." });
    return;
  }

  const report = await IncidentReportModel.findById(reportId);
  if (!report) {
    res.status(404).json({ message: "Report not found." });
    return;
  }

  const incident = await IncidentModel.findOne({ _id: report.incidentId, createdById: req.userId });
  if (!incident) {
    res.status(404).json({ message: "Report not found." });
    return;
  }

  res.json(toPublicIncidentReport(report));
});
