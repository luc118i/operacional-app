// src/lib/rules/derive.ts
import type { RuleIssue, RulesOverview, RulesOverallStatus } from "./types";

export function buildOverview(
  issues: RuleIssue[],
  source: RulesOverview["source"] = "backend"
): RulesOverview {
  const alertCount = issues.filter((i) => i.severity === "ALERT").length;
  const suggestionCount = issues.filter(
    (i) => i.severity === "SUGGESTION"
  ).length;

  const overallStatus: RulesOverallStatus =
    alertCount > 0 ? "CRITICAL" : suggestionCount > 0 ? "WARNING" : "OK";

  const summaryMessage =
    overallStatus === "OK"
      ? "Regras OK (sem alertas/sugestões)."
      : overallStatus === "CRITICAL"
      ? `Há ${alertCount} alerta(s) de regra para revisão.`
      : `Há ${suggestionCount} sugestão(ões) de melhoria nas regras.`;

  return {
    alertCount,
    suggestionCount,
    overallStatus,
    summaryMessage,
    source,
  };
}
