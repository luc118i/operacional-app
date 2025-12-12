// src/hooks/useSchemeDetail.ts
import { useEffect, useState } from "react";
import type { OperationalScheme, SchemeSummary } from "@/types/scheme";
import { mapToOperationalScheme } from "@/lib/mapToOperationalScheme";

interface ApiSchemeSummary {
  totalKm: number;
  totalStops: number;
  expectedStops?: { value: number; totalKm: number; ruleKm: number };
  totalTravelMinutes: number;
  totalStopMinutes: number;
  totalDurationMinutes: number;
  averageSpeedKmH: number;
  rulesStatus?: { status: string; message: string };
}

export function useSchemeDetail(schemeId: string | null) {
  const [data, setData] = useState<OperationalScheme | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!schemeId) return;

    const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [schemeRes, pointsRes, summaryRes] = await Promise.all([
          fetch(`${baseUrl}/schemes/${schemeId}`),
          fetch(`${baseUrl}/scheme-points/schemes/${schemeId}/points`),
          fetch(`${baseUrl}/schemes/${schemeId}/summary`),
        ]);

        if (!schemeRes.ok) throw new Error("Erro ao buscar esquema");
        if (!pointsRes.ok) throw new Error("Erro ao buscar pontos");

        const scheme = await schemeRes.json();
        const points = await pointsRes.json();
        const summary: SchemeSummary | undefined = summaryRes.ok
          ? await summaryRes.json()
          : undefined;

        const mapped = mapToOperationalScheme(scheme, points, summary);
        setData(mapped);
      } catch (err: any) {
        console.error(err);
        setError(err.message ?? "Erro ao carregar detalhes do esquema");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [schemeId]);

  return { data, loading, error };
}
