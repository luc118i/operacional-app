import { Clock, MapPin, Gauge, Route } from "lucide-react";

import { Card } from "@/components/ui/card";
import { ANTTAlert } from "@/components/scheme/ANTTAlert";

import type { RoutePoint } from "@/types/scheme";

interface DetailPointCardProps {
  point: RoutePoint;
  index: number;
}

const pointTypeLabels: Record<string, string> = {
  PE: "Ponto de Embarque",
  PD: "Ponto de Desembarque",
  PP: "Ponto de Parada",
  PA: "Ponto de Apoio",
  TMJ: "Troca de Motorista",
  PL: "Ponto Livre",
};

export function DetailPointCard({ point, index }: DetailPointCardProps) {
  const isInitial = !!point.isInitial;
  const city = point.location?.city ?? "";
  const state = point.location?.state ?? "";
  const description =
    point.location?.name ?? point.location?.shortName ?? `${city} / ${state}`;

  const avgSpeed =
    point.driveTimeMin > 0
      ? Number((point.distanceKm / (point.driveTimeMin / 60)).toFixed(1))
      : 0;

  const alerts = generateANTTAlerts(point, index, avgSpeed);

  return (
    <Card
      className={`overflow-hidden ${
        isInitial
          ? "border border-blue-400 ring-1 ring-blue-200 bg-blue-50/40"
          : "border border-slate-200"
      }`}
    >
      {/* ===================== HEADER ===================== */}
      <div className="bg-gradient-to-r from-slate-50 to-white p-4 border-b border-slate-200">
        <div className="flex items-start justify-between gap-4">
          {/* ESQUERDA */}
          <div className="flex items-start gap-3 flex-1">
            {/* Ordem */}
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white flex-shrink-0">
              {index + 1}
            </div>

            <div className="flex-1 min-w-0">
              {/* Linha: Descrição + badge "Início da viagem" */}
              <div className="flex items-center gap-2">
                <h3 className="text-slate-900 text-base font-medium truncate">
                  {description}
                </h3>

                {isInitial && (
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px]
        font-semibold bg-blue-100 text-blue-800 border border-blue-200 whitespace-nowrap"
                  >
                    Início da viagem
                  </span>
                )}
              </div>

              {/* Cidade / UF */}
              <p className="text-slate-600 text-sm truncate">
                {city} {city && state && "/"} {state}
              </p>
            </div>
          </div>

          {/* DIREITA */}
          <div className="text-right">
            <p className="text-slate-600 text-xs">Distância Acumulada</p>
            <p className="text-slate-900 font-medium">
              {point.cumulativeDistanceKm.toFixed(1)} km
            </p>
          </div>
        </div>
      </div>

      {/* ===================== CONTEÚDO ===================== */}
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
          <div>
            <p className="text-slate-600 text-xs mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Chegada
            </p>
            <p className="text-slate-900">{point.arrivalTime}</p>
          </div>

          <div>
            <p className="text-slate-600 text-xs mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Temp. Local
            </p>
            <p className="text-slate-900">
              {formatMinutesToHours(point.stopTimeMin)}
            </p>
          </div>

          <div>
            <p className="text-slate-600 text-xs mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Saída
            </p>
            <p className="text-slate-900">{point.departureTime}</p>
          </div>

          <div>
            <p className="text-slate-600 text-xs mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Temp. Desloc.
            </p>
            <p className="text-slate-900">
              {formatMinutesToHours(point.driveTimeMin)}
            </p>
          </div>

          <div>
            <p className="text-slate-600 text-xs mb-1 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5" /> Vel. Média
            </p>
            <p className="text-slate-900">{avgSpeed} km/h</p>
          </div>

          <div>
            <p className="text-slate-600 text-xs mb-1 flex items-center gap-1.5">
              <Route className="w-3.5 h-3.5" /> Distância
            </p>
            <p className="text-slate-900">{point.distanceKm.toFixed(1)} km</p>
          </div>
        </div>

        {/* Tipo (somente aqui, não no header) */}
        <div className="pb-4 border-b border-slate-200 mb-4">
          <p className="text-slate-600 text-xs mb-1">Tipo de Ponto</p>
          <p className="text-slate-900 text-sm">
            {pointTypeLabels[point.type] || point.type}
          </p>
        </div>

        {/* Alertas */}
        {alerts.length > 0 && (
          <div>
            <p className="text-slate-600 text-xs mb-2">
              Regras ANTT / Observações
            </p>
            <div className="space-y-2">
              {alerts.map((alert, i) => (
                <ANTTAlert key={i} alert={alert} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ===================== HELPERS ===================== */

function formatMinutesToHours(min: number) {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

interface ANTTAlertData {
  type: "success" | "warning" | "error";
  message: string;
}

function generateANTTAlerts(
  point: RoutePoint,
  index: number,
  avgSpeed: number
): ANTTAlertData[] {
  const alerts: ANTTAlertData[] = [];
  const accumulated = point.cumulativeDistanceKm ?? 0;

  // Helper genérico: aplica a regra da margem de 8%
  // - acima do limite  -> ERROR
  // - mais de 8% abaixo do limite -> WARNING (antecipado)
  // - dentro da faixa [92%..100%] -> sem alerta
  const distanceAlertWithMargin = (
    label: string,
    limitKm: number,
    distanceKm: number
  ) => {
    if (!Number.isFinite(distanceKm) || distanceKm <= 0) return;

    const upper = limitKm;
    const lower = limitKm * 0.92; // 8% abaixo do limite

    if (distanceKm > upper) {
      alerts.push({
        type: "error",
        message: `${label} além do limite (${distanceKm.toFixed(
          1
        )} / ${upper} km)`,
      });
    } else if (distanceKm < lower) {
      alerts.push({
        type: "warning",
        message: `${label} antecipado (${distanceKm.toFixed(1)} / ${upper} km)`,
      });
    }
  };

  // 🔵 1) Primeira parada de descanso – 330 km
  // (considerando que o índice 0 é o primeiro ponto "depois" da origem)
  if (index === 0 && point.type === "PP") {
    distanceAlertWithMargin("Primeiro ponto de parada", 330, accumulated);
  }

  // 🔵 2) Ponto de apoio – limite 495 km
  if (point.type === "PA") {
    distanceAlertWithMargin("Ponto de apoio", 495, accumulated);
  }

  // 🔵 3) Troca de motorista em jornada – limite 660 km
  if (point.type === "TMJ") {
    distanceAlertWithMargin("Troca de motorista", 660, accumulated);
  }

  // 🔵 4) Velocidade média alta
  if (avgSpeed > 90) {
    alerts.push({
      type: "warning",
      message: `Velocidade acima da recomendada (${avgSpeed} km/h)`,
    });
  }

  // 🔵 5) Tempo de parada muito curto em PP/PA
  if ((point.type === "PP" || point.type === "PA") && point.stopTimeMin < 20) {
    alerts.push({
      type: "warning",
      message: `O tempo de parada pode ser insuficiente (${formatMinutesToHours(
        point.stopTimeMin
      )})`,
    });
  }

  // 👇 Nenhum "success" aqui: o card só mostra algo quando há problema
  return alerts;
}
