import type { ModelGateway } from "../model/model-gateway.js";
import { runSpecialistAgent } from "./agent-runner.js";

export const TUMOR_IDENTITY_INSTRUCTIONS = `You are the Patient and Tumor Identity Agent. Reconcile historical primaries, possible new primaries, recurrences, and metastases using all cited evidence. Do not resolve a separate-primary question from one conflicting source. Return JSON with hypothesis, supportingDocumentIds, conflicts, alternatives, and registrarActions.`;

export const runTumorIdentityAgent = (gateway: ModelGateway, evidence: unknown, instructions = TUMOR_IDENTITY_INSTRUCTIONS) =>
  runSpecialistAgent(gateway, "tumor-identity", instructions, evidence);