// src/lib/anttRules.ts
import type { RoutePoint } from "@/types/scheme";

export type ANTTAlertType = "success" | "warning" | "error";

export type ANTTAlertData = {
  type: "success" | "warning" | "error";
  message: string;
};

// Limiares de regra (fácil de ajustar depois)
const FIRST_REST_MIN = 262; // km
const FIRST_REST_MAX = 330; // km

const SUPPORT_MIN = 402; // km
const SUPPORT_MAX = 495; // km

const DRIVER_CHANGE_MIN = 660; // km
const DRIVER_CHANGE_MAX = 900; // km (limite operacional sugerido)

const LONG_LEG_DISTANCE = 200; // km
const MIN_STOP_TIME = 20; // minutos

export function computeANTTAlertsForRoute(
  routePoints: RoutePoint[]
): Record<string, ANTTAlertData[]> {
  const alertsByPointId: Record<string, ANTTAlertData[]> = {};

  // Estado acumulado ao longo da rota
  let hasRestStop = false;
  let hasSupportPoint = false;
  let hasDriverChange = false;

  let hasShownMissingFirstRest = false;
  let hasShownMissingSupport = false;
  let hasShownMissingDriverChange = false;

  for (let i = 0; i < routePoints.length; i++) {
    const point = routePoints[i];
    const alerts: ANTTAlertData[] = [];

    const distanceKm = sanitizeNumber(point.distanceKm);
    const accumulated = sanitizeNumber(point.cumulativeDistanceKm);
    const stopTimeMin = sanitizeNumber(point.stopTimeMin);
    const type = point.type;

    const isRestStop = !!point.isRestStop; // parada descanso / PP
    const isSupportPoint = !!point.isSupportPoint; // PA
    const isDriverChange = !!point.isDriverChange; // TMJ

    // --------------------------------------------
    // 1) REGRAS LOCAIS DO TRECHO
    // --------------------------------------------

    // 1.1 Tempo de parada insuficiente (PP / PA / TMJ)
    const isStopType = type === "PP" || type === "PA" || type === "TMJ";
    if (isStopType && stopTimeMin > 0 && stopTimeMin < MIN_STOP_TIME) {
      alerts.push({
        type: "warning",
        message: `Tempo de parada pode ser insuficiente (${formatMinutes(
          stopTimeMin
        )})`,
      });
    }

    // 1.2 Trecho muito longo (> LONG_LEG_DISTANCE km)
    if (distanceKm > LONG_LEG_DISTANCE) {
      alerts.push({
        type: "warning",
        message: `Trecho muito longo (${distanceKm.toFixed(
          1
        )} km > ${LONG_LEG_DISTANCE} km sem parada)`,
      });
    }

    // --------------------------------------------
    // 2) PRIMEIRA PARADA OBRIGATÓRIA (DESCANSO)
    //    Faixa recomendada: 262–330 km acumulados
    // --------------------------------------------

    if (!hasRestStop && accumulated > FIRST_REST_MIN) {
      if (isRestStop || type === "PP") {
        // Este ponto está sendo usado como primeira parada
        if (accumulated >= FIRST_REST_MIN && accumulated <= FIRST_REST_MAX) {
          alerts.push({
            type: "success",
            message: `Primeira parada obrigatória dentro da faixa recomendada (${accumulated.toFixed(
              1
            )} km / ${FIRST_REST_MAX} km)`,
          });
        } else {
          alerts.push({
            type: "warning",
            message: `Primeira parada obrigatória fora da faixa recomendada (${accumulated.toFixed(
              1
            )} km – faixa ${FIRST_REST_MIN}–${FIRST_REST_MAX} km)`,
          });
        }
        hasRestStop = true;
      } else if (!hasShownMissingFirstRest) {
        // Já passamos de 262 km e ainda não houve parada válida
        alerts.push({
          type: "warning",
          message: `Até este trecho ainda não foi feita a primeira parada obrigatória (${FIRST_REST_MIN} km)`,
        });
        hasShownMissingFirstRest = true;
      }
    }

    // --------------------------------------------
    // 3) PONTO DE APOIO (PA) – Faixa 402–495 km
    // --------------------------------------------

    if (isSupportPoint || type === "PA") {
      if (accumulated >= SUPPORT_MIN && accumulated <= SUPPORT_MAX) {
        alerts.push({
          type: "success",
          message: `Ponto de apoio dentro da faixa obrigatória (${accumulated.toFixed(
            1
          )} km / ${SUPPORT_MAX} km)`,
        });
      } else {
        alerts.push({
          type: "warning",
          message: `Ponto de apoio fora da faixa obrigatória (${accumulated.toFixed(
            1
          )} km – faixa ${SUPPORT_MIN}–${SUPPORT_MAX} km)`,
        });
      }
      hasSupportPoint = true;
    } else if (
      !hasSupportPoint &&
      accumulated > SUPPORT_MIN &&
      !hasShownMissingSupport
    ) {
      alerts.push({
        type: "warning",
        message: `Até este trecho ainda não há ponto de apoio obrigatório (${SUPPORT_MIN} km)`,
      });
      hasShownMissingSupport = true;
    }

    // --------------------------------------------
    // 4) TROCA DE MOTORISTA EM JORNADA (TMJ)
    //    Limite mínimo: 660 km (até máx. DRIVER_CHANGE_MAX)
    // --------------------------------------------

    if (isDriverChange || type === "TMJ") {
      if (
        accumulated >= DRIVER_CHANGE_MIN &&
        accumulated <= DRIVER_CHANGE_MAX
      ) {
        alerts.push({
          type: "success",
          message: `Troca de motorista dentro da faixa obrigatória (${accumulated.toFixed(
            1
          )} km / ${DRIVER_CHANGE_MIN} km)`,
        });
      } else {
        alerts.push({
          type: "warning",
          message: `Troca de motorista fora da faixa recomendada (${accumulated.toFixed(
            1
          )} km – mínimo ${DRIVER_CHANGE_MIN} km)`,
        });
      }
      hasDriverChange = true;
    } else if (
      !hasDriverChange &&
      accumulated > DRIVER_CHANGE_MIN &&
      !hasShownMissingDriverChange
    ) {
      alerts.push({
        type: "warning",
        message: `Até este trecho ainda não ocorreu a troca de motorista obrigatória (${DRIVER_CHANGE_MIN} km)`,
      });
      hasShownMissingDriverChange = true;
    }

    // --------------------------------------------
    // 5) GUARDA ALERTAS DO PONTO
    // --------------------------------------------
    alertsByPointId[String(point.id)] = alerts;
  }

  return alertsByPointId;
}

// --------------------------
// HELPERS LOCAIS
// --------------------------

function sanitizeNumber(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return value;
}

function formatMinutes(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}
