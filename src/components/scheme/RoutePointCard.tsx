import { useState, type ReactNode } from "react";

import {
  Trash2,
  ChevronDown,
  ChevronUp,
  Gauge,
  Route,
  ArrowUp,
  ArrowDown,
  Plus,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ANTTAlert } from "@/components/scheme/ANTTAlert";

import type { RoutePoint } from "@/types/scheme";
import type { ANTTAlertData } from "@/lib/anttRules";

interface RoutePointCardProps {
  point: RoutePoint;
  index: number;
  alerts: ANTTAlertData[];
  onUpdate: (id: string, updates: Partial<RoutePoint>) => void;
  onDelete: (id: string) => void;

  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  onInsertAfter?: (id: string) => void;
  previousPoint?: RoutePoint | null;
}

const pointTypes = [
  { value: "PE", label: "PE - Ponto de Embarque" },
  { value: "PD", label: "PD - Ponto de Desembarque" },
  { value: "PP", label: "PP - Ponto de Parada" },
  { value: "PA", label: "PA - Ponto de Apoio" },
  { value: "TMJ", label: "TMJ - Troca de Motorista em Jornada" },
  { value: "PL", label: "PL - Ponto Livre" },
];

const localTimeOptions = [
  { value: 5, label: "00:05" },
  { value: 10, label: "00:10" },
  { value: 15, label: "00:15" },
  { value: 20, label: "00:20" },
  { value: 30, label: "00:30" },
  { value: 45, label: "00:45" },
  { value: 60, label: "01:00" },
  { value: 90, label: "01:30" },
  { value: 120, label: "02:00" },
];

