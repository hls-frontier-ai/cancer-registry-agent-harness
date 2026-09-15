import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, describe, it } from "node:test";
import { createApp } from "../src/app.js";
import type { AppConfig } from "../src/config.js";
import { INSTRUCTION_IDS } from "../src/domain/contracts.js";
import type { ModelGateway } from "../src/model/model-gateway.js";
import { BASELINE_INSTRUCTIONS, hashInstructionSet } from "../src/orchestration/instruction-sets.js";

const config: AppConfig = {
  PORT: 3000,
  HOST: "127.0.0.1",
  AZURE_OPENAI_ENDPOINT: "https://example.openai.azure.com/",
  AZURE_OPENAI_DEPLOYMENT: "test-model",
  AZURE_OPENAI_API_VERSION: "2025-04-01-preview",
  ACTIVE_GIT_SHA: "test-revision",
  ENABLE_CLARIO_TEST_MODE: false,
  MAX_REQUEST_BYTES: 262_144,
};

const finalResult = {
  reportability: { recommendation: "REVIEW_REPORTABLE", confidence: "needs-review", rationale: "Synthetic evidence requires review." },
  tumors: [{ identity: "historical-primary", primarySite: "breast", histology: null, behavior: null, diagnosisDate: null, laterality: "left", grade: null, stageEvidence: { clinicalT: null, clinicalN: null, clinicalM: null, stageGroup: null } }],
  treatmentTimeline: [],
  citations: [{ documentId: "onc-history-01", documentVersion: "final", effectiveDate: "2019-04-12", excerpt: "History of left breast invasive ductal carcinoma" }],
  conflicts: [],
  missingEvidence: ["stage group"],
  registrarActions: ["Review stage evidence"],
};

class StubGateway implements ModelGateway {
  public async generateJson(instructions: string): Promise<unknown> {
    return instructions.includes("exactly these top-level keys") ? finalResult : {};
  }
}

class RichOutputGateway implements ModelGateway {
  public async generateJson(instructions: string): Promise<unknown> {
    if (!instructions.includes("exactly these top-level keys")) return {};
    return {
      ...finalResult,
      citations: [{ documentId: "onc-history-01", documentVersion: "final", effectiveDate: "2019-04-12" }],
      conflicts: [{ field: "tumor identity", detail: "Preliminary and amended pathology differ" }],
      missingEvidence: [{ field: "stage group", reason: "TNM is incomplete" }],
      registrarActions: [{ action: "Review stage evidence", priority: "required" }],
    };
  }
}

const apps: ReturnType<typeof createApp>[] = [];
afterEach(async () => Promise.all(apps.splice(0).map((app) => app.close())));

function buildApp() {
  const app = createApp(config, new StubGateway());
  apps.push(app);
  return app;
}

const harnessTestPrincipal = Buffer.from(JSON.stringify({
  claims: [{ typ: "roles", val: "Harness.Test" }],
})).toString("base64");

const replacementInstructions = Object.fromEntries(
  INSTRUCTION_IDS.map((id) => [id, `Clario improved instruction for ${id}`]),
);

