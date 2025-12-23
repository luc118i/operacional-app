// src/pages/SchemeCreate/createSchemeHandlers.ts
import type { Dispatch, SetStateAction } from "react";
import type { RoutePoint, PointFunction } from "@/types/scheme";

import rawLines from "../../data/lista-de-linhas.json";

export const API_URL = import.meta.env.VITE_API_URL;

// ===============================
// TIPAGEM DO CSV NORMALIZADA
// ===============================

type RawLine = (typeof rawLines)[number];

export type Line = {
  prefixo: string;
  nomeEmpresa: string;
  ufOrigem: string;
  municipioOrigem: string;
  instalacaoOrigem: string;
  ufDestino: string;
  municipioDestino: string;
  instalacaoDestino: string;
  prefixoSGP: string;
  situacao: string;
  quantidadeSecoes: number;
  ok: string;
};

// Normaliza o JSON (com nomes padronizados)
const lines: Line[] = (rawLines as RawLine[]).map((l) => ({
  prefixo: l["Prefixo"],
  nomeEmpresa: l["Nome Empresa"],
  ufOrigem: l["UF Origem"],
  municipioOrigem: l["Município Origem"],
  instalacaoOrigem: l["Instalação Origem"],
  ufDestino: l["UF Destino"],
  municipioDestino: l["Município Destino"],
  instalacaoDestino: l["Instalação Destino"],
  prefixoSGP: String(l["PrefixoSGP"] ?? ""),
  situacao: l["Situação"],
  quantidadeSecoes: Number(l["Quantidade de Seções"] ?? 0),
  ok: l["OK"],
}));

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function defaultFunctionsByPointType(type: string): PointFunction[] {
  switch (type) {
    case "PP":
      return ["DESCANSO"];
    case "PA":
      return ["DESCANSO", "APOIO"];
    case "TMJ":
      return ["DESCANSO", "TROCA_MOTORISTA"];
    case "PE":
      return ["EMBARQUE"];
    case "PD":
      return ["DESEMBARQUE"];
    case "PL":
      return ["PARADA_LIVRE"];
    default:
      return [];
  }
}

function deriveFlagsFromFunctions(fns: PointFunction[]) {
  return {
    isRestStop: fns.includes("DESCANSO"),
    isSupportPoint: fns.includes("APOIO"),
    isDriverChange: fns.includes("TROCA_MOTORISTA"),
    isBoardingPoint: fns.includes("EMBARQUE"),
    isDropoffPoint: fns.includes("DESEMBARQUE"),
    isFreeStop: fns.includes("PARADA_LIVRE"),
  };
}

/**
 * Normaliza um RoutePoint para manter:
 * - functions como fonte de verdade
 * - flags coerentes com functions (compatibilidade)
 */
function normalizeRoutePointFunctions(p: RoutePoint): RoutePoint {
  const raw = (p.functions ?? []) as PointFunction[];
  const base = raw.length ? raw : defaultFunctionsByPointType(p.type);
  const functions = uniq(base);

  const flags = deriveFlagsFromFunctions(functions);

  return {
    ...p,
    functions,
    ...flags,
  };
}

/**
 * Quando updates trouxer functions, aplicamos e sincronizamos flags.
 */
function applyFunctionsUpdates(
  current: RoutePoint,
  updates: Partial<RoutePoint>
): RoutePoint {
  const next = { ...current, ...updates } as RoutePoint;

  // se updates trouxe functions explicitamente:
  if ("functions" in updates) {
    return normalizeRoutePointFunctions(next);
  }

  // se não trouxe functions, mantém as functions existentes;
  // mas se alguém mexeu nas flags (legado), NÃO tentamos re-derivar functions aqui
  // para evitar “briga” de fonte de verdade.
  return next;
}

// Busca por códigos (prefixo ou prefixoSGP)
function findLineByCode(code: string): Line | undefined {
  const trimmed = code.trim().toUpperCase();

  return lines.find(
    (line) =>
      line.prefixo.toUpperCase() === trimmed ||
      line.prefixoSGP.toUpperCase() === trimmed
  );
}

type SelectedLine = Line | null;

// ===============================
// PARAMETROS ACEITOS PELOS HANDLERS
// ===============================

interface CreateSchemeHandlersParams {
  routePoints: RoutePoint[];
  setRoutePoints: Dispatch<SetStateAction<RoutePoint[]>>;

