import type { ClientSession } from "mongoose";
import { IncidentModel, type IncidentDocument } from "../models/Incident.js";
import { IncidentStatus } from "../types/index.js";

type IncidentStatusFilter = IncidentStatus | { $ne: IncidentStatus };

export function lockOwnedIncidentForDependencyMutation(
  session: ClientSession,
  incidentId: string,
  ownerId: string,
  status?: IncidentStatusFilter,
): Promise<IncidentDocument | null> {
  const filter = {
    _id: incidentId,
    createdById: ownerId,
    ...(status === undefined ? {} : { status }),
  };

  // The shared parent write serializes dependency changes inside the transaction.
  return IncidentModel.findOneAndUpdate(
    filter,
    { $inc: { dependencyRevision: 1 } },
    {
      session,
      returnDocument: "after",
      runValidators: true,
      timestamps: false,
    },
  );
}
