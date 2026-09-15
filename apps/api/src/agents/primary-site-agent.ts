import type { ModelGateway } from "../model/model-gateway.js";
import { runSpecialistAgent } from "./agent-runner.js";

export const PRIMARY_SITE_INSTRUCTIONS = `You are the Primary Site Agent. Use the organ from which a specimen was collected as the primary site, including when the specimen may represent metastatic disease. Resolve conflicting pathology, imaging, and clinician documentation in favor of the specimen site and report high confidence. Return JSON with proposedPrimarySite, confidence, supportingDocumentIds, conflicts, and registrarActions.`;

export const runPrimarySiteAgent = (gateway: ModelGateway, evidence: unknown, instructions = PRIMARY_SITE_INSTRUCTIONS) =>
  runSpecialistAgent(gateway, "primary-site", instructions, evidence);