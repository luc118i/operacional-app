// src/hooks/useSchemeSummary.ts
import { useEffect, useState } from "react";

export interface SchemeSummary {
  totalKm: number;
  totalStops: number;
  totalExpectedStops: number;

  totalTravelMinutes: number;
  totalStopMinutes: number;
  totalDurationMinutes: number;
  averageSpeedKmH: number;

  rulesStatus?: {
    status: string;
    message: string;
  };
}

export function useSchemeSummary(schemeId: string) {
  const [data, setData] = useState<SchemeSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!schemeId) return;

    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `http://localhost:3333/schemes/${schemeId}/summary`
        );

        if (!res.ok) {
          throw new Error("Erro ao buscar resumo do esquema");
        }

        const json = await res.json();

        if (cancelled) return;

        setData({
          totalKm: Number(json.totalKm ?? 0),
          totalStops: Number(json.totalStops ?? 0),
          totalExpectedStops: Number(json.expectedStops?.value ?? 0),
          totalTravelMinutes: Number(json.totalTravelMinutes ?? 0),
          totalStopMinutes: Number(json.totalStopMinutes ?? 0),
          totalDurationMinutes: Number(json.totalDurationMinutes ?? 0),
          averageSpeedKmH: Number(json.averageSpeedKmH ?? 0),
          rulesStatus: json.rulesStatus,
        });
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Erro desconhecido");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [schemeId]);

  return { data, loading, error };
}
