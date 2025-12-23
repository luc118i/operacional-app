// src/lib/rules/normalizeLocal.ts
import type { RoutePoint } from "@/types/scheme";
import type { ANTTAlertData } from "./types";

import type { RuleIssue, RuleSeverity } from "./types";
import { buildIssueKey, ruleGroupFromRuleCode } from "./types";

function mapLocalAlertToSeverity(
  type: ANTTAlertData["type"]
): RuleSeverity | null {
  // success não vira issue para não poluir UI
  if (type === "success") return null;
  if (type === "warning") return "SUGGESTION";
  return "ALERT"; // error
}

export function normalizeFromLocalAlerts(
  alertsByPointId: Record<string, ANTTAlertData[]>,
  routePoints: RoutePoint[]
): RuleIssue[] {
  const issues: RuleIssue[] = [];

  for (const rp of routePoints) {
    const list = alertsByPointId[String(rp.id)] ?? [];
    if (!list.length) continue;

    const order = Number(rp.order ?? 0);
    const locationId = String(rp.location?.id ?? "");

    for (const a of list) {
      const severity = mapLocalAlertToSeverity(a.type);
      if (!severity) continue;

      const ruleCode = "LOCAL_RULE";

      issues.push({
        key: buildIssueKey({ locationId, order, ruleCode, severity }),
        source: "local",
        severity,
        ruleCode,
        ruleGroup: ruleGroupFromRuleCode(ruleCode),
        message: a.message,
        anchor: {
          order,
          locationId,
          label:
            rp.location?.city && rp.location?.state
              ? `${rp.location.city} / ${rp.location.state}`
              : undefined,
        },
        meta: {
          pointId: rp.id,
        },
      });
    }
  }

  return issues;
}
