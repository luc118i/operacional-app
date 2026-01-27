// src/lib/mapToOperationalScheme.ts
import type {
  OperationalScheme,
  RoutePoint,
  InitialPoint,
  SchemeSummary,
} from "@/types/scheme";

import { timeStringToMinutes, minutesToTime } from "./timeUtils";

export function mapToOperationalScheme(
  scheme: any,
  points: any[] = [],
  summary?: SchemeSummary
): OperationalScheme {
  if (!scheme) {
    throw new Error("mapToOperationalScheme: esquema inválido");
  }

  // 🔹 Pegamos código e nome da linha
  const lineCode = scheme.codigo ?? "";
  const lineName = scheme.nome ?? "";

  // 🔹 Origem e destino extraídos do nome
  let origin = "";
  let destination = "";

  if (typeof lineName === "string" && lineName.includes("→")) {
    const [o, d] = lineName.split("→").map((s: string) => s.trim());
    origin = o;
    destination = d;
  }

  // 🔹 UF de origem/destino caso venha no esquema
  const origemLocation = scheme.origem_location || null;
  const destinoLocation = scheme.destino_location || null;

  const originState = origemLocation?.uf ?? "";
  const destinationState = destinoLocation?.uf ?? "";

  // 🔹 Monta initialPoint (ponto zero) – origem da linha
  let initialPoint: InitialPoint | undefined;

  if (origemLocation) {
    initialPoint = {
      name: origemLocation.descricao,
      city: origemLocation.cidade,
      state: origemLocation.uf,
      lat: Number(origemLocation.lat),
      lng: Number(origemLocation.lng),
    };
  }

  // 🔹 Ordena pontos por ordem
  const ordered = [...points].sort(
    (a, b) => Number(a.ordem ?? 0) - Number(b.ordem ?? 0)
  );

  // Se não tiver pontos, já devolve o básico
  // Se não tiver pontos, usamos direto o summary (e os campos do esquema) pra montar o resumo
  if (ordered.length === 0) {
    const totalKmFromSummary =
      typeof summary?.totalKm === "number" ? summary.totalKm : undefined;

    const totalKmFromScheme =
      typeof scheme.distancia_total_km === "number"
        ? Number(scheme.distancia_total_km)
        : 0;

    const totalKm =
      totalKmFromSummary && totalKmFromSummary > 0
        ? totalKmFromSummary
        : totalKmFromScheme;

    const totalStops =
      typeof summary?.totalStops === "number" ? summary.totalStops : 0;

    const totalPontos =
      typeof summary?.totalPontos === "number"
        ? summary.totalPontos
        : totalStops;

    const totalTravelMinutes =
      typeof summary?.totalTravelMinutes === "number"
        ? summary.totalTravelMinutes
        : 0;

    const totalStopMinutes =
      typeof summary?.totalStopMinutes === "number"
        ? summary.totalStopMinutes
        : 0;

    const totalDurationMinutes = totalTravelMinutes + totalStopMinutes;

    const averageSpeedKmH =
      typeof summary?.averageSpeedKmH === "number"
        ? summary.averageSpeedKmH
        : totalTravelMinutes > 0
        ? Number((totalKm / (totalTravelMinutes / 60)).toFixed(1))
        : 0;

    const totalExpectedStops = summary?.expectedStops?.value ?? undefined;

    return {
      id: scheme.id,

      lineCode,
      lineName,
      direction: scheme.direction ?? "Ida",

      origin,
      originState,
      destination,
      destinationState,

      tripTime: scheme.trip_time ?? "",

      initialPoint,
      routePoints: [],

      totalKm,
      totalStops,
      totalExpectedStops,

      totalParadas: summary?.totalParadas ?? totalStops,
      totalPontos,

      totalTravelMinutes,
      totalStopMinutes,
      totalDurationMinutes,
      averageSpeedKmH,

      travelTime: minutesToTime(totalTravelMinutes),
      totalStopTime: minutesToTime(totalStopMinutes),

      rulesStatus: summary?.rulesStatus ?? undefined,

      createdAt: scheme.created_at,
      updatedAt: scheme.updated_at,
    };
  }

  // ===================== Cálculo de horários =====================

  const len = ordered.length;

  // minutos de referência (HH:MM -> minutos)
  const startMinutes = timeStringToMinutes(scheme.trip_time ?? "00:00");

  // tempos de deslocamento e parada por ponto
  const driveArr = ordered.map((p) => Number(p.tempo_deslocamento_min ?? 0));
  const stopArr = ordered.map((p) => Number(p.tempo_no_local_min ?? 0));

  // vetores de horários
  const arrivalArr = new Array<number>(len).fill(0);
  const departureArr = new Array<number>(len).fill(0);

  // índice do ponto inicial vindo do banco
  const initialIndexFromDb = ordered.findIndex((p) => !!p.is_initial);
  const initialIndex = initialIndexFromDb >= 0 ? initialIndexFromDb : 0;

  // 👉 Aqui estou considerando que trip_time é a HORA DE CHEGADA do ponto inicial.
  // Se quiser que seja hora de SAÍDA, troca a lógica comentada logo abaixo.
  departureArr[initialIndex] = startMinutes;
  arrivalArr[initialIndex] = startMinutes - stopArr[initialIndex];

  /*
  // alternativa: tripTime = HORA DE SAÍDA do ponto inicial
  departureArr[initialIndex] = startMinutes;
  arrivalArr[initialIndex] = startMinutes - stopArr[initialIndex];
  */

  // 🔹 Calcula horários PRA FRENTE (do inicial até o último)
  for (let i = initialIndex + 1; i < len; i++) {
    // driveArr[i] = tempo do trecho (i-1 -> i)
    arrivalArr[i] = departureArr[i - 1] + driveArr[i];
    departureArr[i] = arrivalArr[i] + stopArr[i];
  }

  // 🔹 Calcula horários PRA TRÁS (do inicial até o primeiro)
  for (let i = initialIndex - 1; i >= 0; i--) {
    // driveArr[i + 1] = tempo do trecho (i -> i+1)
    departureArr[i] = arrivalArr[i + 1] - driveArr[i + 1];
    arrivalArr[i] = departureArr[i] - stopArr[i];
  }

  // ===================== Monta RoutePoints =====================

  let cumulativeDistanceKm = 0;

  const routePoints: RoutePoint[] = ordered.map((p: any, idx: number) => {
    const loc = p.location ?? {};
    const isInitial = Boolean(p.is_initial);

    const distance = Number(p.distancia_km ?? 0);
    const drive = driveArr[idx];
    const stop = stopArr[idx];

    cumulativeDistanceKm += distance;

    return {
      id: String(p.id),
      order: Number(p.ordem ?? 0),
      type: String(p.tipo ?? "PL"),

      distanceKm: distance,
      cumulativeDistanceKm,
      driveTimeMin: drive,
      stopTimeMin: stop,

      arrivalTime: minutesToTime(arrivalArr[idx]),
      departureTime: minutesToTime(departureArr[idx]),

      isInitial,

      isRestStop: Boolean(p.is_rest_stop),
      isSupportPoint: Boolean(p.is_support_point),
      isDriverChange: Boolean(p.troca_motorista),
      isBoardingPoint: Boolean(p.is_boarding_point),
      isDropoffPoint: Boolean(p.is_dropoff_point),
      isFreeStop: Boolean(p.is_free_stop),

      avgSpeed:
        p.velocidade_media_kmh !== null && p.velocidade_media_kmh !== undefined
          ? Number(p.velocidade_media_kmh)
          : undefined,

      justification: p.justificativa ?? undefined,

      // 👇 NUNCA null – sempre um objeto, com fallbacks
      location: {
        id: String(loc.id ?? p.location_id ?? ""),
        name: String(loc.descricao ?? loc.name ?? ""),
        city: String(loc.cidade ?? loc.city ?? ""),
        state: String(loc.uf ?? loc.state ?? ""),
        shortName: String(
          loc.sigla ?? loc.shortName ?? loc.descricao ?? loc.name ?? ""
        ),
        kind: String(loc.tipo ?? loc.kind ?? "OUTRO"),
        lat: Number(loc.lat ?? 0),
        lng: Number(loc.lng ?? 0),
      },
    };
  });

  // ---------- Resumo ----------
  const totalKm = summary?.totalKm ?? cumulativeDistanceKm;
  const totalStops = summary?.totalStops ?? routePoints.length;
  const totalExpectedStops = summary?.expectedStops?.value ?? undefined;

  const totalTravelMinutes =
    summary?.totalTravelMinutes ??
    routePoints.reduce((s, p) => s + p.driveTimeMin, 0);
  const totalStopMinutes =
    summary?.totalStopMinutes ??
    routePoints.reduce((s, p) => s + p.stopTimeMin, 0);

  const totalDurationMinutes = totalTravelMinutes + totalStopMinutes;

  const averageSpeedKmH =
    summary?.averageSpeedKmH ??
    (totalTravelMinutes > 0
      ? Number((totalKm / (totalTravelMinutes / 60)).toFixed(1))
      : 0);

  const totalParadas = summary?.totalParadas ?? totalStops;
  const totalPontos = summary?.totalPontos ?? totalStops;

  return {
    id: scheme.id,

    lineCode,
    lineName,
    direction: scheme.direction === "volta" ? "volta" : "ida",

    origin,
    originState,
    destination,
    destinationState,

    tripTime: scheme.trip_time ?? "",

    initialPoint,
    routePoints,

    totalKm,
    totalStops,
    totalExpectedStops,

    totalParadas,
    totalPontos,

    totalTravelMinutes,
    totalStopMinutes,
    totalDurationMinutes,
    averageSpeedKmH,

    travelTime: minutesToTime(totalTravelMinutes),
    totalStopTime: minutesToTime(totalStopMinutes),

    rulesStatus: summary?.rulesStatus ?? undefined,

    createdAt: scheme.created_at,
    updatedAt: scheme.updated_at,
  };
}
