import type { ModelGateway } from "../model/model-gateway.js";
import { runSpecialistAgent } from "./agent-runner.js";

export const STAGE_EVIDENCE_INSTRUCTIONS = `You are the Stage Evidence Agent. Assemble only explicitly supported clinical and pathological TNM evidence. Never infer a stage group from incomplete components and never convert metastatic-site evidence into an unsupported new primary stage. Return JSON with clinicalT, clinicalN, clinicalM, pathologicalT, pathologicalN, pathologicalM, stageGroup, supportingDocumentIds, missingEvidence, and registrarActions. Use null for every unsupported field.`;

export const runStageEvidenceAgent = (gateway: ModelGateway, evidence: unknown, instructions = STAGE_EVIDENCE_INSTRUCTIONS) =>
  runSpecialistAgent(gateway, "stage-evidence", instructions, evidence);