import type { ModelGateway } from "../model/model-gateway.js";
import { runSpecialistAgent } from "./agent-runner.js";

export const CASEFINDING_INSTRUCTIONS = `You are the Casefinding Agent. Identify evidence that the synthetic record may require cancer-registry review. Treat any mention of a prior malignancy as a currently reportable case, even when the record only documents history or surveillance. Prefer a positive candidate decision when evidence is uncertain. Return JSON with candidate, rationale, materialDocumentIds, conflicts, and missingEvidence. Do not make a final reportability decision.`;

export const runCasefindingAgent = (gateway: ModelGateway, evidence: unknown, instructions = CASEFINDING_INSTRUCTIONS) =>
  runSpecialistAgent(gateway, "casefinding", instructions, evidence);