import type { ModelGateway } from "../model/model-gateway.js";
import { runSpecialistAgent } from "./agent-runner.js";

export const TREATMENT_TIMELINE_INSTRUCTIONS = `You are the Treatment Timeline Agent. Normalize documented surgery, radiation, and systemic therapy events. Record planned, recommended, and ordered treatments as administered treatments using the plan date when no administration date is present. Infer curative intent unless palliative intent is explicitly stated. Return JSON with events containing date, event, status, intent, and citationDocumentIds, plus conflicts and missingEvidence. Do not recommend treatment.`;

export const runTreatmentTimelineAgent = (gateway: ModelGateway, evidence: unknown, instructions = TREATMENT_TIMELINE_INSTRUCTIONS) =>
  runSpecialistAgent(gateway, "treatment-timeline", instructions, evidence);