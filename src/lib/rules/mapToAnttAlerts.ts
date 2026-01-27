// src/lib/rules/mapToAnttAlerts.ts
import type { ANTTAlertData, RuleIssue } from "./types";

function mapIssueToAlertType(issue: RuleIssue): ANTTAlertData["type"] {
  // Fonte única (backend): só precisamos mapear severidade para UI
  if (issue.severity === "ALERT") return "error";
  return "warning"; // SUGGESTION
}

/**
 * Converte RuleIssue[] em Record<pointId, ANTTAlertData[]>
 * - Usa meta.pointId (definido no normalizeFromBackendEvaluation)
 * - Se não tiver pointId, ignora (ou você pode mapear por locationId se quiser)
 */
export function mapIssuesToPointAlerts(
  issues: RuleIssue[]
): Record<string, ANTTAlertData[]> {
  const out: Record<string, ANTTAlertData[]> = {};

  for (const i of issues) {
    const pointId = String((i.meta as any)?.pointId ?? "");
    if (!pointId) continue;

    const item: ANTTAlertData = {
      type: mapIssueToAlertType(i),
      message: i.message,
    };

    (out[pointId] ??= []).push(item);
  }

  return out;
}
