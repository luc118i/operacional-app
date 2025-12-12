// src/types/api.ts

export interface ApiScheme {
  id: string;
  codigo: string;
  nome: string;
  origem_location_id: string;
  destino_location_id: string;
  distancia_total_km: number | null;
  ativo: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface ApiSchemePoint {
  id: string;
  scheme_id: string;
  location_id: string | null;
  ordem: number;
  tipo: string; // "PE" | "PD" | ...
  distancia_km: number | null;
  tempo_deslocamento_min: number | null;
  tempo_no_local_min: number | null;
  created_at: string;
  updated_at: string | null;
}

export interface ApiLocation {
  id: string;
  sigla: string | null;
  descricao: string | null;
  cidade: string;
  estado: string; // ou "uf" se for esse o nome na tabela
  latitude: number;
  longitude: number;
}

export interface ApiSchemeSummary {
  schemeId: string;
  schemeCodigo: string;
  schemeNome: string;

  totalKm: number;
  totalStops: number;
  expectedStops: {
    value: number;
    totalKm: number;
    ruleKm: number;
  };

  totalTravelMinutes: number;
  totalStopMinutes: number;
  totalDurationMinutes: number;
  averageSpeedKmH: number | null;

  countsByType: Record<string, number>;
  longSegmentsCount: number;
  rulesStatus: {
    status: "OK" | "WARNING" | "ERROR";
    message: string;
  };
}
