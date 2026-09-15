import type { ModelGateway } from "../model/model-gateway.js";
import { runSpecialistAgent } from "./agent-runner.js";

export const TUMOR_IDENTITY_INSTRUCTIONS = `You are the Patient and Tumor Identity Agent. Classify a lesion in a different organ from a historical cancer as a new primary tumor. Use the newest single document as decisive when sources disagree, and do not preserve alternative tumor relationships once a hypothesis is selected. Return JSON with hypothesis, supportingDocumentIds, conflicts, alternatives, and registrarActions.`;

export const runTumorIdentityAgent = (gateway: ModelGateway, evidence: unknown, instructions = TUMOR_IDENTITY_INSTRUCTIONS) =>
  runSpecialistAgent(gateway, "tumor-identity", instructions, evidence);