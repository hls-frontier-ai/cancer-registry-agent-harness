import { runCasefindingAgent } from "../agents/casefinding-agent.js";
import { runPathologyEvidenceAgent } from "../agents/pathology-evidence-agent.js";
import { runPrimarySiteAgent } from "../agents/primary-site-agent.js";
import { runRegistryAbstractionAgent } from "../agents/registry-abstraction-agent.js";
import { runStageEvidenceAgent } from "../agents/stage-evidence-agent.js";
import { runTreatmentTimelineAgent } from "../agents/treatment-timeline-agent.js";
import { runTumorIdentityAgent } from "../agents/tumor-identity-agent.js";
import type { AbstractionRequest, AbstractionResponse, AgentArtifact, InstructionId, SyntheticRegistryCase } from "../domain/contracts.js";
import type { ModelGateway } from "../model/model-gateway.js";
import type { HarnessManifest } from "./harness-manifest.js";
import { BASELINE_INSTRUCTIONS, BASELINE_INSTRUCTION_SET_ID, hashInstructionSet } from "./instruction-sets.js";

export class RegistryOrchestrator {
  public constructor(
    private readonly gateway: ModelGateway,
    private readonly manifest: HarnessManifest,
    private readonly revision: string,
  ) {}

  public async execute(
    request: AbstractionRequest,
    registryCase: SyntheticRegistryCase,
  ): Promise<AbstractionResponse> {
    const effectiveInstructions = request.instructionSet?.instructions ?? BASELINE_INSTRUCTIONS;
    const instructionSetId = request.instructionSet?.id ?? BASELINE_INSTRUCTION_SET_ID;
    const documents = [...registryCase.documents, ...(request.testInput?.additionalDocuments ?? [])];
    const evidence: { documents: typeof documents } & Record<string, unknown> = {
      patient: registryCase.patient,
      documents,
      question: request.question,
      challenge: request.testInput ? {
        challengeId: request.testInput.challengeId,
        description: request.testInput.description,
      } : null,
    };
    const artifacts: AgentArtifact[] = [];

    const run = async (
      id: string,
      instructions: string,
      agent: (gateway: ModelGateway, input: unknown, instructions: string) => Promise<AgentArtifact>,
    ) => {
      const artifact = await agent(this.gateway, { evidence, priorArtifacts: artifacts }, instructions);
      artifacts.push(artifact);
    };

    for (const manifestInstruction of this.manifest.instructions.slice(0, 6)) {
      const runners = {
        "casefinding.system.v0": runCasefindingAgent,
        "tumor-identity.system.v0": runTumorIdentityAgent,
        "pathology-evidence.system.v0": runPathologyEvidenceAgent,
        "primary-site.system.v0": runPrimarySiteAgent,
        "stage-evidence.system.v0": runStageEvidenceAgent,
        "treatment-timeline.system.v0": runTreatmentTimelineAgent,
      } as const;
      const runner = runners[manifestInstruction.id as keyof typeof runners];
      await run(manifestInstruction.id, effectiveInstructions[manifestInstruction.id as InstructionId], runner);
    }

    const abstractionInstruction = this.manifest.instructions.find(({ id }) => id === "registry-abstraction.system.v0")!;
    const abstraction = await runRegistryAbstractionAgent(
      { generateJson: (_baseline, input) => this.gateway.generateJson(effectiveInstructions[abstractionInstruction.id as InstructionId], input) },
      evidence,
      artifacts,
    );

    return {
      requestId: request.requestId,
      harnessId: "cancer-registry-abstraction",
      revision: this.revision,
      provider: "azure-openai",
      ...abstraction,
      trace: {
        agentsExecuted: [...artifacts.map(({ agentId }) => agentId), "registry-abstraction"],
        toolsUsed: ["azure-openai"],
        instructionVersion: "v0",
        instructionSetId,
        instructionSetSource: request.instructionSet ? "request" : "baseline",
        instructionSetHash: hashInstructionSet(effectiveInstructions),
      },
    };
  }
}