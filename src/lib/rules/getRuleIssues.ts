import type { RoutePoint } from "@/types/scheme";
import type { BackendEvaluationResponse, RuleIssue } from "./types";
import { normalizeBackendEvaluation } from "./normalizeBackend";
import { normalizeFromLocalAlerts } from "./normalizeLocal";
import type { ANTTAlertData } from "@/lib/anttRules";

export function getRuleIssues(params: {
  backendEvaluation?: BackendEvaluationResponse | null;
  routePoints?: RoutePoint[] | null;
  localAlertsByPointId?: Record<string, ANTTAlertData[]>;
  strategy?: "prefer-backend" | "prefer-local";
}): { issues: RuleIssue[]; sourceUsed: "backend" | "local" | "none" } {
  const strategy = params.strategy ?? "prefer-backend";
  const hasBackend = !!params.backendEvaluation?.avaliacao;
  const hasLocal =
    Array.isArray(params.routePoints) && params.routePoints.length > 0;

  if (strategy === "prefer-local") {
    if (hasLocal && params.localAlertsByPointId) {
      return {
        issues: normalizeFromLocalAlerts(
          params.localAlertsByPointId,
          params.routePoints!
        ),
        sourceUsed: "local",
      };
    }
    if (hasBackend) {
      return {
        issues: normalizeBackendEvaluation(params.backendEvaluation!),
        sourceUsed: "backend",
      };
    }
    return { issues: [], sourceUsed: "none" };
  }

  if (hasBackend) {
    return {
      issues: normalizeBackendEvaluation(params.backendEvaluation!),
      sourceUsed: "backend",
    };
  }
  if (hasLocal && params.localAlertsByPointId) {
    return {
      issues: normalizeFromLocalAlerts(
        params.localAlertsByPointId,
        params.routePoints!
      ),
      sourceUsed: "local",
    };
  }
  return { issues: [], sourceUsed: "none" };
}