  selectedLine: SelectedLine;
  setSelectedLine: Dispatch<SetStateAction<SelectedLine>>;

  tripTime: string;
  setLineCode: Dispatch<SetStateAction<string>>;
  setIsModalOpen: (open: boolean) => void; // (mantido por compatibilidade; se não usar, remova depois)
}

// ===============================
// FUNÇÃO PRINCIPAL QUE EXPORTA OS HANDLERS
// ===============================

export function createSchemeHandlers({
  routePoints,
  setRoutePoints,
  selectedLine,
  setSelectedLine,
  tripTime,
  setLineCode,
  setIsModalOpen,
}: CreateSchemeHandlersParams) {
  // =====================================
  // 1) ALTERAR LINHA
  // =====================================
  const handleLineCodeChange = (code: string) => {
    setLineCode(code);
    const line = findLineByCode(code);
    setSelectedLine(line ?? null);
  };

  // =====================================
  // HELPER: recalcular tudo após qualquer mudança na lista
  // - Normaliza functions/flags para TODOS os pontos (fonte de verdade)
  // - Reordena
  // - Recalcula distância cumulativa + driveTimeMin
  // - Recalcula horários baseado no ponto inicial e tripTime
  // =====================================
  const recalcAllRoutePoints = (points: RoutePoint[]): RoutePoint[] => {
    if (!points.length) return points;

    // ✅ ajuste obrigatório: normaliza functions/flags para evitar inconsistências
    const normalizedInput = points.map(normalizeRoutePointFunctions);

    // 1) garante ordem sequencial
    let newPoints = normalizedInput.map((p, index) => ({
      ...p,
      order: index + 1,
    }));

    // 2) garante que exista um ponto inicial
    const hasInitial = newPoints.some((p) => p.isInitial);
    if (!hasInitial) {
      newPoints = newPoints.map((p, index) => ({
        ...p,
        isInitial: index === 0,
      }));
    }

    // 3) recalcula APENAS cumulativo + tempo de deslocamento
    for (let i = 0; i < newPoints.length; i++) {
      const current = { ...newPoints[i] };

      if (i === 0) {
        newPoints[i] = {
          ...current,
          order: 1,
          cumulativeDistanceKm: 0,
        };
        continue;
      }

      const prevPoint = newPoints[i - 1];

      let distanceKm = Number(current.distanceKm ?? 0);
      if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
        distanceKm = calculateDistance(
          prevPoint.location.lat,
          prevPoint.location.lng,
          current.location.lat,
          current.location.lng
        );
      }

      const cumulativeDistanceKm =
        (prevPoint.cumulativeDistanceKm ?? 0) + distanceKm;

      const customSpeed =
        typeof current.avgSpeed === "number" ? current.avgSpeed : undefined;

      let driveTimeMin = Number(current.driveTimeMin ?? 0);
      if (!Number.isFinite(driveTimeMin) || driveTimeMin <= 0) {
        driveTimeMin = computeDriveTimeMinutes(distanceKm, customSpeed);
      }

      newPoints[i] = {
        ...current,
        order: i + 1,
        distanceKm,
        cumulativeDistanceKm,
        driveTimeMin,
      };
    }

    // 4) reaplica horários a partir do ponto inicial atual
    const initial = newPoints.find((p) => p.isInitial)!;
    return recalcTimesFromInitial(newPoints, initial.id, tripTime);
  };

  // =====================================
  // PONTO INICIAL
  // =====================================

  const handleSetInitialPoint = (pointId: string, tripStartTime: string) => {
    if (!tripStartTime) return;

    setRoutePoints((prev) => {
      if (!prev.length) return prev;

      const points = prev.map((p) => ({
        ...p,
        isInitial: p.id === pointId,
      }));

      return recalcAllRoutePoints(points);
    });
  };

  // =====================================
  // 2) ADICIONAR UM NOVO PONTO
  // =====================================

  const handleAddPoint = async (pointInput: any) => {
    // 1) Se já vier como RoutePoint, continua igual (mas normaliza)
    if (
      pointInput &&
      typeof pointInput === "object" &&
      "id" in pointInput &&
      "order" in pointInput &&
      "location" in pointInput
    ) {
      const asRoutePoint = normalizeRoutePointFunctions(
        pointInput as RoutePoint
      );
      setRoutePoints((prev) => recalcAllRoutePoints([...prev, asRoutePoint]));
      return;
    }

    // 2) Payload vindo do modal: { location, type, stopTimeMin, avgSpeed, justification, functions }
    const loc = pointInput.location;

    const last = routePoints[routePoints.length - 1];
    const nextOrder = last ? last.order + 1 : 1;

    let distanceKm = 0;
    let cumulativeDistanceKm = last ? last.cumulativeDistanceKm : 0;
    let driveTimeMin = 0;

    if (last) {
      try {
        const params = new URLSearchParams({
          fromLocationId: String(last.location.id),
          toLocationId: String(loc.id),
        });

        const res = await fetch(
          `${API_URL}/road-segments/road-distance?${params.toString()}`
        );

        if (!res.ok) throw new Error("Falha ao obter distância pelo traçado");

        const data = await res.json();
        distanceKm = Number(data.distanceKm) || 0;
      } catch (err) {
        console.error(
          "[handleAddPoint] Erro ao chamar /road-segments/road-distance, usando Haversine como fallback:",
          err
        );

        distanceKm = calculateDistance(
          last.location.lat,
          last.location.lng,
          Number(loc.lat),
          Number(loc.lng)
        );
      }

      cumulativeDistanceKm = (last.cumulativeDistanceKm ?? 0) + distanceKm;

      const customSpeed =
        typeof pointInput.avgSpeed === "number"
          ? pointInput.avgSpeed
          : undefined;

      driveTimeMin = computeDriveTimeMinutes(distanceKm, customSpeed);
    }

    const stopTimeMin = Number(pointInput.stopTimeMin ?? 5);

    // ✅ ajuste obrigatório: sempre derive functions (não deixe vazio por acidente)
    const rawFunctions: PointFunction[] = Array.isArray(pointInput.functions)
      ? pointInput.functions
      : defaultFunctionsByPointType(String(pointInput.type ?? ""));

    const newPoint: RoutePoint = {
      id: String(loc.id),
      order: nextOrder,
      type: pointInput.type,
      stopTimeMin,

      distanceKm,
      cumulativeDistanceKm,
      driveTimeMin,

      arrivalTime: "",
      departureTime: "",

      location: {
        id: String(loc.id),
        name: String(loc.name ?? ""),
        city: String(loc.city ?? ""),
        state: String(loc.state ?? ""),
        shortName: String(loc.shortName ?? loc.name ?? ""),
        kind: String(loc.kind ?? "OUTRO"),
        lat: Number(loc.lat ?? 0),
        lng: Number(loc.lng ?? 0),
      },

      avgSpeed:
        driveTimeMin > 0
          ? Number((distanceKm / (driveTimeMin / 60)).toFixed(1))
          : undefined,

      justification: pointInput.justification ?? "",

      // ✅ CONTRATO NOVO (fonte de verdade)
      functions: rawFunctions,

      // ✅ NÃO copiamos flags do modal: evita 2 fontes de verdade
      // flags serão derivadas via normalizeRoutePointFunctions

      isInitial: false,
    };

    const normalizedPoint = normalizeRoutePointFunctions(newPoint);

    setRoutePoints((prev) => {
      const updated = [...prev, normalizedPoint];
      return recalcAllRoutePoints(updated);
    });
  };

  // =====================================
  // 3) ATUALIZAR UM PONTO EXISTENTE
  // =====================================
  const handleUpdatePoint = (id: string, updates: Partial<RoutePoint>) => {
    setRoutePoints((prev) => {
      const index = prev.findIndex((p) => p.id === id);
      if (index === -1) return prev;

      const newPoints = [...prev];
      const current = newPoints[index];

      const merged = applyFunctionsUpdates(current, updates);
      newPoints[index] = merged;

      return recalcAllRoutePoints(newPoints);
    });
  };

  // =====================================
  // 4) DELETAR UM PONTO
  // =====================================
  const handleDeletePoint = (id: string) => {
    setRoutePoints((prevPoints) => {
      const filtered = prevPoints.filter((p) => p.id !== id);
      if (!filtered.length) return filtered;
      return recalcAllRoutePoints(filtered);
    });
  };

  // =====================================
  // 5) MOVER PONTO PARA CIMA
  // =====================================
  const handleMovePointUp = (id: string) => {
    setRoutePoints((prevPoints) => {
      const index = prevPoints.findIndex((p) => p.id === id);
      if (index <= 0) return prevPoints;
      if (prevPoints[index].isInitial) return prevPoints;

      const newPoints = [...prevPoints];
      const temp = newPoints[index - 1];
      newPoints[index - 1] = newPoints[index];
      newPoints[index] = temp;

      return recalcAllRoutePoints(newPoints);
    });
  };

  // =====================================
  // 6) MOVER PONTO PARA BAIXO
  // =====================================
  const handleMovePointDown = (id: string) => {
    setRoutePoints((prevPoints) => {
      const index = prevPoints.findIndex((p) => p.id === id);
      if (index === -1 || index === prevPoints.length - 1) return prevPoints;
      if (prevPoints[index].isInitial) return prevPoints;

      const newPoints = [...prevPoints];
      const temp = newPoints[index + 1];
      newPoints[index + 1] = newPoints[index];
      newPoints[index] = temp;

      return recalcAllRoutePoints(newPoints);
    });
  };

  // =====================================
  // 7) INSERIR UM PONTO DEPOIS DE OUTRO
  // =====================================
  const handleInsertPointAfter = (anchorPointId: string, pointInput: any) => {
    setRoutePoints((prevPoints) => {
      if (!prevPoints.length) return prevPoints;

      const anchorIndex = prevPoints.findIndex((p) => p.id === anchorPointId);
      if (anchorIndex === -1) return prevPoints;

      const loc = pointInput.location;
      const stopTimeMin = Number(pointInput.stopTimeMin ?? 5);

      const rawFunctions: PointFunction[] = Array.isArray(pointInput.functions)
        ? pointInput.functions
        : defaultFunctionsByPointType(String(pointInput.type ?? ""));

      const newPoint: RoutePoint = {
        id: String(loc.id),
        order: anchorIndex + 2, // provisório
        type: pointInput.type,
        stopTimeMin,

        distanceKm: 0,
        cumulativeDistanceKm: 0,
        driveTimeMin: 0,

        arrivalTime: "",
        departureTime: "",

        location: {
          id: String(loc.id),
          name: String(loc.name ?? ""),
          city: String(loc.city ?? ""),
          state: String(loc.state ?? ""),
          shortName: String(loc.shortName ?? loc.name ?? ""),
          kind: String(loc.kind ?? "OUTRO"),
          lat: Number(loc.lat ?? 0),
          lng: Number(loc.lng ?? 0),
        },

        avgSpeed:
          typeof pointInput.avgSpeed === "number"
            ? Number(pointInput.avgSpeed)
            : undefined,

        justification: pointInput.justification ?? "",

        // ✅ contrato público
        functions: rawFunctions,

        // flags serão derivadas na normalização
        isInitial: false,
      };

      const normalizedPoint = normalizeRoutePointFunctions(newPoint);

      const updated = [...prevPoints];
      updated.splice(anchorIndex + 1, 0, normalizedPoint);

      return recalcAllRoutePoints(updated);
    });
  };

  const handleRefreshDistances = async (pointsInput?: RoutePoint[]) => {
    const basePoints = pointsInput ?? routePoints;
    if (basePoints.length < 2) return;

    const updated = basePoints.map((p) => ({ ...p }));

    for (let i = 1; i < updated.length; i++) {
      const prev = updated[i - 1];
      const cur = updated[i];

      if (!prev?.location?.id || !cur?.location?.id) continue;

      try {
        const params = new URLSearchParams({
          fromLocationId: String(prev.location.id),
          toLocationId: String(cur.location.id),
        });

        const res = await fetch(
          `${API_URL}/road-segments/road-distance?${params.toString()}`
        );

        if (!res.ok) throw new Error("Falha ao obter distância");

        const data = await res.json();
        const nextDistanceKm = Number(data.distanceKm);

        if (Number.isFinite(nextDistanceKm) && nextDistanceKm > 0) {
          const customSpeed =
            typeof cur.avgSpeed === "number" && cur.avgSpeed > 0
              ? cur.avgSpeed
              : undefined;

          updated[i] = {
            ...cur,
            distanceKm: nextDistanceKm,
            driveTimeMin: computeDriveTimeMinutes(nextDistanceKm, customSpeed),
          };
        }
      } catch (err) {
        console.error("[refreshDistances] erro", err);
      }
    }

    // recalcAllRoutePoints também normaliza functions/flags
    const finalPoints = recalcAllRoutePoints(updated);
    setRoutePoints(finalPoints);
  };

  return {
    handleLineCodeChange,
    handleAddPoint,
    handleUpdatePoint,
    handleDeletePoint,
    handleSetInitialPoint,
    handleMovePointUp,
    handleMovePointDown,
    handleInsertPointAfter,
    handleRefreshDistances,
  };
}

