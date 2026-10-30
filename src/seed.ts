import "dotenv/config";
import mongoose, { Types } from "mongoose";
import { connectDatabase } from "./config/db.js";
import { EvidenceModel } from "./models/Evidence.js";
import { IncidentModel } from "./models/Incident.js";
import { User } from "./models/User.js";
import { lockOwnedIncidentForDependencyMutation } from "./services/incidentDependencyMutation.js";
import { EvidenceType, IncidentSeverity, IncidentStatus, UserRole } from "./types/index.js";

const incidentTitle = "[CIRS Session 10] Stark Industries mail gateway alert";
const incidentSummary = "A fictional training mailbox alert awaits commander triage.";
const evidenceTitle = "Mock mail gateway alert excerpt";

function getOwnerEmail(args: readonly string[]): string {
  if (args.length !== 2 || args[0] !== "--owner" || !args[1].trim() || args[1].startsWith("--")) {
    throw new Error("Usage: npm run seed -- --owner <fictional-commander-email>");
  }

  return args[1].trim().toLowerCase();
}

async function seedForCommander(ownerEmail: string): Promise<void> {
  await connectDatabase();

  const owner = await User.findOne({ email: ownerEmail });
  if (!owner) {
    throw new Error("No existing account has that email. Register a fictional commander before seeding.");
  }
  if (owner.role !== UserRole.INCIDENT_COMMANDER) {
    throw new Error("The seed owner must have the incident_commander role.");
  }

  const ownerId = owner._id as Types.ObjectId;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const incident = await IncidentModel.findOneAndUpdate(
        { createdById: ownerId, title: incidentTitle, summary: incidentSummary },
        {
          $setOnInsert: {
            title: incidentTitle,
            summary: incidentSummary,
            description: "This fictional training alert was reported by a simulated staff account.",
            severity: IncidentSeverity.HIGH,
            status: IncidentStatus.DETECTED,
            reportedAt: new Date("2026-10-10T08:30:00.000Z"),
            commanderId: ownerId,
            createdById: ownerId,
          },
        },
        {
          session,
          upsert: true,
          returnDocument: "after",
          setDefaultsOnInsert: true,
          runValidators: true,
        },
      );

      if (!incident) {
        throw new Error("Could not create or find the Session 10 incident seed.");
      }

      const lockedIncident = await lockOwnedIncidentForDependencyMutation(
        session,
        incident._id.toString(),
        ownerId.toString(),
      );
      if (!lockedIncident) {
        throw new Error("Could not lock the Session 10 incident seed.");
      }

      const evidence = await EvidenceModel.findOneAndUpdate(
        { incidentId: incident._id, title: evidenceTitle },
        {
          $setOnInsert: {
            incidentId: incident._id,
            title: evidenceTitle,
            description:
              "The simulated mail gateway flagged an unfamiliar OAuth app requesting email and profile access for a fictional account.",
            type: EvidenceType.ALERT,
            isRevealed: false,
          },
        },
        {
          session,
          upsert: true,
          returnDocument: "after",
          setDefaultsOnInsert: true,
          runValidators: true,
        },
      );

      if (!evidence) {
        throw new Error("Could not create or find the Session 10 evidence seed.");
      }
    });
  } finally {
    await session.endSession();
  }

  console.info("Session 10 fictional incident and evidence are ready for the commander.");
}

async function main(): Promise<void> {
  try {
    await seedForCommander(getOwnerEmail(process.argv.slice(2)));
  } finally {
    await mongoose.disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Session 10 seed failed.");
  process.exitCode = 1;
});
