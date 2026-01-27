import { Clock, Gauge, Route } from "lucide-react";

import { Card } from "@/components/ui/card";
import { ANTTAlert } from "@/components/scheme/ANTTAlert";

import type { RoutePoint } from "@/types/scheme";

export type ANTTAlertData = {
  type: "success" | "warning" | "error";
  message: string;
};

interface DetailPointCardProps {
  point: RoutePoint;
  index: number;
  alerts?: ANTTAlertData[]; // ✅ vem pronto (backend) ou vazio
}

const pointTypeLabels: Record<string, string> = {
  PE: "Ponto de Embarque",
  PD: "Ponto de Desembarque",
  PP: "Ponto de Parada",
  PA: "Ponto de Apoio",
  TMJ: "Troca de Motorista",
  PL: "Ponto Livre",
};

function getPointBadges(point: RoutePoint) {
  const badges: { key: string; label: string; title: string }[] = [];

  // ✅ Prioridade operacional
  if (point.isDriverChange) {
    badges.push({ key: "TM", label: "TM", title: "Troca de motorista" });
  }

  if (point.isSupportPoint) {
    badges.push({ key: "AP", label: "AP", title: "Ponto de apoio" });
  }

  // OP (ponto_operacional) — só quando existir no RoutePoint no futuro
  // if ((point as any).isOperationalPoint) {
  //   badges.push({ key: "OP", label: "OP", title: "Ponto operacional" });
  // }

  if (point.isFreeStop) {
    badges.push({ key: "LV", label: "LV", title: "Parada livre" });
  }

  // Evitar redundância com o tipo principal
  if (point.isBoardingPoint && point.type !== "PE") {
    badges.push({ key: "EMB", label: "EMB", title: "Embarque" });
  }
  if (point.isDropoffPoint && point.type !== "PD") {
    badges.push({ key: "DES", label: "DES", title: "Desembarque" });
  }

  // DS nunca (decisão sua)
  // if (point.isRestStop) ...

  const order = ["TM", "AP", "OP", "LV", "EMB", "DES"];
  badges.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));

  return badges;
}

export function DetailPointCard({
  point,
  index,
  alerts = [],
}: DetailPointCardProps) {
  const isInitial = !!point.isInitial;
  const city = point.location?.city ?? "";
  const state = point.location?.state ?? "";
  const description =
    point.location?.name ?? point.location?.shortName ?? `${city} / ${state}`;

  const avgSpeed =
    point.driveTimeMin > 0
      ? Number((point.distanceKm / (point.driveTimeMin / 60)).toFixed(1))
      : 0;
  const badges = getPointBadges(point);

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
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200 whitespace-nowrap">
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

          <div className="flex flex-col items-end gap-2 text-right">
            {badges.length > 0 && (
              <div className="flex flex-wrap justify-end gap-1">
                {badges.map((b) => (
                  <span
                    key={b.key}
                    title={b.title}
                    className="inline-flex items-center rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 whitespace-nowrap"
                  >
                    {b.label}
                  </span>
                ))}
              </div>
            )}

            <div>
              <p className="text-slate-600 text-xs">Distância Acumulada</p>
              <p className="text-slate-900 font-medium">
                {(point.cumulativeDistanceKm ?? 0).toFixed(1)} km
              </p>
            </div>
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
            <p className="text-slate-900">
              {formatClockHHMM(point.arrivalTime)}
            </p>
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
            <p className="text-slate-900">
              {formatClockHHMM(point.departureTime)}
            </p>
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

        {/* Tipo */}
        <div className="pb-4 border-b border-slate-200 mb-4">
          <p className="text-slate-600 text-xs mb-1">Tipo de Ponto</p>
          <p className="text-slate-900 text-sm">
            {pointTypeLabels[point.type] || point.type}
          </p>
        </div>

        {/* Alertas (vêm do backend) */}
        {alerts.length > 0 && (
          <div>
            <p className="text-slate-600 text-xs mb-2">
              Regras ANTT / Observações
            </p>
            <div className="space-y-2">
              {alerts.map((alert, i) => (
                <ANTTAlert key={`${point.id}-alert-${i}`} alert={alert} />
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

// "26:16" -> "02:16 (+1d)"
function formatClockHHMM(value?: string) {
  if (!value) return "—";
  const [hhStr, mmStr] = value.split(":");
  const hh = Number(hhStr);
  const mm = Number(mmStr);

  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return value;

  const extraDays = Math.floor(hh / 24);
  const normalizedH = hh % 24;

  const base = `${String(normalizedH).padStart(2, "0")}:${String(mm).padStart(
    2,
    "0"
  )}`;

  return extraDays > 0 ? `${base} (+${extraDays}d)` : base;
}
