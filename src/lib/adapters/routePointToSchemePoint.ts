import type { RoutePoint } from "@/types/scheme";

export function routePointToSchemePointInput(
  routePoint: RoutePoint,
  schemeId: string
) {
  return {
    scheme_id: schemeId,
    location_id: routePoint.location.id,
    ordem: routePoint.order,
    tipo: routePoint.type ?? null,

    distancia_km: routePoint.distanceKm ?? null,
    distancia_acumulada_km: routePoint.cumulativeDistanceKm ?? null,

    tempo_deslocamento_min: routePoint.driveTimeMin ?? null,
    tempo_no_local_min: routePoint.stopTimeMin ?? null,

    velocidade_media_kmh: routePoint.avgSpeed ?? null,

    is_initial: routePoint.isInitial ?? false,
    is_final: false, // se você já controla isso em outro lugar

    // 🔹 flags operacionais
    troca_motorista: routePoint.isDriverChange ?? false,
    ponto_operacional: false, // ajuste se existir no front

    // 🔹 flags ANTT / funções
    is_rest_stop: routePoint.isRestStop ?? false,
    is_support_point: routePoint.isSupportPoint ?? false,
    is_boarding_point: routePoint.isBoardingPoint ?? false,
    is_dropoff_point: routePoint.isDropoffPoint ?? false,
    is_free_stop: routePoint.isFreeStop ?? false,

    justificativa: routePoint.justification ?? null,
  };
}