export function RoutePointCard({
  point,
  index,
  alerts,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onInsertAfter,
  previousPoint,
}: RoutePointCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const city = point.location?.city ?? "";
  const state = point.location?.state ?? "";
  const name = point.location?.name ?? `${city}${state ? " / " + state : ""}`;

  const avgSpeed =
    point.driveTimeMin > 0
      ? Number((point.distanceKm / (point.driveTimeMin / 60)).toFixed(1))
      : 0;

  let supportText: ReactNode = null;

  if (index === 0) {
    supportText = (
      <>
        {point.isInitial
          ? "Ponto inicial da viagem • 0 km desde o ponto anterior • 0 km acumulados"
          : "Primeiro ponto da rota • 0 km desde o ponto anterior • 0 km acumulados"}
      </>
    );
  } else if (previousPoint) {
    const prevCity = previousPoint.location?.city ?? "";
    const prevState = previousPoint.location?.state ?? "";
    const prevName = previousPoint.location?.name ?? "";

    let prevLabel = "ponto anterior";

    if (prevName) {
      prevLabel = prevName;
    } else if (prevCity || prevState) {
      prevLabel = `${prevCity}${prevState ? " / " + prevState : ""}`;
    }

    const driveTimeStr = formatMinutesToHours(point.driveTimeMin);
    const distanceStr = `${point.distanceKm.toFixed(1)} km`;
    const cumulativeStr = `${point.cumulativeDistanceKm.toFixed(
      1
    )} km acumulados`;

    supportText = (
      <span>
        Trecho anterior: de{" "}
        <strong className="font-semibold text-slate-900">{prevLabel}</strong>{" "}
        até aqui foram{" "}
        <strong className="font-semibold text-blue-700">{distanceStr}</strong>{" "}
        em <span className="italic">{driveTimeStr}</span> (
        <span className="font-medium text-slate-800">{avgSpeed} km/h</span>) •{" "}
        {cumulativeStr}
      </span>
    );
  }

  const isInitial = !!point.isInitial;

  return (
    // destaque extra para o ponto marcado como início da viagem
    <Card
      className={`relative overflow-hidden group border ${
        isInitial
          ? "border-blue-400 bg-blue-50/40"
          : "border-slate-200 bg-white"
      }`}
    >
      {/* ===== Header do Card ===== */}
      <div className="bg-gradient-to-r from-slate-50/80 to-white p-4 border-b border-slate-200/70">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-slate-900 font-semibold truncate">
                  {city} / {state}
                </h3>

                {isInitial && (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    Início da viagem
                  </span>
                )}
              </div>

              {name && (
                <p className="text-slate-600 text-xs truncate">{name}</p>
              )}
              {supportText && (
                <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                  {supportText}
                </p>
              )}
            </div>
          </div>

          {/* ===== Ações do Header (move + expand + delete) ===== */}
          <div className="flex items-center gap-1">
            {(onMoveUp || onMoveDown || onInsertAfter) && (
              <div className="flex items-center gap-1 mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onMoveUp && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50"
                    onClick={() => onMoveUp(String(point.id))}
                  >
                    <ArrowUp className="w-3.5 h-3.5 text-slate-600" />
                  </Button>
                )}

                {onInsertAfter && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50"
                    onClick={() => onInsertAfter(String(point.id))}
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-600" />
                  </Button>
                )}

                {onMoveDown && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50"
                    onClick={() => onMoveDown(String(point.id))}
                  >
                    <ArrowDown className="w-3.5 h-3.5 text-slate-600" />
                  </Button>
                )}
              </div>
            )}

            {/* expandir/retrair */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-slate-600 hover:text-slate-900"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>

            {/* excluir (sempre o último) */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(String(point.id))}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ===== Conteúdo do Card ===== */}
      {isExpanded && (
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
            {/* Hr. Chegada */}
            <div>
              <label className="text-slate-600 text-xs mb-1.5 block">
                Hr. Chegada
              </label>
              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 text-sm">
                {point.arrivalTime}
              </div>
            </div>

            {/* Temp. Local (editável) */}
            <div>
              <label className="text-slate-600 text-xs mb-1.5 block">
                Temp. Local
              </label>
              <select
                value={String(point.stopTimeMin)}
                onChange={(e) =>
                  onUpdate(String(point.id), {
                    stopTimeMin: Number(e.target.value),
                  })
                }
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {localTimeOptions.map((option) => (
                  <option key={option.value} value={String(option.value)}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Hr. Saída */}
            <div>
              <label className="text-slate-600 text-xs mb-1.5 block">
                Hr. Saída
              </label>
              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 text-sm">
                {point.departureTime}
              </div>
            </div>

            {/* Temp. Desloc. */}
            <div>
              <label className="text-slate-600 text-xs mb-1.5 block">
                Temp. Desloc.
              </label>
              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 text-sm">
                {formatMinutesToHours(point.driveTimeMin)}
              </div>
            </div>

            {/* Vel. Média */}
            <div>
              <label className="text-slate-600 text-xs mb-1.5 block">
                Vel. Média
              </label>
              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 text-sm flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-slate-500" />
                <span>{avgSpeed} km/h</span>
              </div>
            </div>

            {/* Distância */}
            <div>
              <label className="text-slate-600 text-xs mb-1.5 block">
                Distância
              </label>
              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 text-sm flex items-center gap-1">
                <Route className="w-3.5 h-3.5 text-slate-500" />
                <span>{point.distanceKm.toFixed(1)} km</span>
              </div>
            </div>

            {/* Tipo de Ponto */}
            <div>
              <label className="text-slate-600 text-xs mb-1.5 block">
                Tipo
              </label>
              <select
                value={point.type}
                onChange={(e) =>
                  onUpdate(String(point.id), {
                    type: e.target.value as RoutePoint["type"],
                  })
                }
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {pointTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Alertas ANTT */}
          {alerts.length > 0 && (
            <div className="space-y-2 mt-2">
              <label className="text-slate-600 text-xs block">
                Regras ANTT / Observações
              </label>
              <div className="space-y-2">
                {alerts.map((alert, idx) => (
                  <ANTTAlert key={idx} alert={alert} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function formatMinutesToHours(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const hours = Math.floor(m / 60);
  const mins = m % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins)
    .toString()
    .padStart(2, "0")}`;
}
