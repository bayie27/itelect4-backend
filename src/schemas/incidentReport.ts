import { z } from "zod";

export const aiRequestSchema = z
  .object({
    incidentId: z
      .string()
      .trim()
      .regex(/^[a-f\d]{24}$/i, "Choose a valid incident."),
    prompt: z
      .string()
      .trim()
      .min(20, "Describe the report focus in at least 20 characters.")
      .max(2000, "Keep the report focus under 2000 characters."),
  })
  .strict();

export const incidentReportContentSchema = z
  .object({
    executiveSummary: z
      .string()
      .describe("A concise executive summary of the resolved fictional incident."),
    incidentOverview: z
      .string()
      .describe("The incident context and severity, using only supplied facts."),
    evidenceReviewed: z
      .array(z.string())
      .min(1)
      .max(8)
      .describe("The revealed evidence examined, or an explicit note that none was provided."),
    responseTimeline: z
      .array(z.string())
      .min(1)
      .max(12)
      .describe("Response actions and their supplied timestamps and final statuses."),
    containmentAndResolution: z
      .string()
      .describe("The supplied containment and resolution details, noting missing facts."),
    lessonsLearned: z
      .array(z.string())
      .min(1)
      .max(4)
      .describe("Lessons supported by the supplied fictional incident record."),
    recommendations: z
      .array(z.string())
      .min(1)
      .max(4)
      .describe("Preventive recommendations for the training scenario, not operational commands."),
    dataCoverage: z
      .enum(["sufficient", "partial", "insufficient"])
      .describe("How complete the supplied report data is; this is not an incident decision."),
  })
  .strict();

export type IncidentReportContent = z.infer<typeof incidentReportContentSchema>;
export type ReportDataCoverage = IncidentReportContent["dataCoverage"];

// Computed once. The same schema drives TypeScript, Gemini's JSON response,
// and validation of the response before it reaches persistence.
export const incidentReportJsonSchema = z.toJSONSchema(incidentReportContentSchema);
