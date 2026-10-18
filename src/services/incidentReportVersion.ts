import mongoose, { Types } from "mongoose";
import { IncidentReportModel, type IncidentReportDocument } from "../models/IncidentReport.js";
import { IncidentModel } from "../models/Incident.js";
import { IncidentStatus } from "../types/index.js";
import type { IncidentReportContent } from "../schemas/incidentReport.js";

export class IncidentChangedBeforeReportSaveError extends Error {}

export async function createIncidentReportVersion(
  incidentId: string,
  createdById: string,
  content: IncidentReportContent,
): Promise<IncidentReportDocument> {
  const session = await mongoose.startSession();
  let savedReport: IncidentReportDocument | undefined;

  try {
    await session.withTransaction(async () => {
      const incident = await IncidentModel.findOneAndUpdate(
        {
          _id: incidentId,
          createdById,
          status: IncidentStatus.RESOLVED,
        },
        { $inc: { reportVersion: 1 } },
        {
          session,
          returnDocument: "after",
          runValidators: true,
          timestamps: false,
        },
      ).select("+reportVersion");

      if (!incident) {
        throw new IncidentChangedBeforeReportSaveError(
          "The resolved incident changed before its report could be saved.",
        );
      }

      const [report] = await IncidentReportModel.create(
        [
          {
            incidentId: incident._id,
            version: incident.reportVersion ?? 1,
            content: JSON.stringify(content),
            generatedById: new Types.ObjectId(createdById),
          },
        ],
        { session },
      );
      savedReport = report;
    });
  } finally {
    await session.endSession();
  }

  if (!savedReport) {
    throw new Error("The report transaction completed without creating a report.");
  }

  return savedReport;
}