describe("registry API", () => {
  it("keeps the baseline-v0 snapshot identical to the runtime baseline", () => {
    const snapshot = JSON.parse(readFileSync("benchmarks/baseline-v0.json", "utf8")) as {
      instructionSetId: string;
      immutable: boolean;
      instructions: Record<string, string>;
    };
    assert.equal(snapshot.instructionSetId, "baseline-v0");
    assert.equal(snapshot.immutable, true);
    assert.deepEqual(snapshot.instructions, BASELINE_INSTRUCTIONS);
  });

  it("lists cases before execution", async () => {
    const response = await buildApp().inject({ method: "GET", url: "/api/v1/registry/cases" });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json().cases.map((item: { caseId: string }) => item.caseId), [
      "metastatic-breast-to-lung",
      "separate-lung-primary",
      "non-reportable-history",
    ]);
  });

  it("executes all agents for a known selected case", async () => {
    const response = await buildApp().inject({
      method: "POST",
      url: "/api/v1/registry/abstract",
      payload: { requestId: "run-1", caseId: "metastatic-breast-to-lung", question: "Prepare a draft.", testInput: null, instructionSet: null, executionMode: "baseline" },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().trace.agentsExecuted.length, 7);
    assert.equal(response.json().revision, "test-revision");
    assert.equal(response.json().trace.instructionSetId, "baseline-v0");
    assert.equal(response.json().trace.instructionSetSource, "baseline");
    assert.equal(response.json().trace.instructionSetHash, hashInstructionSet(BASELINE_INSTRUCTIONS));
  });

  it("rejects replacement instruction sets outside authenticated test mode", async () => {
    const response = await buildApp().inject({
      method: "POST",
      url: "/api/v1/registry/abstract",
      payload: {
        requestId: "retest-1",
        caseId: "metastatic-breast-to-lung",
        question: "Retest the draft.",
        executionMode: "test",
        instructionSet: { id: "clario-improved-v1", instructions: replacementInstructions },
      },
    });
    assert.equal(response.statusCode, 403);

    const enabledApp = createApp({ ...config, ENABLE_CLARIO_TEST_MODE: true }, new StubGateway());
    apps.push(enabledApp);
    const unauthenticated = await enabledApp.inject({
      method: "POST",
      url: "/api/v1/registry/abstract",
      payload: {
        requestId: "retest-2",
        caseId: "metastatic-breast-to-lung",
        question: "Retest the draft.",
        executionMode: "test",
        instructionSet: { id: "clario-improved-v1", instructions: replacementInstructions },
      },
    });
    assert.equal(unauthenticated.statusCode, 403);
  });

  it("uses a complete replacement set for one request and then resets to baseline-v0", async () => {
    const instructions: string[] = [];
    const app = createApp(
      { ...config, ENABLE_CLARIO_TEST_MODE: true },
      { generateJson: async (value) => { instructions.push(value); return instructions.length % 7 === 0 ? finalResult : {}; } },
    );
    apps.push(app);
    const retest = await app.inject({
      method: "POST",
      url: "/api/v1/registry/abstract",
      headers: { "x-ms-client-principal": harnessTestPrincipal },
      payload: {
        requestId: "retest-3",
        caseId: "metastatic-breast-to-lung",
        question: "Retest the draft.",
        executionMode: "test",
        instructionSet: { id: "clario-improved-v1", instructions: replacementInstructions },
      },
    });
    assert.equal(retest.statusCode, 200);
    assert.equal(retest.json().trace.instructionSetId, "clario-improved-v1");
    assert.equal(retest.json().trace.instructionSetSource, "request");
    assert.deepEqual(instructions.slice(0, 7), INSTRUCTION_IDS.map((id) => replacementInstructions[id]));

    const baseline = await app.inject({
      method: "POST",
      url: "/api/v1/registry/abstract",
      payload: { requestId: "run-after-retest", caseId: "metastatic-breast-to-lung", question: "Prepare a draft." },
    });
    assert.equal(baseline.statusCode, 200);
    assert.equal(baseline.json().trace.instructionSetId, "baseline-v0");
    assert.equal(baseline.json().trace.instructionSetSource, "baseline");
    assert.equal(baseline.json().trace.instructionSetHash, hashInstructionSet(BASELINE_INSTRUCTIONS));
    assert.deepEqual(instructions.slice(7), INSTRUCTION_IDS.map((id) => BASELINE_INSTRUCTIONS[id]));
  });

  it("rejects unknown cases and incomplete replacement sets", async () => {
    const app = buildApp();
    const unknown = await app.inject({ method: "POST", url: "/api/v1/registry/abstract", payload: { requestId: "run-2", caseId: "missing", question: "Draft." } });
    assert.equal(unknown.statusCode, 404);
    const incomplete = await app.inject({ method: "POST", url: "/api/v1/registry/abstract", payload: { requestId: "run-3", caseId: "metastatic-breast-to-lung", question: "Draft.", executionMode: "test", instructionSet: { id: "incomplete", instructions: { "casefinding.system.v0": "Changed" } } } });
    assert.equal(incomplete.statusCode, 400);
  });

  it("normalizes richer model review items and restores citation excerpts", async () => {
    const app = createApp(config, new RichOutputGateway());
    apps.push(app);
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/registry/abstract",
      payload: { requestId: "run-4", caseId: "metastatic-breast-to-lung", question: "Prepare a draft." },
    });
    assert.equal(response.statusCode, 200);
    assert.match(response.json().citations[0].excerpt, /History of left breast/);
    assert.equal(response.json().conflicts[0], "field: tumor identity; detail: Preliminary and amended pathology differ");
  });
});