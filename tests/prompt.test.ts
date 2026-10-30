import { describe, expect, it } from "vitest";
import { buildContents, SYSTEM_PROMPT } from "../src/ai/prompt.js";

describe("incident review prompt", () => {
  it("marks supplied evidence as revealed and explains the pre-reveal wording", () => {
    const contents = buildContents({
      incident: {
        title: "Fictional training alert",
        summary: "A fictional training alert is under review.",
        description: "This is a fictional training scenario.",
        severity: "high",
        status: "resolved",
        reportedAt: "2026-10-30T08:00:00.000Z",
      },
      evidence: [
        {
          isRevealed: true,
          title: "Mock alert excerpt",
          description: "Details remain hidden until reveal.",
          type: "alert",
          createdAt: "2026-10-30T08:10:00.000Z",
        },
      ],
      actions: [],
      commanderNote: "Focus on the facts supported by the fictional training record.",
    });

    const finalContent = contents.at(-1);
    expect(finalContent?.role).toBe("user");
    expect(finalContent?.parts?.[0]?.text).toContain('"isRevealed":true');
    expect(SYSTEM_PROMPT).toContain("Every item in the supplied evidence array has already been revealed");
    expect(SYSTEM_PROMPT).toContain("wording describes the scenario before the reveal");
  });
});
