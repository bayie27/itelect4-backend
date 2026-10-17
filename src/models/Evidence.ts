import mongoose, { HydratedDocument, Model, Schema, Types, model } from "mongoose";
import type { Evidence as PublicEvidence } from "../types/index.js";
import { EvidenceType } from "../types/index.js";

export interface EvidenceRecord {
  incidentId: Types.ObjectId;
  title: string;
  description: string;
  type: EvidenceType;
  isRevealed: boolean;
  revealedAt?: Date;
  revealedById?: Types.ObjectId;
  createdAt?: Date;
}

export type EvidenceDocument = HydratedDocument<EvidenceRecord>;

const evidenceSchema = new Schema<EvidenceRecord>(
  {
    incidentId: { type: Schema.Types.ObjectId, ref: "Incident", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    type: { type: String, enum: Object.values(EvidenceType), required: true },
    isRevealed: { type: Boolean, default: false, required: true },
    revealedAt: { type: Date },
    revealedById: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

evidenceSchema.index({ incidentId: 1, createdAt: -1 });

export const EvidenceModel: Model<EvidenceRecord> =
  (mongoose.models.Evidence as Model<EvidenceRecord> | undefined) ?? model<EvidenceRecord>("Evidence", evidenceSchema);

export function toPublicEvidence(evidence: EvidenceDocument): PublicEvidence {
  return {
    id: evidence._id.toString(),
    incidentId: evidence.incidentId.toString(),
    title: evidence.title,
    description: evidence.description,
    type: evidence.type,
    isRevealed: evidence.isRevealed,
    createdAt: evidence.createdAt!.toISOString(),
    ...(evidence.revealedAt ? { revealedAt: evidence.revealedAt.toISOString() } : {}),
    ...(evidence.revealedById ? { revealedById: evidence.revealedById.toString() } : {}),
  };
}
