// src/lib/schemeMappers.ts

import type { SchemeListItem, SchemeCardSnapshot } from "@/types/scheme";

export function mapListItemToCardSnapshot(
  item: SchemeListItem
): SchemeCardSnapshot {
  const { scheme, summary } = item;

  return {
    schemeId: scheme.id,
    lineCode: scheme.codigo,
    lineName: scheme.nome,

    origin: scheme.origem_location?.cidade ?? "",
    originState: scheme.origem_location?.uf ?? "",

    destination: scheme.destino_location?.cidade ?? "",
    destinationState: scheme.destino_location?.uf ?? "",

    tripTime: scheme.trip_time ?? "",

    totalKm: summary.totalKm,
    totalStops: summary.totalStops,
    totalPoints: summary.totalPontos,

    createdAt: scheme.created_at,
    updatedAt: scheme.updated_at ?? undefined,

    direction: scheme.direction === "volta" ? "Volta" : "Ida",
  };
}
