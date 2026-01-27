// src/services/schemes/saveScheme.ts

import type { RoutePoint } from "@/types/scheme";
import { API_URL } from "@/services/api";

export type Direction = "ida" | "volta";

export interface SchemeDraft {
  // se vier preenchido = edição, se undefined = criação
  schemeId?: string;

  // cabeçalho
  lineCode: string;
  lineName: string;

  // ids já existentes na tabela locations
  originLocationId: string;
  destinationLocationId: string;

  direction: Direction;
  tripTime: string; // "HH:MM"

  // rota montada na tela
  routePoints: RoutePoint[];
}

interface SaveSchemeResult {
  schemeId: string;
}

/**
 * Converte RoutePoint (do front) -> payload de scheme_points da API
 */
function mapRoutePointsToApiPayload(
  schemeId: string,
  routePoints: RoutePoint[]
) {
  return routePoints.map((point, index) => {
    const ordem =
      typeof point.order === "number" && Number.isFinite(point.order)
        ? point.order
        : index + 1;

    const p = point as RoutePoint & { establishment?: string };

    // ✅ pega functions do ponto (se existir no seu RoutePoint)
    const functions = Array.isArray((point as any).functions)
      ? ((point as any).functions as string[])
      : [];

    // ✅ derive flags (fonte principal: functions)
    const trocaMotorista =
      functions.includes("TROCA_MOTORISTA") || !!(point as any).isDriverChange;

    const isRestStop =
      functions.includes("DESCANSO") || !!(point as any).isRestStop;

    const isSupportPoint =
      functions.includes("APOIO") || !!(point as any).isSupportPoint;

    const isBoardingPoint =
      functions.includes("EMBARQUE") || !!(point as any).isBoardingPoint;

    const isDropoffPoint =
      functions.includes("DESEMBARQUE") || !!(point as any).isDropoffPoint;

    const isFreeStop =
      functions.includes("PARADA_LIVRE") || !!(point as any).isFreeStop;

    // (opcional) se você quiser manter “ponto_operacional” como derivado:
    const pontoOperacional =
      trocaMotorista ||
      isRestStop ||
      isSupportPoint ||
      isBoardingPoint ||
      isDropoffPoint ||
      isFreeStop;

    return {
      scheme_id: schemeId,
      ordem,
      location_id: point.location.id,
      tipo: point.type,

      distancia_km: point.distanceKm,
      distancia_acumulada_km: point.cumulativeDistanceKm,
      tempo_deslocamento_min: point.driveTimeMin,
      tempo_no_local_min: point.stopTimeMin,
      velocidade_media_kmh: point.avgSpeed ?? null,

      is_initial: !!point.isInitial,
      is_final: index === routePoints.length - 1,

      road_segment_uuid: ordem === 1 ? null : point.roadSegmentUuid ?? null,

      estabelecimento: p.establishment ?? null,
      justificativa: point.justification ?? null,

      troca_motorista: trocaMotorista,
      ponto_operacional: pontoOperacional,

      is_rest_stop: isRestStop,
      is_support_point: isSupportPoint,
      is_boarding_point: isBoardingPoint,
      is_dropoff_point: isDropoffPoint,
      is_free_stop: isFreeStop,
    };
  });
}

/**
 * Calcula distância total a partir dos pontos
 */
function computeTotalDistanceKm(routePoints: RoutePoint[]): number {
  if (!routePoints.length) return 0;

  const last = routePoints[routePoints.length - 1] as any;

  if (typeof last.cumulativeDistanceKm === "number") {
    return last.cumulativeDistanceKm;
  }

  if (typeof last.accumulatedDistance === "number") {
    return last.accumulatedDistance;
  }

  return routePoints.reduce((sum, p) => {
    const d =
      (p as any).distanceKm ??
      (p as any).distance ??
      (p as any).distancia_km ??
      0;

    return sum + (typeof d === "number" ? d : 0);
  }, 0);
}

/**
 * Service principal: cria ou atualiza esquema + pontos
 *
 * Agora recebe opcionalmente headers de autenticação (Authorization: Bearer ...),
 * que serão passados pelo hook useSaveScheme via AuthContext.
 */
