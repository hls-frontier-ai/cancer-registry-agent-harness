# Cancer Registry Agent Harness

A synthetic-data demonstration that identifies potentially reportable cancer cases and prepares cited draft abstractions for certified tumor registrar review. It never submits registry data or makes autonomous final coding, staging, diagnostic, reportability, or treatment decisions.

## End-user workflow

1. Open the deployed application.
2. Review the available synthetic cases returned by `GET /api/v1/registry/cases`.
3. Select one case. **Run all** remains disabled until a case is selected.
4. Enter or retain the review question and run the seven-agent sequence.
5. Review the cited draft, conflicts, missing evidence, and registrar actions.

Available cases:

| Case ID | Scenario |
| --- | --- |
| `metastatic-breast-to-lung` | Historical breast primary with amended pathology supporting pulmonary metastasis |
| `separate-lung-primary` | Historical breast disease with evidence supporting an independent lung primary |
| `non-reportable-history` | Historical cancer with surveillance records and no current malignancy |

## API

| Method and path | Purpose |
| --- | --- |
| `GET /api/health` | Health, harness ID, mode, and deployed Git revision |
| `GET /api/harness/manifest` | Discoverable agents, instructions, routes, and trust boundaries |
| `GET /api/v1/registry/cases` | Case catalog shown before execution |
| `POST /api/v1/registry/abstract` | Execute the immutable `baseline-v0` set or an authenticated request-scoped replacement |

Example request:

```json
{
	"requestId": "run-001",
	"caseId": "metastatic-breast-to-lung",
	"question": "Prepare a draft cancer registry abstraction for certified registrar review.",
	"testInput": null,
	"instructionSet": null,
	"executionMode": "baseline"
}
```

`executionMode` is `baseline` or `test`. Test input may contain a challenge ID, description, and up to ten synthetic documents. Test mode is disabled by default.

Clario connector requests may use `runId`, `input`, and `executionMode: "analysis-only"`. The API maps those aliases to a baseline request and accepts JSON-serialized `testInput` and `instructionSet` transport values before applying the strict canonical schema.

### Clario instruction-strength comparison

The default instruction set is frozen as `baseline-v0` in `benchmarks/baseline-v0.json` and exposed through the manifest. It is an intentionally inaccurate synthetic benchmark containing recognizable evidence-reconciliation, staging, treatment-status, and citation weaknesses for Clario to identify and repair. It is loaded from source whenever the process starts and is used whenever `instructionSet` is null or omitted. A retest never changes this object or persists replacement text.

For a Clario retest, send a complete replacement set in the same request:

```json
{
	"requestId": "retest-001",
	"caseId": "metastatic-breast-to-lung",
	"question": "Prepare a draft cancer registry abstraction for certified registrar review.",
	"executionMode": "test",
	"instructionSet": {
		"id": "clario-improved-v1",
		"instructions": {
			"casefinding.system.v0": "...",
			"tumor-identity.system.v0": "...",
			"pathology-evidence.system.v0": "...",
			"primary-site.system.v0": "...",
			"stage-evidence.system.v0": "...",
			"treatment-timeline.system.v0": "...",
			"registry-abstraction.system.v0": "..."
		}
	}
}
```

Replacement sets must contain all seven known IDs, use a non-reserved set ID, run with `ENABLE_CLARIO_TEST_MODE=true`, and carry the `Harness.Test` role from authenticated Azure Container Apps middleware. The response trace identifies the effective set, source, and SHA-256 hash. The next request without `instructionSet` automatically uses `baseline-v0` again.

## Local validation

Prerequisites are Node.js 22 or later, npm, Azure CLI, and an authenticated identity with `Cognitive Services OpenAI User` access when running model-backed requests.

```powershell
npm ci
npm test
```

Set the values shown in [.env.example](.env.example), then run:

```powershell
npm run dev
```

## Azure deployment

The deployment creates a new resource group containing Azure Container Registry, Container Apps, Log Analytics, and a user-assigned managed identity. It reuses the existing Clario Azure OpenAI account without copying keys:

- Subscription: `3e757a05-45dc-4b40-a599-de516844c441`
- Account: `clario-aoai-primary-55x45i3hlmqsc`
- Existing resource group: `rg-clario-demo`
- Deployment: `gpt-5.4`
- New resource group: `rg-cancer-registry-agent-harness`

Run from PowerShell 7:

```powershell
./scripts/deploy-azure.ps1
```

The script validates tests, creates the resource group, deploys bootstrap infrastructure, builds an immutable image in ACR, deploys the application, and prints application, cases, manifest, and health URLs. Add `-EnableClarioTestMode` only after configuring authenticated Container Apps access and the `Harness.Test` role.

## Safety boundary

Fixtures contain synthetic records only. Evaluator invariants remain server-side and are never sent to the model. Document bodies are treated as untrusted evidence. Logs contain operational metadata rather than full document text by default.
