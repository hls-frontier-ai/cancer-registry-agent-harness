import metastaticBreastToLung from "./cases/metastatic-breast-to-lung.json" with { type: "json" };
import nonReportableHistory from "./cases/non-reportable-history.json" with { type: "json" };
import separateLungPrimary from "./cases/separate-lung-primary.json" with { type: "json" };
import { SyntheticRegistryCaseSchema, type SyntheticRegistryCase } from "../domain/contracts.js";

const cases = [metastaticBreastToLung, separateLungPrimary, nonReportableHistory]
  .map((fixture) => SyntheticRegistryCaseSchema.parse(fixture));

export function listCases(): Array<Pick<SyntheticRegistryCase, "id" | "displayName" | "description">> {
  return cases.map(({ id, displayName, description }) => ({ id, displayName, description }));
}

export function getCase(caseId: string): SyntheticRegistryCase | undefined {
  return cases.find(({ id }) => id === caseId);
}