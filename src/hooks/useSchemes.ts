import { useEffect, useState } from "react";
import type { OperationalScheme, SchemeListItem } from "@/types/scheme";
import { mapToOperationalScheme } from "@/lib/mapToOperationalScheme";

export function useSchemes() {
  const [data, setData] = useState<SchemeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const res = await fetch("http://localhost:3333/schemes");
        if (!res.ok) throw new Error("Erro ao buscar esquemas");

        const json = (await res.json()) as SchemeListItem[];

        setData(json);
      } catch (err: any) {
        setError(err.message ?? "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return { data, loading, error };
}
