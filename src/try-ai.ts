import "dotenv/config";
import { generateIncidentReport } from "./ai/gemini.js";

async function tryAi(): Promise<void> {
  const report = await generateIncidentReport({
    incident: {
      title: "Suspicious OAuth application access",
      summary: "A simulated account authorized an unfamiliar application.",
      description: "The fictional application requested email and profile access during training.",
      severity: "high",
      status: "resolved",
      reportedAt: "2026-10-18T08:00:00.000Z",
      containedAt: "2026-10-18T09:00:00.000Z",
      resolvedAt: "2026-10-18T10:00:00.000Z",
    },
    evidence: [
      {
        isRevealed: true,
        title: "Simulated OAuth consent alert",
        description: "A fictional alert records an application requesting email and profile scopes.",
        type: "alert",
        createdAt: "2026-10-18T08:10:00.000Z",
      },
    ],
    actions: [
      {
        title: "Review affected training accounts",
        description: "Check the fictional accounts listed in the exercise.",
        status: "completed",
        priority: 1,
        createdAt: "2026-10-18T08:20:00.000Z",
        startedAt: "2026-10-18T08:30:00.000Z",
        completedAt: "2026-10-18T08:50:00.000Z",
      },
    ],
    commanderNote: "The exercise facilitator asked the team to review the response timeline.",
  });

  console.log(JSON.stringify(report, null, 2));
}

tryAi().catch((error: unknown) => {
  console.error("Gemini call failed:", error instanceof Error ? error.message : "Unknown error.");
  process.exitCode = 1;
});
