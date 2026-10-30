import { IncidentStatus } from "../types/index.js";

export const validIncidentTransitions: Readonly<
  Record<IncidentStatus, readonly IncidentStatus[]>
> = {
  [IncidentStatus.DETECTED]: [IncidentStatus.TRIAGING],
  [IncidentStatus.TRIAGING]: [IncidentStatus.INVESTIGATING],
  [IncidentStatus.INVESTIGATING]: [IncidentStatus.CONTAINED],
  [IncidentStatus.CONTAINED]: [IncidentStatus.INVESTIGATING, IncidentStatus.RESOLVED],
  [IncidentStatus.RESOLVED]: [],
};

export function canTransitionIncident(
  currentStatus: IncidentStatus,
  nextStatus: IncidentStatus,
): boolean {
  return validIncidentTransitions[currentStatus].includes(nextStatus);
}
