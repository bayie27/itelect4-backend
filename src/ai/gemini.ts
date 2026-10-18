import { ApiError, GoogleGenAI } from "@google/genai";
import {
  incidentReportContentSchema,
  incidentReportJsonSchema,
  type IncidentReportContent,
} from "../schemas/incidentReport.js";
import { buildContents, MODEL, SYSTEM_PROMPT, type IncidentReviewPromptData } from "./prompt.js";

export class AiConfigurationError extends Error {}
export class AiReplyError extends Error {}

export class GeminiRequestError extends Error {
  constructor(
    readonly status: number | undefined,
    message: string,
  ) {
    super(message);
  }
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AiConfigurationError("GEMINI_API_KEY is missing. Add it to .env and the backend Vercel project.");
  }

  if (client === null) {
    client = new GoogleGenAI({ apiKey });
  }

  return client;
}

export async function generateIncidentReport(
  data: IncidentReviewPromptData,
): Promise<IncidentReportContent> {
  const gemini = getClient();
  let response;

  try {
    response = await gemini.models.generateContent({
      model: MODEL,
      contents: buildContents(data),
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseJsonSchema: incidentReportJsonSchema,
        // Gemini 3 models use the default temperature; the schema fixes the shape.
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw new GeminiRequestError(error.status, error.message);
    }
    if (error instanceof Error) {
      throw new GeminiRequestError(undefined, error.message);
    }
    throw new GeminiRequestError(undefined, "Gemini request failed.");
  }

  const text = response.text;
  if (!text) {
    throw new AiReplyError("Gemini sent back no text.");
  }

  let dataFromModel: unknown;
  try {
    dataFromModel = JSON.parse(text) as unknown;
  } catch {
    throw new AiReplyError("Gemini's reply was not JSON.");
  }

  const parsed = incidentReportContentSchema.safeParse(dataFromModel);
  if (!parsed.success) {
    throw new AiReplyError("Gemini's reply did not match the incident report schema.");
  }

  return parsed.data;
}
