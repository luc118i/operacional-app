// src/hooks/useScheme.ts
import { useEffect, useState } from "react";
import type { OperationalScheme } from "@/types/scheme";
import { mapToOperationalScheme } from "@/lib/mapToOperationalScheme";
import { API_URL } from "./../services/api";

import type {
  BackendEvaluationResponse,
  RuleIssue,
  RulesOverview,
} from "@/lib/rules/types";
import {
  normalizeBackendEvaluation,
  buildRulesOverviewFromIssues,
} from "@/lib/rules/normalizeBackend";

export function useScheme(id: string) {
  const [data, setData] = useState<OperationalScheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const schemeUrl = `${API_URL}/schemes/${id}`;
        const pointsUrl = `${API_URL}/scheme-points/schemes/${id}/points`;
        const summaryUrl = `${API_URL}/schemes/${id}/summary`;
        const evaluationUrl = `${API_URL}/scheme-points/schemes/${id}/points/evaluation`;

        const [schemeRes, pointsRes, summaryRes, evaluationRes] =
          await Promise.all([
            fetch(schemeUrl),
            fetch(pointsUrl),
            fetch(summaryUrl),
            fetch(evaluationUrl),
          ]);

        if (!schemeRes.ok) {
          const txt = await schemeRes.text();
          console.error("[useScheme] erro scheme:", schemeRes.status, txt);
          throw new Error("Erro ao carregar esquema");
        }
        const schemeJson = await schemeRes.json();

        // pontos: se 404, usa []
        let pointsJson: any[] = [];
        if (pointsRes.status === 404) {
          console.warn(
            "[useScheme] /scheme-points/schemes/:id retornou 404, usando []"
          );
        } else if (!pointsRes.ok) {
          const txt = await pointsRes.text();
          console.error("[useScheme] erro points:", pointsRes.status, txt);
          throw new Error("Erro ao carregar pontos");
        } else {
          pointsJson = await pointsRes.json();
        }

        if (!summaryRes.ok) {
          const txt = await summaryRes.text();
          console.error("[useScheme] erro summary:", summaryRes.status, txt);
          throw new Error("Erro ao carregar resumo");
        }
        const summaryJson = await summaryRes.json();

        // evaluation: opcional (se 404 ou erro, não quebra a tela)
        let evaluationJson: BackendEvaluationResponse | undefined = undefined;

        if (evaluationRes.status === 404) {
          console.warn(
            "[useScheme] /scheme-points/schemes/:id/points/evaluation retornou 404, usando issues vazias"
          );
        } else if (!evaluationRes.ok) {
          const txt = await evaluationRes.text();
          console.error(
            "[useScheme] erro evaluation:",
            evaluationRes.status,
            txt
          );
          // não dá throw aqui: é opcional
        } else {
          evaluationJson = await evaluationRes.json();
        }

        const operational = mapToOperationalScheme(
          schemeJson,
          pointsJson,
          summaryJson
        );

        const ruleIssues = evaluationJson
          ? normalizeBackendEvaluation(evaluationJson)
          : [];

        const rulesOverview = buildRulesOverviewFromIssues(
          ruleIssues,
          "backend"
        );

        const mapped = {
          ...operational,
          ruleIssues,
          rulesOverview,
          rulesSourceUsed: "backend" as const,
        };

        setData(mapped);
      } catch (err: any) {
        console.error("[useScheme] erro:", err);
        setError(err.message || "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      load();
    }
  }, [id]);

  return { data, loading, error };
}
