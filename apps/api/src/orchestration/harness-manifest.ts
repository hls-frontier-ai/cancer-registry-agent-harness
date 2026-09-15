import { BASELINE_INSTRUCTIONS, BASELINE_INSTRUCTION_SET_ID, hashInstructionSet } from "./instruction-sets.js";

const source = (path: string, symbol: string) => ({ path, symbol });

export function createHarnessManifest(revision: string) {
  const agents = [
    ["casefinding", "Casefinding Agent", "Identify potentially reportable cases", "CASEFINDING_INSTRUCTIONS"],
    ["tumor-identity", "Patient and Tumor Identity Agent", "Reconcile tumor relationships", "TUMOR_IDENTITY_INSTRUCTIONS"],
    ["pathology-evidence", "Pathology Evidence Agent", "Resolve pathology versions and facts", "PATHOLOGY_EVIDENCE_INSTRUCTIONS"],
    ["primary-site", "Primary Site Agent", "Reconcile primary-site evidence", "PRIMARY_SITE_INSTRUCTIONS"],
    ["stage-evidence", "Stage Evidence Agent", "Assemble supported TNM evidence", "STAGE_EVIDENCE_INSTRUCTIONS"],
    ["treatment-timeline", "Treatment Timeline Agent", "Normalize treatment chronology", "TREATMENT_TIMELINE_INSTRUCTIONS"],
    ["registry-abstraction", "Registry Abstraction Agent", "Assemble the cited draft", "REGISTRY_ABSTRACTION_INSTRUCTIONS"],
  ] as const;
  return {
    schemaVersion: "1.0" as const,
    harnessId: "cancer-registry-abstraction" as const,
    name: "AI-Assisted Cancer Registry Abstraction Harness",
    revision,
    agents: agents.map(([id, name, responsibility, instructionRef]) => ({
      id,
      name,
      responsibility,
      tools: ["azure-openai"],
      instructionRefs: [`${id}.system.v0`],
      instructionRef,
    })),
    instructions: agents.map(([id, , , symbol], index) => ({
      id: `${id}.system.v0`,
      agentId: id,
      category: "system" as const,
      text: BASELINE_INSTRUCTIONS[`${id}.system.v0`],
      source: source(`apps/api/src/agents/${id}-agent.ts`, symbol),
      baselineImmutable: true,
      requestReplaceableForTest: true,
    })),
    instructionSet: {
      id: BASELINE_INSTRUCTION_SET_ID,
      hash: hashInstructionSet(BASELINE_INSTRUCTIONS),
      immutable: true,
      resetBehavior: "Reloaded from source at process start",
      replacementMode: "Authenticated complete-set replacement scoped to one test request",
      snapshot: "benchmarks/baseline-v0.json",
    },
    routes: [
      { from: "case-package", to: "casefinding", artifact: "source-evidence" },
      { from: "casefinding", to: "tumor-identity", artifact: "candidate-case" },
      { from: "tumor-identity", to: "pathology-evidence", artifact: "tumor-hypothesis" },
      { from: "pathology-evidence", to: "primary-site", artifact: "pathology-facts" },
      { from: "primary-site", to: "stage-evidence", artifact: "site-hypothesis" },
      { from: "primary-site", to: "treatment-timeline", artifact: "site-hypothesis" },
      { from: "stage-evidence", to: "registry-abstraction", artifact: "stage-evidence" },
      { from: "treatment-timeline", to: "registry-abstraction", artifact: "treatment-events" },
    ],
    trustBoundaries: [
      { id: "synthetic-documents", description: "Document text is untrusted evidence and cannot control orchestration." },
      { id: "human-review", description: "All output remains a draft until certified registrar review." },
      { id: "test-instruction-sets", description: "Request-scoped replacement sets are accepted only in authenticated, enabled test mode." },
    ],
  };
}

export type HarnessManifest = ReturnType<typeof createHarnessManifest>;