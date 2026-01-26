export type PointFunction =
  | "DESCANSO"
  | "APOIO"
  | "TROCA_MOTORISTA"
  | "EMBARQUE"
  | "DESEMBARQUE"
  | "PARADA_LIVRE"
  | "OPERACIONAL";

export interface RoutePoint {
  id: string;
  order: number;
  type: "PE" | "PP" | "PD" | "PA" | "TMJ" | "PL" | string;

  distanceKm: number;
  cumulativeDistanceKm: number;

  driveTimeMin: number;
  stopTimeMin: number;

  arrivalTime: string; // "HH:MM"
  departureTime: string; // "HH:MM"

  // Agora é OBRIGATÓRIO
  location: {
    id: string;
    name: string;
    city: string;
    state: string;
    shortName: string;
    kind: string;
    lat: number;
    lng: number;
  };

  avgSpeed?: number;
  justification?: string;

  // 👇 NOVO: funções ANTT (podem ser várias ao mesmo tempo)
  isRestStop?: boolean; // conta como parada de descanso (330 km)
  isSupportPoint?: boolean; // conta como ponto de apoio (402/495 km)
  isDriverChange?: boolean; // conta como TMJ (660 km)
  isBoardingPoint?: boolean; // embarque
  isDropoffPoint?: boolean; // desembarque
  isFreeStop?: boolean; // parada livre / comercial
  isInitial?: boolean;

  functions?: PointFunction[];

  roadSegmentUuid?: string | null;
}

export interface InitialPoint {
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

export interface OperationalScheme {
  id: string;

  lineCode: string;
  lineName: string;
  direction: "ida" | "volta";

  origin: string;
  originState: string;
  destination: string;
  destinationState: string;

  tripTime: string;

  initialPoint?: InitialPoint;
  routePoints: RoutePoint[];

  // 👉 métricas numéricas
  totalKm?: number;

  // total de registros (tudo) – você pode manter como alias de totalParadas
  totalStops?: number;

  // 🆕 campos alinhados com o SchemeSummary do backend
  totalParadas?: number; // summary.totalParadas (== totalStops)
  totalPontos?: number; // summary.totalPontos

  totalExpectedStops?: number; // summary.expectedStops.value

  totalTravelMinutes?: number;
  totalStopMinutes?: number;
  totalDurationMinutes?: number;
  averageSpeedKmH?: number;

  travelTime?: string;
  totalStopTime?: string;

  rulesStatus?: {
    status: string;
    message: string;
  };

  createdAt?: string;
  updatedAt?: string;
}

export interface SchemeLocation {
  id: string;
  cidade: string;
  uf: string;
  descricao: string | null;
  lat: number;
  lng: number;
}

export interface SchemeWithLocations {
  id: string;
  codigo: string;
  nome: string;
  origem_location_id: string;
  destino_location_id: string;
  distancia_total_km: number;
  ativo: boolean;
  created_at: string;
  updated_at?: string | null;
  trip_time?: string | null;
  direction?: "ida" | "volta" | null;

  origem_location?: SchemeLocation | null;
  destino_location?: SchemeLocation | null;
}

export interface SchemeSummary {
  schemeId: string;
  schemeCodigo: string;
  schemeNome: string;

  totalKm: number;

  totalStops: number;
  totalParadas: number;
  totalPontos: number;

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

export interface SchemeListItem {
  scheme: SchemeWithLocations;
  summary: SchemeSummary;
}

export type FilterMode = "all" | "recent" | "favorites";

export interface SchemeCardSnapshot {
  // ID base para abrir o esquema completo
  schemeId: string;

  // Linha (vão ser usados no card e na busca)
  lineCode: string; // scheme.codigo
  lineName: string; // scheme.nome

  // Origem / destino (cidade + UF) – também usados na busca
  origin: string;
  originState: string;
  destination: string;
  destinationState: string;

  // Tempo total estimado da viagem (se você quiser usar no card)
  tripTime: string;

  // Métricas principais (puxadas do summary)
  totalKm: number;
  totalStops: number; // alias para totalParadas
  totalPoints: number; // totalPontos

  // Para ordenação/exibição
  createdAt: string; // scheme.created_at
  updatedAt?: string; // scheme.updated_at
  direction?: "Ida" | "Volta";
}

export const RECENT_SCHEMES_KEY = "operationalPanel:recentSchemes";
export const FAVORITE_SCHEMES_KEY = "operationalPanel:favorites";
