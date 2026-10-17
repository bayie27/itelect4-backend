import mongoose, { HydratedDocument, Model, Schema, Types, model } from "mongoose";
import type { ResponseAction as PublicResponseAction } from "../types/index.js";
import type { ActionPriority } from "../types/index.js";
import { ResponseActionStatus } from "../types/index.js";

export interface ResponseActionRecord {
  incidentId: Types.ObjectId;
  title: string;
  description: string;
  status: ResponseActionStatus;
  priority: ActionPriority;
  proposedById: Types.ObjectId;
  assignedToId?: Types.ObjectId;
  approvedById?: Types.ObjectId;
  startedAt?: Date;
  completedAt?: Date;
  createdAt?: Date;
}

export type ResponseActionDocument = HydratedDocument<ResponseActionRecord>;

const responseActionSchema = new Schema<ResponseActionRecord>(
  {
    incidentId: { type: Schema.Types.ObjectId, ref: "Incident", required: true },
    title: { type: String, required: true, trim: true, minlength: 3 },
    description: { type: String, required: true, trim: true, minlength: 10 },
    status: {
      type: String,
      enum: Object.values(ResponseActionStatus),
      default: ResponseActionStatus.PROPOSED,
      required: true,
    },
    priority: { type: Number, enum: [1, 2, 3], required: true },
    proposedById: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedToId: { type: Schema.Types.ObjectId, ref: "User" },
    approvedById: { type: Schema.Types.ObjectId, ref: "User" },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

responseActionSchema.index({ incidentId: 1, createdAt: -1 });

export const ResponseActionModel: Model<ResponseActionRecord> =
  (mongoose.models.ResponseAction as Model<ResponseActionRecord> | undefined) ??
  model<ResponseActionRecord>("ResponseAction", responseActionSchema);

export function toPublicResponseAction(action: ResponseActionDocument): PublicResponseAction {
  return {
    id: action._id.toString(),
    incidentId: action.incidentId.toString(),
    title: action.title,
    description: action.description,
    status: action.status,
    priority: action.priority,
    proposedById: action.proposedById.toString(),
    createdAt: action.createdAt!.toISOString(),
    ...(action.assignedToId ? { assignedToId: action.assignedToId.toString() } : {}),
    ...(action.approvedById ? { approvedById: action.approvedById.toString() } : {}),
    ...(action.startedAt ? { startedAt: action.startedAt.toISOString() } : {}),
    ...(action.completedAt ? { completedAt: action.completedAt.toISOString() } : {}),
  };
}
