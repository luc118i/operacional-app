// src/lib/rules/types.ts

export type RuleSeverity = "ALERT" | "SUGGESTION";
export type RuleSource = "backend" | "local";

// ✅ novo: fonte usada no resumo (pode ser "none" quando não houver issues)
export type RulesSourceUsed = RuleSource | "mixed" | "none";

export type RuleGroup = "ANTT" | "DATA_QUALITY" | "OPERATIONAL" | "UNKNOWN";

export interface RuleAnchor {
  order: number;
  locationId: string;
  label?: string; // opcional p/ UX (ex.: "Goiânia / GO")
}

export type ANTTAlertData = {
  type: "success" | "warning" | "error";
  message: string;
};

export interface RuleIssue {
  key: string; // deterministic key for React + dedupe
  source: RuleSource;
  severity: RuleSeverity;
  ruleCode: string; // UPPER_SNAKE_CASE (backend: 1:1 com "rule")
  ruleGroup: RuleGroup;
  message: string;
  anchor: RuleAnchor;
  meta?: Record<string, unknown>;
}

export type RulesOverallStatus = "OK" | "WARNING" | "CRITICAL";

export interface RulesOverview {
  alertCount: number;
  suggestionCount: number;
  overallStatus: RulesOverallStatus;
  summaryMessage: string;
  source: RulesSourceUsed;
}

export interface BackendEvaluationResult {
  rule: string;
  status: "ALERTA" | "SUGESTAO" | "OK";
  message: string;

  violation?: {
    id: string;
    type: string;
    severity: "BLOCKING" | "WARNING" | "INFO";
    threshold_km?: number;
    current_km?: number;
    delta_km?: number;

    expected?: {
      function?: string;
      point_type?: string;
    };

    remediation?: {
      target_ordem: number;
      target_location_id: string;
      suggestion: string;
    };
  };

  ui_hints?: any;
}

export interface BackendEvaluationPoint {
  ordem: number;
  location_id: string;
  results: BackendEvaluationResult[];
}

export interface BackendEvaluationResponse {
  scheme_id: string;
  quantidade: number;
  avaliacao: BackendEvaluationPoint[];
}

export function buildIssueKey(params: {
  locationId: string;
  order: number;
  ruleCode: string;
  severity: RuleSeverity;
}) {
  const { locationId, order, ruleCode, severity } = params;
  return `${locationId}#${order}#${ruleCode}#${severity}`;
}

export function ruleGroupFromRuleCode(ruleCode: string): RuleGroup {
  const code = String(ruleCode || "").toUpperCase();

  if (
    code.startsWith("PARADA_") ||
    code.startsWith("APOIO_") ||
    code.startsWith("TROCA_")
  ) {
    return "ANTT";
  }
  if (
    code.startsWith("DADO_") ||
    code.startsWith("TRECHO_") ||
    code.includes("DISTANCIA")
  ) {
    return "DATA_QUALITY";
  }
  if (code.startsWith("TEMPO_") || code.includes("OPERAC")) {
    return "OPERATIONAL";
  }
  return "UNKNOWN";
}
