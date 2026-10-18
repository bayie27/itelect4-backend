import mongoose, { HydratedDocument, Model, Schema, Types, model } from "mongoose";
import type { IncidentReport as PublicIncidentReport } from "../types/index.js";

export interface IncidentReportRecord {
  incidentId: Types.ObjectId;
  version: number;
  content: string;
  generatedById: Types.ObjectId;
  generatedAt: Date;
}

export type IncidentReportDocument = HydratedDocument<IncidentReportRecord>;

const incidentReportSchema = new Schema<IncidentReportRecord>(
  {
    incidentId: { type: Schema.Types.ObjectId, ref: "Incident", required: true },
    version: { type: Number, required: true, min: 1 },
    content: { type: String, required: true },
    generatedById: { type: Schema.Types.ObjectId, ref: "User", required: true },
    generatedAt: { type: Date, default: Date.now, required: true },
  },
  { versionKey: false },
);

incidentReportSchema.index({ incidentId: 1, version: 1 }, { unique: true });
incidentReportSchema.index({ incidentId: 1, version: -1 });

export const IncidentReportModel: Model<IncidentReportRecord> =
  (mongoose.models.IncidentReport as Model<IncidentReportRecord> | undefined) ??
  model<IncidentReportRecord>("IncidentReport", incidentReportSchema);

export function toPublicIncidentReport(report: IncidentReportDocument): PublicIncidentReport {
  return {
    id: report._id.toString(),
    incidentId: report.incidentId.toString(),
    version: report.version,
    content: report.content,
    generatedById: report.generatedById.toString(),
    generatedAt: report.generatedAt.toISOString(),
  };
}