// ===============================
// HELPERS LOCAIS
// ===============================

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Regra de tempo de deslocamento baseada na planilha
function computeDriveTimeMinutes(
  distanceKm: number,
  customSpeed?: number | null
): number {
  const FIXED_MINUTES = 30; // 30 min para casos especiais
  const SPEED_IN_RANGE = 70; // 10..100 km
  const SPEED_OUT_RANGE = 80; // fora dessa faixa

  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return FIXED_MINUTES;
  if (distanceKm < 15) return FIXED_MINUTES;

  let speed: number | null = null;
  if (typeof customSpeed === "number" && customSpeed > 0) {
    speed = customSpeed;
  } else {
    speed =
      distanceKm >= 10 && distanceKm <= 100 ? SPEED_IN_RANGE : SPEED_OUT_RANGE;
  }

  const timeHours = distanceKm / speed;
  const minutes = Math.round(timeHours * 60);

  return Number.isFinite(minutes) && minutes > 0 ? minutes : FIXED_MINUTES;
}

function toRad(deg: number) {
  return deg * (Math.PI / 180);
}

export function addMinutesToTime(time: string, minutes: number) {
  if (!time) return "";
  const [hours, mins] = time.split(":").map(Number);
  const total = hours * 60 + mins + minutes;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function recalcTimesFromInitial(
  points: RoutePoint[],
  initialPointId: string,
  tripStartTime: string
): RoutePoint[] {
  const toMinutes = (time?: string | null): number | null => {
    if (!time) return null;
    const [h, m] = time.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  };

  const toTimeString = (mins: number): string => {
    const total = ((mins % (24 * 60)) + 24 * 60) % (24 * 60);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const result = points.map((p) => ({ ...p }));
  const initialIndex = result.findIndex((p) => p.id === initialPointId);
  if (initialIndex === -1) return result;

  const startMinutes = toMinutes(tripStartTime);
  if (startMinutes === null) return result;

  const initialPoint = result[initialIndex];
  initialPoint.departureTime = tripStartTime;

  const stopInitial = initialPoint.stopTimeMin ?? 0;
  const startMin = toMinutes(tripStartTime)!;

  initialPoint.arrivalTime = toTimeString(startMin - stopInitial);

  // PRA FRENTE
  for (let i = initialIndex + 1; i < result.length; i++) {
    const current = result[i];
    const prevPoint = result[i - 1];

    const prevDepartureMin = toMinutes(prevPoint.departureTime);
    if (prevDepartureMin === null) break;

    const driveTimeMin = current.driveTimeMin ?? 0;
    const stopTimeCurrent = current.stopTimeMin ?? 0;

    const arrivalMin = prevDepartureMin + driveTimeMin;
    const departureMin = arrivalMin + stopTimeCurrent;

    current.arrivalTime = toTimeString(arrivalMin);
    current.departureTime = toTimeString(departureMin);
  }

  // PRA TRÁS (pré-viagem)
  for (let i = initialIndex - 1; i >= 0; i--) {
    const current = result[i];
    const nextPoint = result[i + 1];

    const nextDepartureMin = toMinutes(nextPoint.departureTime);
    if (nextDepartureMin === null) break;

    const driveToNextMin = nextPoint.driveTimeMin ?? 0;
    const stopNext = nextPoint.stopTimeMin ?? 0;
    const stopCurrent = current.stopTimeMin ?? 0;

    const departureCurrentMin = nextDepartureMin - stopNext - driveToNextMin;
    current.departureTime = toTimeString(departureCurrentMin);

    const arrivalCurrentMin = departureCurrentMin - stopCurrent;
    current.arrivalTime = toTimeString(arrivalCurrentMin);
  }

  return result;
}
