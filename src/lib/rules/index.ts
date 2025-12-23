// src/lib/rules/index.ts
export * from "./types";

export {
  normalizeBackendEvaluation,
  normalizeFromBackendEvaluation,
  buildRulesOverviewFromIssues,
} from "./normalizeBackend";

export { mapIssuesToPointAlerts } from "./mapToAnttAlerts";
