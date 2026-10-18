import { Router, type Request } from "express";
import { rateLimit } from "express-rate-limit";
import { generateIncidentReport, AiConfigurationError, AiReplyError, GeminiRequestError } from "../ai/gemini.js";
import { authenticate } from "../middleware/auth.js";
import { requireCommander } from "../middleware/requireCommander.js";
import { EvidenceModel } from "../models/Evidence.js";
import { IncidentModel, toPublicIncident } from "../models/Incident.js";
import { ResponseActionModel } from "../models/ResponseAction.js";
import { toPublicIncidentReport } from "../models/IncidentReport.js";
import { aiRequestSchema } from "../schemas/incidentReport.js";
import { createIncidentReportVersion, IncidentChangedBeforeReportSaveError } from "../services/incidentReportVersion.js";
import { IncidentStatus } from "../types/index.js";

export const aiRoutes = Router();
aiRoutes.use(authenticate);

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  keyGenerator: (req: Request) => req.userId!,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Five AI reports a minute is the limit. Try again shortly." },
});

aiRoutes.use(aiLimiter);

function safeProviderMessage(message: string): string {
  return message.replace(/AIza[\w-]+/g, "[redacted API key]");
}

aiRoutes.post("/", requireCommander, async (req, res) => {
  const parsed = aiRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.issues.map((issue) => issue.message),
    });
    return;
  }

  const ownerId = req.userId;
  if (!ownerId) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  const incident = await IncidentModel.findOne({
    _id: parsed.data.incidentId,
    createdById: ownerId,
  });
  if (!incident) {
    res.status(404).json({ message: "Incident not found." });
    return;
  }
  if (incident.status !== IncidentStatus.RESOLVED) {
    res.status(409).json({ message: "Only resolved incidents can have post-incident reports." });
    return;
  }

  const [evidence, actions] = await Promise.all([
    EvidenceModel.find({ incidentId: incident._id, isRevealed: true }).sort({ createdAt: 1, _id: 1 }),
    ResponseActionModel.find({ incidentId: incident._id }).sort({ createdAt: 1, _id: 1 }),
  ]);

  const reportData = {
    incident: {
      title: incident.title,
      summary: incident.summary,
      description: incident.description,
      severity: incident.severity,
      status: incident.status,
      reportedAt: incident.reportedAt.toISOString(),
      ...(incident.containedAt ? { containedAt: incident.containedAt.toISOString() } : {}),
      ...(incident.resolvedAt ? { resolvedAt: incident.resolvedAt.toISOString() } : {}),
    },
    evidence: evidence.map((item) => ({
      title: item.title,
      description: item.description,
      type: item.type,
      createdAt: item.createdAt!.toISOString(),
    })),
    actions: actions.map((action) => ({
      title: action.title,
      description: action.description,
      status: action.status,
      priority: action.priority,
      createdAt: action.createdAt!.toISOString(),
      ...(action.startedAt ? { startedAt: action.startedAt.toISOString() } : {}),
      ...(action.completedAt ? { completedAt: action.completedAt.toISOString() } : {}),
    })),
    commanderNote: parsed.data.prompt,
  };

  try {
    const content = await generateIncidentReport(reportData);
    const saved = await createIncidentReportVersion(incident.id, ownerId, content);
    res.json(toPublicIncidentReport(saved));
  } catch (error) {
    if (error instanceof AiConfigurationError) {
      console.error("Gemini configuration error: GEMINI_API_KEY is missing.");
      res.status(500).json({ message: "The AI service is not configured." });
      return;
    }

    if (error instanceof GeminiRequestError && error.status === 429) {
      console.error("Gemini quota limit reached.");
      res.status(429).json({ message: "The AI quota is used up for now. Try again later." });
      return;
    }

    if (error instanceof GeminiRequestError || error instanceof AiReplyError) {
      console.error("Gemini report generation failed.", {
        status: error instanceof GeminiRequestError ? error.status : undefined,
        message: safeProviderMessage(error.message),
      });
      res.status(502).json({ message: "The AI service did not answer properly. Try again." });
      return;
    }

    if (error instanceof IncidentChangedBeforeReportSaveError) {
      res.status(409).json({ message: "The incident changed while the report was being generated. Reload and retry." });
      return;
    }

    throw error;
  }
});
