export type ID = string;
export type ISODateString = string;
export type ActionPriority = 1 | 2 | 3;

export enum UserRole {
  RESPONDER = "responder",
  INCIDENT_COMMANDER = "incident_commander",
}

export enum IncidentSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum IncidentStatus {
  DETECTED = "detected",
  TRIAGING = "triaging",
  INVESTIGATING = "investigating",
  CONTAINED = "contained",
  RESOLVED = "resolved",
}

export enum ResponseActionStatus {
  PROPOSED = "proposed",
  APPROVED = "approved",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  REJECTED = "rejected",
}

export enum EvidenceType {
  ALERT = "alert",
  LOG_EXCERPT = "log_excerpt",
  USER_REPORT = "user_report",
  SCREENSHOT = "screenshot",
  EMAIL_SAMPLE = "email_sample",
}

export interface User {
  id: ID;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: ISODateString;
}

export interface Incident {
  id: ID;
  title: string;
  summary: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  reportedAt: ISODateString;
  commanderId: ID;
  createdById: ID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  containedAt?: ISODateString;
  resolvedAt?: ISODateString;
}

export interface ResponseAction {
  id: ID;
  incidentId: ID;
  title: string;
  description: string;
  status: ResponseActionStatus;
  priority: ActionPriority;
  proposedById: ID;
  createdAt: ISODateString;
  assignedToId?: ID;
  approvedById?: ID;
  startedAt?: ISODateString;
  completedAt?: ISODateString;
}

export interface Evidence {
  id: ID;
  incidentId: ID;
  title: string;
  description: string;
  type: EvidenceType;
  isRevealed: boolean;
  createdAt: ISODateString;
  revealedAt?: ISODateString;
  revealedById?: ID;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  fieldErrors?: Record<string, string>;
}

export type CreateIncidentInput = Omit<
  Incident,
  "id" | "status" | "reportedAt" | "createdAt" | "updatedAt" | "containedAt" | "resolvedAt"
>;

export type UpdateIncidentInput = Partial<
  Pick<Incident, "title" | "summary" | "description" | "severity" | "commanderId">
>;

export type IncidentSummary = Pick<
  Incident,
  "id" | "title" | "severity" | "status" | "reportedAt"
>;

export type CreateResponseActionInput = Omit<
  ResponseAction,
  "id" | "status" | "approvedById" | "createdAt" | "startedAt" | "completedAt"
>;

export type UpdateResponseActionInput = Partial<
  Pick<ResponseAction, "title" | "description" | "priority" | "assignedToId">
>;

export type CreateEvidenceInput = Omit<
  Evidence,
  "id" | "isRevealed" | "createdAt" | "revealedAt" | "revealedById"
>;

export type PublicUser = Omit<User, "email">;
export type RoleCount = Record<UserRole, number>;
export type EntityById<T extends { id: ID }> = Record<ID, T>;
