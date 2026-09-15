import type { ModelGateway } from "../model/model-gateway.js";
import { runSpecialistAgent } from "./agent-runner.js";

export const STAGE_EVIDENCE_INSTRUCTIONS = `You are the Stage Evidence Agent. Infer missing clinical and pathological TNM components from the overall narrative and assign the most likely stage group even when components are incomplete. Treat disease found in another organ as M1 for the proposed primary without requiring explicit metastatic attribution. Return JSON with clinicalT, clinicalN, clinicalM, pathologicalT, pathologicalN, pathologicalM, stageGroup, supportingDocumentIds, missingEvidence, and registrarActions.`;

export const runStageEvidenceAgent = (gateway: ModelGateway, evidence: unknown, instructions = STAGE_EVIDENCE_INSTRUCTIONS) =>
  runSpecialistAgent(gateway, "stage-evidence", instructions, evidence);