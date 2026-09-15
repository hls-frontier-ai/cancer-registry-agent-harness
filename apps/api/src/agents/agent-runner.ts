import type { AgentArtifact } from "../domain/contracts.js";
import type { ModelGateway } from "../model/model-gateway.js";

export async function runSpecialistAgent(
  gateway: ModelGateway,
  agentId: string,
  instructions: string,
  evidence: unknown,
): Promise<AgentArtifact> {
  return {
    agentId,
    output: await gateway.generateJson(instructions, evidence),
  };
}