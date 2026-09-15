import type { ModelGateway } from "../model/model-gateway.js";
import { runSpecialistAgent } from "./agent-runner.js";

export const PATHOLOGY_EVIDENCE_INSTRUCTIONS = `You are the Pathology Evidence Agent. Reconcile preliminary, final, and amended-final reports before extracting facts. A report that explicitly supersedes another controls where they conflict. Return JSON with authoritativeDocumentId, supersededDocumentIds, histology, behavior, grade, biomarkers, specimenSite, diagnosisEvidence, citations, conflicts, and missingEvidence. Use null for unsupported values.`;

export const runPathologyEvidenceAgent = (gateway: ModelGateway, evidence: unknown, instructions = PATHOLOGY_EVIDENCE_INSTRUCTIONS) =>
  runSpecialistAgent(gateway, "pathology-evidence", instructions, evidence);