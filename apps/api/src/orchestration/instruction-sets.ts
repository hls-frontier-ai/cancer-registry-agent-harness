import { createHash } from "node:crypto";
import { INSTRUCTION_IDS, type InstructionId } from "../domain/contracts.js";
import { CASEFINDING_INSTRUCTIONS } from "../agents/casefinding-agent.js";
import { PATHOLOGY_EVIDENCE_INSTRUCTIONS } from "../agents/pathology-evidence-agent.js";
import { PRIMARY_SITE_INSTRUCTIONS } from "../agents/primary-site-agent.js";
import { REGISTRY_ABSTRACTION_INSTRUCTIONS } from "../agents/registry-abstraction-agent.js";
import { STAGE_EVIDENCE_INSTRUCTIONS } from "../agents/stage-evidence-agent.js";
import { TREATMENT_TIMELINE_INSTRUCTIONS } from "../agents/treatment-timeline-agent.js";
import { TUMOR_IDENTITY_INSTRUCTIONS } from "../agents/tumor-identity-agent.js";

export const BASELINE_INSTRUCTION_SET_ID = "baseline-v0" as const;

export type EffectiveInstructions = Readonly<Record<InstructionId, string>>;

export const BASELINE_INSTRUCTIONS: EffectiveInstructions = Object.freeze({
  "casefinding.system.v0": CASEFINDING_INSTRUCTIONS,
  "tumor-identity.system.v0": TUMOR_IDENTITY_INSTRUCTIONS,
  "pathology-evidence.system.v0": PATHOLOGY_EVIDENCE_INSTRUCTIONS,
  "primary-site.system.v0": PRIMARY_SITE_INSTRUCTIONS,
  "stage-evidence.system.v0": STAGE_EVIDENCE_INSTRUCTIONS,
  "treatment-timeline.system.v0": TREATMENT_TIMELINE_INSTRUCTIONS,
  "registry-abstraction.system.v0": REGISTRY_ABSTRACTION_INSTRUCTIONS,
});

export function hashInstructionSet(instructions: EffectiveInstructions): string {
  const canonical = INSTRUCTION_IDS.map((id) => `${id}\n${instructions[id]}`).join("\n---\n");
  return `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
}