export async function saveScheme(
  draft: SchemeDraft,
  authHeaders: Record<string, string> = {}
): Promise<SaveSchemeResult> {
  // 🔎 validações mínimas (proteção extra além do que a tela já faz)
  if (!draft.lineCode) {
    throw new Error("Código da linha não informado.");
  }
  if (!draft.originLocationId || !draft.destinationLocationId) {
    throw new Error("IDs de origem e destino não informados.");
  }
  if (!draft.direction) {
    throw new Error("Sentido da viagem não informado.");
  }
  if (!draft.tripTime) {
    throw new Error("Horário da viagem não informado.");
  }
  if (!draft.routePoints.length) {
    throw new Error("Nenhum ponto de rota informado.");
  }

  const totalDistanceKm = computeTotalDistanceKm(draft.routePoints);

  // 1) Cria ou atualiza o esquema
  const schemePayload = {
    codigo: draft.lineCode,
    nome: draft.lineName,
    origem_location_id: draft.originLocationId,
    destino_location_id: draft.destinationLocationId,
    distancia_total_km: totalDistanceKm,
    direction: draft.direction,
    trip_time: draft.tripTime,
    ativo: true,
  };

  let schemeId = draft.schemeId;

  // criação
  if (!schemeId) {
    const res = await fetch(`${API_URL}/schemes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders, // ✅ aplica Authorization aqui
      },
      body: JSON.stringify(schemePayload),
    });

    if (res.status === 401) {
      throw new Error("Sua sessão expirou. Faça login novamente.");
    }

    if (!res.ok) {
      const text = await res.text();
      console.error("[saveScheme] erro ao criar scheme:", text);
      throw new Error("Erro ao criar esquema operacional.");
    }

    const created = await res.json();
    schemeId = created.id;
  } else {
    // atualização
    const res = await fetch(`${API_URL}/schemes/${schemeId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders, // ✅ aplica Authorization aqui
      },
      body: JSON.stringify(schemePayload),
    });

    if (res.status === 401) {
      throw new Error("Sua sessão expirou. Faça login novamente.");
    }

    if (!res.ok) {
      const text = await res.text();
      console.error("[saveScheme] erro ao atualizar scheme:", text);
      throw new Error("Erro ao atualizar esquema operacional.");
    }
  }

  if (!schemeId) {
    throw new Error(
      "Esquema operacional não possui ID após criação/atualização."
    );
  }

  // 2) Monta payload dos pontos
  const pointsPayload = mapRoutePointsToApiPayload(schemeId, draft.routePoints);

  // 3) Envia todos os pontos (substitui os existentes)
  const resPoints = await fetch(
    `${API_URL}/scheme-points/schemes/${schemeId}/points`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders, // ✅ e aqui também (rota protegida)
      },
      body: JSON.stringify(pointsPayload),
    }
  );

  if (resPoints.status === 401) {
    throw new Error("Sua sessão expirou. Faça login novamente.");
  }

  if (!resPoints.ok) {
    const text = await resPoints.text();
    console.error("[saveScheme] erro ao salvar pontos:", text);
    throw new Error("Erro ao salvar pontos do esquema operacional.");
  }

  return { schemeId };
}

/**
 * Busca esquema por (linha + sentido + horário)
 * → apenas leitura, então continua SEM token (rota pública).
 */
export async function findSchemeByKey(
  lineCode: string,
  direction: "ida" | "volta",
  tripTime: string
): Promise<{ id: string } | null> {
  const params = new URLSearchParams({
    codigo: lineCode,
    direction,
    tripTime,
  });

  const res = await fetch(`${API_URL}/schemes/search?${params.toString()}`);

  if (res.status === 404) {
    return null; // não existe esquema para essa combinação
  }

  if (!res.ok) {
    const text = await res.text();
    console.error("[findSchemeByKey] resposta não OK:", res.status, text);
    throw new Error("Erro ao verificar existência do esquema.");
  }

  const data = await res.json();
  return { id: data.id };
}
