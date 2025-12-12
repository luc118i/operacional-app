// src/pages/SchemeCreate/createSchemeHandlers.ts
import type { Dispatch, SetStateAction } from "react";
import type { RoutePoint } from "@/types/scheme";

import rawLines from "../../data/lista-de-linhas.json";

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
  setIsModalOpen: (open: boolean) => void;
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
  // =====================================
  const recalcAllRoutePoints = (points: RoutePoint[]): RoutePoint[] => {
    if (!points.length) return points;

    // 1) garante ordem sequencial
    let newPoints = points.map((p, index) => ({
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
        // primeiro ponto sempre com distância acumulada = 0
        newPoints[i] = {
          ...current,
          order: 1,
          cumulativeDistanceKm: 0,
          // distanceKm e driveTimeMin ficam como já estão
        };
        continue;
      }

      const prevPoint = newPoints[i - 1];

      // 👉 PRIORIDADE:
      // 1) usar distanceKm já existente (API ORS, valor salvo no banco etc.)
      // 2) SE não existir ou for inválido, cair para Haversine como fallback
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

      // se já existir driveTimeMin válido, preserva; senão calcula
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

  // Define como ponto inicial sem mudar a ordem da lista
  // Recalcula horários para frente E para trás.
  // Pressupõe que `tripTime` (HH:mm) já esteja definido no escopo do handler.

  const handleSetInitialPoint = (pointId: string, tripStartTime: string) => {
    if (!tripStartTime) return;

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
      return `${h.toString().padStart(2, "0")}:${m
        .toString()
        .padStart(2, "0")}`;
    };

    setRoutePoints((prev) => {
      if (!prev.length) return prev;

      // marca qual é o inicial
      const points = prev.map((p) => ({
        ...p,
        isInitial: p.id === pointId,
      }));

      const initialIndex = points.findIndex((p) => p.id === pointId);
      if (initialIndex === -1) return prev;

      const startMinutes = toMinutes(tripStartTime);
      if (startMinutes === null) return prev;

      const initialPoint = points[initialIndex];

      // saída do inicial = Horário da Viagem
      initialPoint.departureTime = tripStartTime;

      // chegada do inicial = saída - tempo de parada dele
      const stopInitial = initialPoint.stopTimeMin ?? 0;
      const initialArrivalMin = startMinutes - stopInitial;
      initialPoint.arrivalTime =
        initialArrivalMin >= 0 ? toTimeString(initialArrivalMin) : "";

      // === PRA FRENTE
      for (let i = initialIndex + 1; i < points.length; i++) {
        const current = points[i];
        const prevPoint = points[i - 1];

        const prevDepartureMin = toMinutes(prevPoint.departureTime);
        if (prevDepartureMin === null) break;

        const driveTimeMin = current.driveTimeMin ?? 0;
        const stopTimeCurrent = current.stopTimeMin ?? 0;

        const arrivalMin = prevDepartureMin + driveTimeMin;
        const departureMin = arrivalMin + stopTimeCurrent;

        current.arrivalTime = toTimeString(arrivalMin);
        current.departureTime = toTimeString(departureMin);
      }

      // === PRA TRÁS
      for (let i = initialIndex - 1; i >= 0; i--) {
        const current = points[i];
        const nextPoint = points[i + 1];

        const departureNextMin = toMinutes(nextPoint.departureTime);
        if (departureNextMin === null) break;

        const stopTimeNext = nextPoint.stopTimeMin ?? 0;
        const driveTimeMin = nextPoint.driveTimeMin ?? 0;
        const stopTimeCurrent = current.stopTimeMin ?? 0;

        const arrivalNextMin = departureNextMin - stopTimeNext;
        const departureCurrentMin = arrivalNextMin - driveTimeMin;
        const arrivalCurrentMin = departureCurrentMin - stopTimeCurrent;

        current.departureTime = toTimeString(departureCurrentMin);
        current.arrivalTime = toTimeString(arrivalCurrentMin);
      }

      return recalcAllRoutePoints(points);
    });
  };

  // =====================================
  // 2) ADICIONAR UM NOVO PONTO
  // =====================================

  const handleAddPoint = async (pointInput: any) => {
    // 1) Se já vier como RoutePoint, continua igual
    if (
      pointInput &&
      typeof pointInput === "object" &&
      "id" in pointInput &&
      "order" in pointInput &&
      "location" in pointInput
    ) {
      const asRoutePoint = pointInput as RoutePoint;
      setRoutePoints((prev) => [...prev, asRoutePoint]);
      return;
    }

    // 2) Payload vindo do modal: { location, type, stopTimeMin, ... }
    const loc = pointInput.location;

    const last = routePoints[routePoints.length - 1];
    const nextOrder = last ? last.order + 1 : 1;

    let distanceKm = 0;
    let cumulativeDistanceKm = last ? last.cumulativeDistanceKm : 0;
    let driveTimeMin = 0;

    // ==============================
    // DISTÂNCIA (API + fallback)
    // ==============================
    if (last) {
      try {
        const params = new URLSearchParams({
          fromLocationId: String(last.location.id),
          toLocationId: String(loc.id),
        });

        const res = await fetch(
          `/road-segments/road-distance?${params.toString()}`
        );

        if (!res.ok) {
          throw new Error("Falha ao obter distância pelo traçado");
        }

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

    // ==============================
    // NUNCA DEFINE HORÁRIO AQUI
    // ==============================
    const stopTimeMin = Number(pointInput.stopTimeMin ?? 5);

    const newPoint: RoutePoint = {
      id: String(loc.id),
      order: nextOrder,
      type: pointInput.type,
      stopTimeMin,

      distanceKm,
      cumulativeDistanceKm,
      driveTimeMin,

      // sempre em branco – só será preenchido pelo handleSetInitialPoint
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

      isRestStop: !!pointInput.isRestStop,
      isSupportPoint: !!pointInput.isSupportPoint,
      isDriverChange: !!pointInput.isDriverChange,
      isBoardingPoint: !!pointInput.isBoardingPoint,
      isDropoffPoint: !!pointInput.isDropoffPoint,
      isFreeStop: !!pointInput.isFreeStop,
      isInitial: false,
    };

    setRoutePoints((prev) => {
      const updated = [...prev, newPoint];
      return recalcAllRoutePoints(updated);
    });
  };

  // =====================================
  // 3) ATUALIZAR UM PONTO EXISTENTE
  // =====================================
  const handleUpdatePoint = (id: string, updates: Partial<RoutePoint>) => {
    setRoutePoints((prevPoints) => {
      const pointIndex = prevPoints.findIndex((p) => p.id === id);
      if (pointIndex === -1) return prevPoints;

      const newPoints = [...prevPoints];
      const updatedPoint: RoutePoint = {
        ...newPoints[pointIndex],
        ...updates,
      };

      // só recalcula saída se não for o ponto inicial
      if (updates.stopTimeMin !== undefined && pointIndex > 0) {
        updatedPoint.departureTime = addMinutesToTime(
          updatedPoint.arrivalTime,
          updatedPoint.stopTimeMin
        );
      }

      newPoints[pointIndex] = updatedPoint;

      // recalcula os pontos seguintes
      for (let i = pointIndex + 1; i < newPoints.length; i++) {
        const prevPoint = newPoints[i - 1];
        const current = { ...newPoints[i] };

        current.arrivalTime = addMinutesToTime(
          prevPoint.departureTime,
          current.driveTimeMin
        );
        current.departureTime = addMinutesToTime(
          current.arrivalTime,
          current.stopTimeMin
        );

        newPoints[i] = current;
      }

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
      if (index <= 0) return prevPoints; // já é o primeiro ou não achou
      if (prevPoints[index].isInitial) return prevPoints; // ponto inicial não se mexe

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
      if (prevPoints[index].isInitial) return prevPoints; // ponto inicial não se mexe

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
      if (!prevPoints.length) {
        // se não tiver nada, cai no fluxo normal de add no final
        // você pode chamar handleAddPoint aqui se quiser manter a lógica atual
        return prevPoints;
      }

      const anchorIndex = prevPoints.findIndex((p) => p.id === anchorPointId);
      if (anchorIndex === -1) {
        // âncora não encontrada: não faz nada (ou poderia cair em add no final)
        return prevPoints;
      }

      const loc = pointInput.location;

      const stopTimeMin = Number(pointInput.stopTimeMin ?? 5);

      // Aqui criamos um ponto "cru", sem se preocupar com distância/tempo.
      // O recalcAllRoutePoints vai recalcular tudo com base nas coordenadas.
      const newPoint: RoutePoint = {
        id: String(loc.id),
        order: anchorIndex + 2, // valor provisório, será reordenado no recalc
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

        isRestStop: !!pointInput.isRestStop,
        isSupportPoint: !!pointInput.isSupportPoint,
        isDriverChange: !!pointInput.isDriverChange,
        isBoardingPoint: !!pointInput.isBoardingPoint,
        isDropoffPoint: !!pointInput.isDropoffPoint,
        isFreeStop: !!pointInput.isFreeStop,

        // inserção no meio nunca mexe no ponto inicial;
        // o recalcAllRoutePoints vai respeitar o isInitial já existente
        isInitial: false,
      };

      const updated = [...prevPoints];
      // insere DEPOIS do ponto âncora
      updated.splice(anchorIndex + 1, 0, newPoint);

      // recalcula ordem, distâncias, tempos e horários com base no ponto inicial e tripTime
      return recalcAllRoutePoints(updated);
    });
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

  // distância inválida ou negativa -> 30 min
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
    return FIXED_MINUTES;
  }

  // até 15 km -> sempre 30 min (regra fixa)
  if (distanceKm < 15) {
    return FIXED_MINUTES;
  }

  // se veio velocidade customizada do modal, respeita ela
  let speed: number | null = null;
  if (typeof customSpeed === "number" && customSpeed > 0) {
    speed = customSpeed;
  } else {
    // regra padrão da planilha
    speed =
      distanceKm >= 10 && distanceKm <= 100 ? SPEED_IN_RANGE : SPEED_OUT_RANGE;
  }

  const timeHours = distanceKm / speed;
  const minutes = Math.round(timeHours * 60);

  // failsafe: se algo der NaN/Infinity, cai para 30 min
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
  initialPoint.departureTime =
    tripStartTime || initialPoint.departureTime || "00:00";

  const stopInitial = initialPoint.stopTimeMin ?? 0;
  const initialArrivalMin = startMinutes - stopInitial;
  initialPoint.arrivalTime =
    initialArrivalMin >= 0 ? toTimeString(initialArrivalMin) : "";

  // pra frente
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

  // pra trás
  for (let i = initialIndex - 1; i >= 0; i--) {
    const current = result[i];
    const nextPoint = result[i + 1];

    const departureNextMin = toMinutes(nextPoint.departureTime);
    if (departureNextMin === null) break;

    const stopTimeNext = nextPoint.stopTimeMin ?? 0;
    const driveTimeMin = nextPoint.driveTimeMin ?? 0;
    const stopTimeCurrent = current.stopTimeMin ?? 0;

    const arrivalNextMin = departureNextMin - stopTimeNext;
    const departureCurrentMin = arrivalNextMin - driveTimeMin;
    const arrivalCurrentMin = departureCurrentMin - stopTimeCurrent;

    current.departureTime = toTimeString(departureCurrentMin);
    current.arrivalTime = toTimeString(arrivalCurrentMin);
  }

  return result;
}
