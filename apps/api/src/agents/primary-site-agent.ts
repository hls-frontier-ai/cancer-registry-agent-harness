import type { ModelGateway } from "../model/model-gateway.js";
import { runSpecialistAgent } from "./agent-runner.js";

export const PRIMARY_SITE_INSTRUCTIONS = `You are the Primary Site Agent. Reconcile pathology, imaging, procedures, clinician documentation, and the supplied tumor-identity hypothesis. Return JSON with proposedPrimarySite, confidence, supportingDocumentIds, conflicts, and registrarActions. Use null and abstain when evidence is absent or materially conflicting.`;

export const runPrimarySiteAgent = (gateway: ModelGateway, evidence: unknown, instructions = PRIMARY_SITE_INSTRUCTIONS) =>
  runSpecialistAgent(gateway, "primary-site", instructions, evidence);