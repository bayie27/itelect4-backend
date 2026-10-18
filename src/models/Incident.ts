import mongoose, { HydratedDocument, Model, Schema, Types, model } from "mongoose";
import {
  Incident as PublicIncident,
  IncidentSeverity,
  IncidentStatus,
} from "../types/index.js";

export interface IncidentRecord {
  title: string;
  summary: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  reportedAt: Date;
  commanderId: Types.ObjectId;
  createdById: Types.ObjectId;
  dependencyRevision: number;
  reportVersion?: number;
  containedAt?: Date;
  resolvedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type IncidentDocument = HydratedDocument<IncidentRecord>;

const incidentSchema = new Schema<IncidentRecord>(
  {
    title: { type: String, required: true, trim: true },
    summary: { type: String, required: true, trim: true, minlength: 10, maxlength: 280 },
    description: { type: String, required: true, trim: true },
    severity: { type: String, enum: Object.values(IncidentSeverity), required: true },
    status: { type: String, enum: Object.values(IncidentStatus), default: IncidentStatus.DETECTED, required: true },
    reportedAt: { type: Date, default: Date.now, required: true },
    commanderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdById: { type: Schema.Types.ObjectId, ref: "User", required: true },
    dependencyRevision: { type: Number, default: 0, min: 0, select: false },
    reportVersion: { type: Number, default: 0, min: 0, select: false },
    containedAt: { type: Date },
    resolvedAt: { type: Date },
  },
  { timestamps: true },
);

incidentSchema.index({ createdById: 1, reportedAt: -1 });

export const IncidentModel: Model<IncidentRecord> =
  (mongoose.models.Incident as Model<IncidentRecord> | undefined) ?? model<IncidentRecord>("Incident", incidentSchema);

export function toPublicIncident(incident: IncidentDocument): PublicIncident {
  return {
    id: incident._id.toString(),
    title: incident.title,
    summary: incident.summary,
    description: incident.description,
    severity: incident.severity,
    status: incident.status,
    reportedAt: incident.reportedAt.toISOString(),
    commanderId: incident.commanderId.toString(),
    createdById: incident.createdById.toString(),
    createdAt: incident.createdAt!.toISOString(),
    updatedAt: incident.updatedAt!.toISOString(),
    ...(incident.containedAt ? { containedAt: incident.containedAt.toISOString() } : {}),
    ...(incident.resolvedAt ? { resolvedAt: incident.resolvedAt.toISOString() } : {}),
  };
}
