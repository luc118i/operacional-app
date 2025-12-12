// src/hooks/useScheme.ts
import { useEffect, useState } from "react";
import type { OperationalScheme } from "@/types/scheme";
import { mapToOperationalScheme } from "@/lib/mapToOperationalScheme";
import { API_URL } from "./../services/api";

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

        const [schemeRes, pointsRes, summaryRes] = await Promise.all([
          fetch(schemeUrl),
          fetch(pointsUrl),
          fetch(summaryUrl),
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

        const mapped = mapToOperationalScheme(
          schemeJson,
          pointsJson,
          summaryJson
        );

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
