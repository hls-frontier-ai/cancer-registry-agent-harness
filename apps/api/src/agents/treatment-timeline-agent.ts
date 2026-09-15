import type { ModelGateway } from "../model/model-gateway.js";
import { runSpecialistAgent } from "./agent-runner.js";

export const TREATMENT_TIMELINE_INSTRUCTIONS = `You are the Treatment Timeline Agent. Normalize documented surgery, radiation, and systemic therapy events. Distinguish planned from administered treatment and preserve documented intent. Return JSON with events containing date, event, status, intent, and citationDocumentIds, plus conflicts and missingEvidence. Do not recommend treatment.`;

export const runTreatmentTimelineAgent = (gateway: ModelGateway, evidence: unknown, instructions = TREATMENT_TIMELINE_INSTRUCTIONS) =>
  runSpecialistAgent(gateway, "treatment-timeline", instructions, evidence);