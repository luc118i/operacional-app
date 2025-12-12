// src/components/scheme/DetailSummary.tsx
import {
  Clock,
  Route,
  MapPin,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import type { OperationalScheme, RoutePoint } from "@/types/scheme";
import type { LinhaMeta } from "@/types/linhas";

interface DetailSummaryProps {
  scheme: OperationalScheme & { routePoints: RoutePoint[] };
  linhaMeta?: LinhaMeta;
}

export function DetailSummary({ scheme, linhaMeta }: DetailSummaryProps) {
  // 🔢 Valores vindos do summary da API (mapToOperationalScheme)
  const totalKm = scheme.totalKm ?? 0;
  const totalStops = scheme.totalStops ?? 0;
  const expectedStops = scheme.totalExpectedStops ?? 0;

  const totalTravelMinutes = scheme.totalTravelMinutes ?? 0;
  const totalStopMinutes = scheme.totalStopMinutes ?? 0;
  const totalDurationMinutes =
    scheme.totalDurationMinutes ?? totalTravelMinutes + totalStopMinutes;
  const totalPcs = scheme.totalPontos ?? 0;

  const averageSpeedKmH =
    scheme.averageSpeedKmH ??
    (totalTravelMinutes > 0
      ? Number((totalKm / (totalTravelMinutes / 60)).toFixed(1))
      : 0);

  const rulesStatus = scheme.rulesStatus ?? {
    status: "OK",
    message: "Dentro das regras",
  };

  // 🎨 Cores / ícones conforme status das regras
  const isOk = rulesStatus.status === "OK";
  const isWarning = rulesStatus.status === "WARNING";

  const rulesBgClass = isOk
    ? "bg-green-100"
    : isWarning
    ? "bg-yellow-100"
    : "bg-red-100";

  const rulesTextClass = isOk
    ? "text-green-700"
    : isWarning
    ? "text-yellow-700"
    : "text-red-700";

  const rulesBorderClass = isOk
    ? "border-green-200"
    : isWarning
    ? "border-yellow-200"
    : "border-red-200";

  return (
    <Card className="p-6 bg-gradient-to-br from-white to-slate-50 shadow-md border-slate-200">
      <h2 className="text-slate-900 mb-1">Resumo da Viagem</h2>

      {/* 🆕 Mesclagem banco + JSON (Empresa + Prefixo) */}
      {linhaMeta && (
        <p className="text-xs text-slate-500 mb-5">
          {linhaMeta["Nome Empresa"]} • Prefixo{" "}
          <span className="font-semibold text-slate-800">
            {linhaMeta.Prefixo}
          </span>
        </p>
      )}

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Regras ANTT */}
        <Card className={`p-4 border-2 shadow-sm bg-white ${rulesBorderClass}`}>
          <div className="flex items-start justify-between mb-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${rulesBgClass}`}
            >
              {isOk ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : isWarning ? (
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
            </div>
          </div>
          <p className="text-slate-600 text-sm mb-1">Regras ANTT</p>
          <p className={`text-sm ${rulesTextClass}`}>
            {rulesStatus.message ?? "Dentro das regras"}
          </p>
        </Card>

        {/* Total de Paradas */}
        <Card className="p-4 border-2 border-slate-200 shadow-sm bg-white">
          <div className="flex items-start justify-between mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-slate-600 text-sm mb-1">Total de Paradas</p>
          <p className="text-slate-900 text-2xl">{totalStops}</p>
        </Card>

        {/* Paradas Esperadas */}
        <Card className="p-4 border-2 border-slate-200 shadow-sm bg-white">
          <div className="flex items-start justify-between mb-2">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-purple-600" />
            </div>
          </div>

          <p className="text-slate-600 text-sm mb-1">Paradas em PCs</p>

          {/* Número principal: PCs REALIZADOS */}
          <p className="text-slate-900 text-2xl">{totalPcs}</p>

          {/* Texto auxiliar: contexto do esperado */}
          <p className="text-slate-600 text-sm mt-1">
            realizado{totalPcs !== 1 ? "s" : ""} de{" "}
            <span className="font-semibold">{expectedStops}</span> esperado
            {expectedStops !== 1 ? "s" : ""}.
          </p>

          {/* Regra de cálculo */}
          <p className="text-slate-500 text-xs mt-1">
            ({totalKm.toFixed(0)} km / 495)
          </p>
        </Card>

        {/* Total de KMs */}
        <Card className="p-4 border-2 border-slate-200 shadow-sm bg-white">
          <div className="flex items-start justify-between mb-2">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Route className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-slate-600 text-sm mb-1">Total de KMs</p>
          <p className="text-slate-900 text-2xl">{totalKm.toFixed(0)}</p>
          <p className="text-slate-500 text-xs mt-1">km</p>
        </Card>

        {/* Tempo Total */}
        <Card className="p-4 border-2 border-slate-200 shadow-sm bg-white">
          <div className="flex items-start justify-between mb-2">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <p className="text-slate-600 text-sm mb-1">Tempo Total</p>
          <p className="text-slate-900 text-2xl">
            {formatMinutesToHours(totalDurationMinutes)}
          </p>
        </Card>
      </div>

      {/* Detalhes adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
        <div>
          <p className="text-slate-600 text-sm mb-1">
            Tempo de Viagem (deslocamento)
          </p>
          <p className="text-slate-900">
            {formatMinutesToHours(totalTravelMinutes)}
          </p>
        </div>
        <div>
          <p className="text-slate-600 text-sm mb-1">Tempo Total de Paradas</p>
          <p className="text-slate-900">
            {formatMinutesToHours(totalStopMinutes)}
          </p>
        </div>
        <div>
          <p className="text-slate-600 text-sm mb-1">Velocidade Média Geral</p>
          <p className="text-slate-900">{averageSpeedKmH.toFixed(1)} km/h</p>
        </div>
      </div>
    </Card>
  );
}

function formatMinutesToHours(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}
