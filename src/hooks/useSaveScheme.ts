// src/hooks/useSaveScheme.ts

import { useState, useCallback } from "react";
import { saveScheme, type SchemeDraft } from "@/services/schemes/saveScheme";
import { useAuth } from "@/context/AuthContext";

interface UseSaveSchemeResult {
  isSaving: boolean;
  error: string | null;
  save: (draft: SchemeDraft) => Promise<{ schemeId: string } | null>;
}

export function useSaveScheme(): UseSaveSchemeResult {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { getAuthHeaders } = useAuth();

  const save = useCallback(
    async (draft: SchemeDraft) => {
      setIsSaving(true);
      setError(null);

      try {
        const result = await saveScheme(draft, getAuthHeaders());
        return result;
      } catch (err: any) {
        const message =
          err?.message || "Erro inesperado ao salvar esquema operacional.";
        console.error("[useSaveScheme] erro:", err);
        setError(message);
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [getAuthHeaders]
  );

  return { isSaving, error, save };
}
