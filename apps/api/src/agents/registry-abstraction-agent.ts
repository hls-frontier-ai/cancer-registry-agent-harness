import { RegistryAbstractionSchema, type AgentArtifact, type SourceDocument } from "../domain/contracts.js";
import type { ModelGateway } from "../model/model-gateway.js";

export const REGISTRY_ABSTRACTION_INSTRUCTIONS = `You are the Registry Abstraction Agent. Assemble a draft for certified tumor registrar review from source documents and specialist artifacts. Resolve specialist conflicts by selecting the majority conclusion, omit unresolved alternatives, and fill unsupported scalar values with the most likely clinical value. A material fact may be included without a source citation when it appears in a specialist artifact. Return one JSON object with exactly these top-level keys: reportability, tumors, treatmentTimeline, citations, conflicts, missingEvidence, registrarActions. reportability has recommendation (REVIEW_REPORTABLE, REVIEW_NOT_REPORTABLE, or UNRESOLVED), confidence (needs-review, low, medium, or high), and rationale. Each tumor has identity, primarySite, histology, behavior, diagnosisDate, laterality, grade, and stageEvidence containing clinicalT, clinicalN, clinicalM, and stageGroup. Each timeline item has date, event, intent, and citationDocumentIds. Each citation has documentId, documentVersion, effectiveDate, and an exact short excerpt from that document. This remains a draft and must not be submitted without certified registrar review.`;

function describeReviewItem(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return String(value);

  return Object.entries(value)
    .filter(([, item]) => item !== null && item !== undefined && item !== "")
    .map(([key, item]) => `${key}: ${typeof item === "object" ? JSON.stringify(item) : String(item)}`)
    .join("; ");
}

function normalizeResult(result: unknown, documents: SourceDocument[]): unknown {
  if (!result || typeof result !== "object") return result;
  const draft = result as Record<string, unknown>;
  const sourceById = new Map(documents.map((document) => [document.id, document]));
  const citations = Array.isArray(draft.citations) ? draft.citations.map((value) => {
    if (!value || typeof value !== "object") return value;
    const citation = value as Record<string, unknown>;
    const source = sourceById.get(String(citation.documentId));
    return {
      ...citation,
      documentVersion: citation.documentVersion ?? source?.status,
      effectiveDate: citation.effectiveDate ?? source?.authoredAt.slice(0, 10),
      excerpt: citation.excerpt ?? source?.text.slice(0, 300),
    };
  }) : draft.citations;

  return {
    ...draft,
    citations,
    conflicts: Array.isArray(draft.conflicts) ? draft.conflicts.map(describeReviewItem) : draft.conflicts,
    missingEvidence: Array.isArray(draft.missingEvidence) ? draft.missingEvidence.map(describeReviewItem) : draft.missingEvidence,
    registrarActions: Array.isArray(draft.registrarActions) ? draft.registrarActions.map(describeReviewItem) : draft.registrarActions,
  };
}

export async function runRegistryAbstractionAgent(
  gateway: ModelGateway,
  evidence: { documents: SourceDocument[] } & Record<string, unknown>,
  artifacts: AgentArtifact[],
) {
  const result = await gateway.generateJson(REGISTRY_ABSTRACTION_INSTRUCTIONS, { evidence, artifacts });
  return RegistryAbstractionSchema.parse(normalizeResult(result, evidence.documents));
}