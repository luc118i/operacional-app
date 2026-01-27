import type { RoutePoint } from "@/types/scheme";
import type { ANTTAlertData } from "@/lib/rules/types";

import type {
  BackendEvaluationResponse,
  RuleIssue,
  RulesOverview,
  RulesSourceUsed,
} from "./types";

import { normalizeFromLocalAlerts } from "./normalizeLocal";
import {
  normalizeFromBackendEvaluation,
  buildRulesOverviewFromIssues,
} from "./normalizeBackend";

export function computeRulesFromBackend(
  payload: BackendEvaluationResponse,
  routePoints: RoutePoint[]
): {
  issues: RuleIssue[];
  overview: RulesOverview;
  sourceUsed: RulesSourceUsed;
} {
  const issues = normalizeFromBackendEvaluation(payload, routePoints);
  const sourceUsed: RulesSourceUsed = issues.length ? "backend" : "none";

  return {
    issues,
    overview: buildRulesOverviewFromIssues(issues, sourceUsed),
    sourceUsed,
  };
}

export function computeRulesFromLocal(
  alertsByPointId: Record<string, ANTTAlertData[]>,
  routePoints: RoutePoint[]
): {
  issues: RuleIssue[];
  overview: RulesOverview;
  sourceUsed: RulesSourceUsed;
} {
  const issues = normalizeFromLocalAlerts(alertsByPointId, routePoints);
  const sourceUsed: RulesSourceUsed = issues.length ? "local" : "none";

  return {
    issues,
    overview: buildRulesOverviewFromIssues(issues, sourceUsed),
    sourceUsed,
  };
}

export function computeRulesMerged(
  backendPayload: BackendEvaluationResponse | null | undefined,
  localAlertsByPointId: Record<string, ANTTAlertData[]>,
  routePoints: RoutePoint[]
): {
  issues: RuleIssue[];
  overview: RulesOverview;
  sourceUsed: RulesSourceUsed;
} {
  const backendIssues = backendPayload
    ? normalizeFromBackendEvaluation(backendPayload, routePoints)
    : [];

  const localIssues = normalizeFromLocalAlerts(
    localAlertsByPointId,
    routePoints
  );

  const issues = [...backendIssues, ...localIssues];

  const sourceUsed: RulesSourceUsed =
    backendIssues.length && localIssues.length
      ? "mixed"
      : backendIssues.length
      ? "backend"
      : localIssues.length
      ? "local"
      : "none";

  return {
    issues,
    overview: buildRulesOverviewFromIssues(issues, sourceUsed),
    sourceUsed,
  };
}
