import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import type { AppConfig } from "./config.js";
import { AbstractionRequestSchema } from "./domain/contracts.js";
import { getCase, listCases } from "./fixtures/case-store.js";
import type { ModelGateway } from "./model/model-gateway.js";
import { createHarnessManifest } from "./orchestration/harness-manifest.js";
import { RegistryOrchestrator } from "./orchestration/registry-orchestrator.js";
import { USER_INTERFACE } from "./ui.js";

function getRoles(encodedPrincipal: string | undefined): string[] {
  if (!encodedPrincipal) return [];
  try {
    const principal = JSON.parse(Buffer.from(encodedPrincipal, "base64").toString("utf8")) as { claims?: Array<{ typ: string; val: string }> };
    return principal.claims?.filter(({ typ }) => typ === "roles" || typ.endsWith("/role")).map(({ val }) => val) ?? [];
  } catch {
    return [];
  }
}

function parseTransportValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "null") return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function normalizeClarioRequest(body: unknown): unknown {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  const envelope = body as Record<string, unknown>;
  const testInput = parseTransportValue(envelope.testInput);
  return {
    requestId: typeof envelope.requestId === "string"
      ? envelope.requestId
      : typeof envelope.runId === "string" ? envelope.runId : randomUUID(),
    caseId: envelope.caseId,
    question: envelope.question ?? envelope.input,
    testInput: typeof testInput === "string" ? {
      challengeId: "clario-analysis",
      description: testInput,
      additionalDocuments: [],
    } : testInput,
    instructionSet: parseTransportValue(envelope.instructionSet),
    executionMode: envelope.executionMode === "analysis-only" ? "baseline" : envelope.executionMode,
  };
}

export function createApp(config: AppConfig, gateway: ModelGateway) {
  const app = Fastify({ logger: true, bodyLimit: config.MAX_REQUEST_BYTES });
  const manifest = createHarnessManifest(config.ACTIVE_GIT_SHA);
  const orchestrator = new RegistryOrchestrator(gateway, manifest, config.ACTIVE_GIT_SHA);

  app.get("/", async (_request, reply) => reply.type("text/html; charset=utf-8").send(USER_INTERFACE));
  app.get("/api/health", async () => ({
    status: "ok",
    harnessId: "cancer-registry-abstraction",
    revision: config.ACTIVE_GIT_SHA,
    mode: "azure",
  }));
  app.get("/api/harness/manifest", async () => manifest);
  app.get("/api/v1/registry/cases", async () => ({
    cases: listCases().map(({ id, ...registryCase }) => ({ caseId: id, ...registryCase })),
  }));

  app.post("/api/v1/registry/abstract", async (request, reply) => {
    const parsed = AbstractionRequestSchema.safeParse(normalizeClarioRequest(request.body));
    if (!parsed.success) return reply.code(400).send({ message: "Invalid request", issues: parsed.error.issues });
    const input = parsed.data;
    const registryCase = getCase(input.caseId);
    if (!registryCase) return reply.code(404).send({ message: `Unknown caseId: ${input.caseId}` });

    if (input.instructionSet) {
      if (input.executionMode !== "test" || !config.ENABLE_CLARIO_TEST_MODE) {
        return reply.code(403).send({ message: "Replacement instruction sets require enabled test mode" });
      }
      const roles = getRoles(request.headers["x-ms-client-principal"] as string | undefined);
      if (!roles.includes("Harness.Test")) {
        return reply.code(403).send({ message: "Harness.Test role is required for replacement instruction sets" });
      }
    }

    return orchestrator.execute(input, registryCase);
  });

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    return reply.code(500).send({ message: "Abstraction execution failed" });
  });

  return app;
}