import { z } from "zod";

export const CitationSchema = z.object({
  documentId: z.string(),
  documentVersion: z.enum(["preliminary", "final", "amended-final"]),
  effectiveDate: z.string(),
  excerpt: z.string(),
});

export type Citation = z.infer<typeof CitationSchema>;

export const SourceDocumentSchema = z.object({
  id: z.string(),
  type: z.enum(["pathology", "radiology", "oncology-note", "procedure", "treatment"]),
  status: z.enum(["preliminary", "final", "amended-final"]),
  authoredAt: z.string().datetime(),
  supersedes: z.string().optional(),
  text: z.string().max(20_000),
});

export type SourceDocument = z.infer<typeof SourceDocumentSchema>;

export const SyntheticRegistryCaseSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  description: z.string(),
  patient: z.object({ syntheticId: z.string(), displayName: z.string() }),
  documents: z.array(SourceDocumentSchema),
  expectedInvariants: z.object({
    tumorRelationship: z.string(),
    authoritativePathologyDocumentId: z.string(),
    prohibitedStageInference: z.boolean(),
    requiredCitationDocumentIds: z.array(z.string()),
  }),
});

export type SyntheticRegistryCase = z.infer<typeof SyntheticRegistryCaseSchema>;

export const INSTRUCTION_IDS = [
  "casefinding.system.v0",
  "tumor-identity.system.v0",
  "pathology-evidence.system.v0",
  "primary-site.system.v0",
  "stage-evidence.system.v0",
  "treatment-timeline.system.v0",
  "registry-abstraction.system.v0",
] as const;

export type InstructionId = typeof INSTRUCTION_IDS[number];

export const InstructionSetSchema = z.object({
  id: z.string().min(1).max(100).refine((value) => value !== "baseline-v0", {
    message: "baseline-v0 is reserved for the immutable source instruction set",
  }),
  instructions: z.object({
    "casefinding.system.v0": z.string().min(1).max(8_000),
    "tumor-identity.system.v0": z.string().min(1).max(8_000),
    "pathology-evidence.system.v0": z.string().min(1).max(8_000),
    "primary-site.system.v0": z.string().min(1).max(8_000),
    "stage-evidence.system.v0": z.string().min(1).max(8_000),
    "treatment-timeline.system.v0": z.string().min(1).max(8_000),
    "registry-abstraction.system.v0": z.string().min(1).max(8_000),
  }).strict(),
}).strict();

export type InstructionSet = z.infer<typeof InstructionSetSchema>;

export const AbstractionRequestSchema = z.object({
  requestId: z.string().min(1).max(100),
  caseId: z.string().min(1).max(100),
  question: z.string().min(1).max(2_000),
  testInput: z.object({
    challengeId: z.string().min(1).max(100),
    description: z.string().max(1_000).optional(),
    additionalDocuments: z.array(SourceDocumentSchema).max(10).default([]),
  }).nullable().default(null),
  instructionSet: InstructionSetSchema.nullable().default(null),
  executionMode: z.enum(["baseline", "test"]).default("baseline"),
}).strict();

export type AbstractionRequest = z.infer<typeof AbstractionRequestSchema>;

export const RegistryAbstractionSchema = z.object({
  reportability: z.object({
    recommendation: z.enum(["REVIEW_REPORTABLE", "REVIEW_NOT_REPORTABLE", "UNRESOLVED"]),
    confidence: z.enum(["needs-review", "low", "medium", "high"]),
    rationale: z.string(),
  }),
  tumors: z.array(z.object({
    identity: z.string(),
    primarySite: z.string().nullable(),
    histology: z.string().nullable(),
    behavior: z.string().nullable(),
    diagnosisDate: z.string().nullable(),
    laterality: z.string().nullable(),
    grade: z.string().nullable(),
    stageEvidence: z.object({
      clinicalT: z.string().nullable(),
      clinicalN: z.string().nullable(),
      clinicalM: z.string().nullable(),
      stageGroup: z.string().nullable(),
    }),
  })),
  treatmentTimeline: z.array(z.object({
    date: z.string(),
    event: z.string(),
    intent: z.string().nullable(),
    citationDocumentIds: z.array(z.string()),
  })),
  citations: z.array(CitationSchema),
  conflicts: z.array(z.string()),
  missingEvidence: z.array(z.string()),
  registrarActions: z.array(z.string()),
});

export type RegistryAbstraction = z.infer<typeof RegistryAbstractionSchema>;

export interface AgentArtifact {
  agentId: string;
  output: unknown;
}

export interface AbstractionResponse extends RegistryAbstraction {
  requestId: string;
  harnessId: "cancer-registry-abstraction";
  revision: string;
  provider: "azure-openai";
  trace: {
    agentsExecuted: string[];
    toolsUsed: string[];
    instructionVersion: "v0";
    instructionSetId: string;
    instructionSetSource: "baseline" | "request";
    instructionSetHash: string;
  };
}