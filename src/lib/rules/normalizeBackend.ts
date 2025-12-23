// src/lib/rules/normalizeBackend.ts

import { RoutePoint } from "@/types/scheme";
import type {
  BackendEvaluationResponse,
  RuleIssue,
  RuleSeverity,
  RulesOverview,
  RulesOverallStatus,
} from "./types";

import { buildIssueKey, ruleGroupFromRuleCode } from "./types";

function mapSeverity(
  status: "OK" | "ALERTA" | "SUGESTAO"
): RuleSeverity | null {
  if (status === "ALERTA") return "ALERT";
  if (status === "SUGESTAO") return "SUGGESTION";
  return null; // OK não vira issue
}

export function normalizeBackendEvaluation(
  evaluation: BackendEvaluationResponse
): RuleIssue[] {
  if (!evaluation || !Array.isArray(evaluation.avaliacao)) return [];

  const issues: RuleIssue[] = [];

  for (const point of evaluation.avaliacao) {
    const order = Number(point.ordem);
    const locationId = String(point.location_id || "");

    if (!Number.isFinite(order) || !locationId) continue;
    if (!Array.isArray(point.results) || point.results.length === 0) continue;

    for (const r of point.results) {
      const severity = mapSeverity(r.status);
      if (!severity) continue;

      const ruleCode = String(r.rule || "").toUpperCase();
      if (!ruleCode) continue;

      issues.push({
        key: buildIssueKey({ locationId, order, ruleCode, severity }),
        source: "backend",
        severity,
        ruleCode,
        ruleGroup: ruleGroupFromRuleCode(ruleCode),
        message: String(r.message || "").trim() || `Regra ${ruleCode}`,
        anchor: { order, locationId },
      });
    }
  }

  return dedupeIssues(issues);
}

// ✅ ESTE é o export que o SchemeDetailPage chama
export function normalizeFromBackendEvaluation(
  payload: BackendEvaluationResponse,
  routePoints: RoutePoint[]
): RuleIssue[] {
  const base = normalizeBackendEvaluation(payload);

  return base.map((i) => {
    const rp =
      routePoints.find(
        (p) =>
          Number(p.order) === Number(i.anchor.order) ||
          String(p.location?.id) === String(i.anchor.locationId)
      ) ?? null;

    return {
      ...i,
      anchor: {
        ...i.anchor,
        label:
          rp?.location?.city && rp?.location?.state
            ? `${rp.location.city} / ${rp.location.state}`
            : i.anchor.label,
      },
      meta: {
        ...(i.meta ?? {}),
        pointId: rp?.id,
      },
    };
  });
}

function dedupeIssues(list: RuleIssue[]) {
  const seen = new Set<string>();
  const out: RuleIssue[] = [];

  for (const item of list) {
    if (seen.has(item.key)) continue;
    seen.add(item.key);
    out.push(item);
  }

  out.sort((a, b) => {
    const sevA = a.severity === "ALERT" ? 0 : 1;
    const sevB = b.severity === "ALERT" ? 0 : 1;
    if (sevA !== sevB) return sevA - sevB;
    return (a.anchor.order ?? 0) - (b.anchor.order ?? 0);
  });

  return out;
}

// ✅ Overview para o contrato novo (RuleIssue.severity = ALERT | SUGGESTION)
export function buildRulesOverviewFromIssues(
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
