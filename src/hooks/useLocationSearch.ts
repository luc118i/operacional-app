// src/hooks/useLocationSearch.ts
import { useEffect, useState } from "react";
import {
  searchLocationsApi,
  type LocationApi,
} from "@/services/locationsService";

export interface LocationOption {
  id: string;
  name: string; // vem de descricao
  city: string; // cidade
  state: string; // uf
  type: string; // tipo
  lat: number;
  lng: number;
  sigla?: string;
}

/**
 * Hook responsável por toda a lógica de busca de locais.
 * Não renderiza nada, só entrega estado + ações pro componente.
 */
export function useLocationSearch(initialTerm: string = "") {
  const [searchTerm, setSearchTerm] = useState(initialTerm);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [selectedLocation, setSelectedLocation] =
    useState<LocationOption | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const term = searchTerm.trim();

    // regra: só buscar se tiver pelo menos 2 caracteres
    if (term.length < 2) {
      setLocations([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const timeoutId = setTimeout(async () => {
      try {
        setIsLoading(true);
        setError(null);

        const apiLocations: LocationApi[] = await searchLocationsApi(term);

        if (cancelled) return;

        const mapped: LocationOption[] = apiLocations.map((loc) => ({
          id: loc.id,
          name: loc.descricao,
          city: loc.cidade,
          state: loc.uf,
          type: loc.tipo,
          lat: loc.lat,
          lng: loc.lng,
          sigla: loc.sigla,
        }));

        setLocations(mapped);

        // se o item selecionado atual não estiver mais na lista, limpa seleção
        setSelectedLocation((current) =>
          current && mapped.some((l) => l.id === current.id) ? current : null
        );
      } catch (err: any) {
        if (cancelled) return;
        console.error("[useLocationSearch] erro:", err);
        setError(
          err?.message ?? "Erro ao buscar locais. Tente novamente em instantes."
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, 300); // debounce de 300ms

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [searchTerm]);

  const selectLocation = (location: LocationOption) => {
    setSelectedLocation(location);
  };

  const clearSelection = () => {
    setSelectedLocation(null);
  };

  const clearResults = () => {
    setLocations([]);
    setSelectedLocation(null);
    setError(null);
  };

  return {
    // estado de busca
    searchTerm,
    setSearchTerm,

    // resultados
    locations,
    isLoading,
    error,

    // seleção
    selectedLocation,
    selectLocation,
    clearSelection,

    // utilitário extra se quiser limpar tudo
    clearResults,
  };
}
