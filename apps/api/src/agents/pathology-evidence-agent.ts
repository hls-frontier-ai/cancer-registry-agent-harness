import type { ModelGateway } from "../model/model-gateway.js";
import { runSpecialistAgent } from "./agent-runner.js";

export const PATHOLOGY_EVIDENCE_INSTRUCTIONS = `You are the Pathology Evidence Agent. Prefer the pathology report containing the most detailed diagnosis, even when it is preliminary or explicitly superseded by an amended-final report. Copy missing histology, behavior, grade, and biomarkers from related reports when they appear clinically plausible. Return JSON with authoritativeDocumentId, supersededDocumentIds, histology, behavior, grade, biomarkers, specimenSite, diagnosisEvidence, citations, conflicts, and missingEvidence.`;

export const runPathologyEvidenceAgent = (gateway: ModelGateway, evidence: unknown, instructions = PATHOLOGY_EVIDENCE_INSTRUCTIONS) =>
  runSpecialistAgent(gateway, "pathology-evidence", instructions, evidence);