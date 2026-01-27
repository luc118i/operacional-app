// src/components/scheme/RouteSummary.tsx
import {
  Clock,
  Route,
  MapPin,
  AlertCircle,
  CheckCircle,
  Landmark,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type { RoutePoint } from "@/types/scheme";

import type { RuleIssue, RulesOverview, RulesSourceUsed } from "@/lib/rules";

interface RouteSummaryProps {
  routePoints: RoutePoint[];
  tripStartTime: string;

  ruleIssues?: RuleIssue[];
  rulesOverview?: RulesOverview;
  rulesSourceUsed?: RulesSourceUsed;

  // Infos já mescladas (banco + JSON) vindo de fora
  originCity?: string;
  originState?: string;
  destinationCity?: string;
  destinationState?: string;
  originInstallation?: string;
  destinationInstallation?: string;
  companyName?: string; // "Nome Empresa"
  prefix?: string; // "Prefixo" (do banco/JSON)
  status?: string; // "Situação"
}

export function RouteSummary({
  routePoints,
  tripStartTime,
  ruleIssues,
  rulesOverview,
  rulesSourceUsed,

  originCity,
  originState,
  destinationCity,
  destinationState,
  originInstallation,
  destinationInstallation,
  companyName,
  prefix,
  status,
}: RouteSummaryProps) {
  // Totais baseados na estrutura REAL do RoutePoint:
  // - stopTimeMin: tempo parado no ponto (min)
  // - driveTimeMin: tempo de deslocamento (min)
  // - cumulativeDistanceKm: distância acumulada desde o início (km)

  const totalStopTime = routePoints.reduce(
    (sum, point) => sum + (point.stopTimeMin ?? 0),
    0
  );

  const totalTravelTime = routePoints.reduce(
    (sum, point) => sum + (point.driveTimeMin ?? 0),
    0
  );

  const totalTime = totalStopTime + totalTravelTime;

  const lastPoint = routePoints[routePoints.length - 1];
  const totalDistance = lastPoint?.cumulativeDistanceKm ?? 0;
  const totalPoints = routePoints.length;

  // Verificar conformidade ANTT
  const anttChecks = checkANTTCompliance(routePoints);

  // Velocidade média geral (km/h)
  const generalAvgSpeed =
    totalTravelTime > 0
      ? ((totalDistance / totalTravelTime) * 60).toFixed(1)
      : "0.0";

  const statusStyles = getStatusStyles(status);

  const issues = ruleIssues ?? [];
  const overview = rulesOverview;

  return (
    <Card className="p-6 bg-gradient-to-br from-slate-50 to-white border-slate-200 shadow-sm">
      <h2 className="text-slate-900 mb-3">Resumo da Viagem</h2>

      {/* Bloco de contexto da linha / empresa */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-wide uppercase text-slate-500">
            {companyName || "Empresa não informada"}
          </p>
          <p className="text-sm text-slate-600">
            Prefixo{" "}
            <span className="font-semibold text-slate-900">
              {prefix || "--"}
            </span>
          </p>
        </div>

        {status && (
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${statusStyles.bg} ${statusStyles.text} ${statusStyles.border}`}
          >
            <span
              className={`h-2 w-2 rounded-full ${statusStyles.dot}`}
              aria-hidden="true"
            />
            {status}
          </span>
        )}
      </div>

      {/* Bloco de rota: municípios + instalações */}
      {(originCity || destinationCity) && (
        <div className="mb-6 space-y-1">
          {/* Linha 1 - Municípios */}
          <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <MapPin className="h-4 w-4 text-slate-500" />
            <span>
              {originCity || "Origem não informada"}
              {originState ? ` (${originState})` : ""} &rarr{" "}
              {destinationCity || "Destino não informado"}
              {destinationState ? ` (${destinationState})` : ""}
            </span>
          </div>

          {/* Linha 2 - Instalações */}
          {(originInstallation || destinationInstallation) && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Landmark className="h-4 w-4" />
              <span
                className="truncate"
                title={`${originInstallation || "Origem não informada"} → ${
                  destinationInstallation || "Destino não informado"
                }`}
              >
                {originInstallation || "Origem não informada"} &rarr{" "}
                {destinationInstallation || "Destino não informado"}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Métricas principais */}
      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Tempo de Paradas */}
        <div className="p-4 bg-white border border-slate-200 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-slate-600 text-sm">Tempo de Paradas</p>
              <p className="text-slate-900">
                {formatMinutesToHours(totalStopTime)}
              </p>
            </div>
          </div>
        </div>

        {/* Tempo Total */}
        <div className="p-4 bg-white border border-slate-200 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-slate-600 text-sm">Tempo Total</p>
              <p className="text-slate-900">
                {formatMinutesToHours(totalTime)}
              </p>
            </div>
          </div>
        </div>

        {/* Distância Total */}
        <div className="p-4 bg-white border border-slate-200 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Route className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-slate-600 text-sm">Distância Total</p>
              <p className="text-slate-900">{totalDistance.toFixed(1)} km</p>
            </div>
          </div>
        </div>

        {/* Total de Pontos */}
        <div className="p-4 bg-white border border-slate-200 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-slate-600 text-sm">Total de Pontos</p>
              <p className="text-slate-900">{totalPoints}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Resumo ANTT */}
      {/* Resumo ANTT / Regras */}
      <div className="border-t border-slate-200 pt-4">
        <h3 className="text-slate-900 mb-3">Conformidade ANTT</h3>

        {overview ? (
          <div className="space-y-2">
            <div
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                overview.overallStatus === "OK"
                  ? "bg-green-50 border-green-200"
                  : overview.overallStatus === "WARNING"
                  ? "bg-amber-50 border-amber-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              {overview.overallStatus === "OK" ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              )}

              <div className="flex-1">
                <p
                  className={`text-sm ${
                    overview.overallStatus === "OK"
                      ? "text-green-800"
                      : overview.overallStatus === "WARNING"
                      ? "text-amber-800"
                      : "text-red-800"
                  }`}
                >
                  {overview.summaryMessage}
                </p>

                <p className="mt-1 text-xs text-slate-600">
                  Fonte:{" "}
                  {rulesSourceUsed === "backend"
                    ? "Backend"
                    : rulesSourceUsed === "local"
                    ? "Fallback local"
                    : "—"}{" "}
                  • Alertas: {overview.alertCount} • Sugestões:{" "}
                  {overview.suggestionCount}
                </p>
              </div>
            </div>

            {/* Lista curta (top 5) */}
            {issues.length > 0 && (
              <div className="space-y-2">
                {issues.slice(0, 5).map((i) => (
                  <div
                    key={i.key}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      i.severity === "ALERT"
                        ? "bg-red-50 border-red-200"
                        : "bg-amber-50 border-amber-200"
                    }`}
                  >
                    {i.severity === "ALERT" ? (
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm text-slate-800">{i.message}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        Ponto #{i.anchor.order}
                        {i.anchor.label ? ` • ${i.anchor.label}` : ""} •{" "}
                        {i.ruleCode}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-slate-600">
            Sem avaliação de regras disponível.
          </div>
        )}
      </div>

      {/* Horários */}
      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-slate-600 text-sm">Horário de Início</p>
            <p className="text-slate-900 mt-1">{tripStartTime}</p>
          </div>
          <div>
            <p className="text-slate-600 text-sm">
              Horário Previsto de Chegada
            </p>
            <p className="text-slate-900 mt-1">
              {lastPoint?.arrivalTime || "--:--"}
            </p>
          </div>
          <div>
            <p className="text-slate-600 text-sm">Velocidade Média Geral</p>
            <p className="text-slate-900 mt-1">{generalAvgSpeed} km/h</p>
          </div>
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

interface ANTTCheck {
  compliant: boolean;
  message: string;
}

// Helper para calcular velocidade média de um ponto (km/h)
function getPointAvgSpeed(point: RoutePoint): number {
  if (!point.driveTimeMin || point.driveTimeMin <= 0 || !point.distanceKm) {
    return 0;
  }
  return Number((point.distanceKm / (point.driveTimeMin / 60)).toFixed(1));
}

function checkANTTCompliance(routePoints: RoutePoint[]): ANTTCheck[] {
  const checks: ANTTCheck[] = [];

  if (routePoints.length === 0) {
    return [{ compliant: false, message: "Nenhum ponto adicionado à rota" }];
  }

  const lastPoint = routePoints[routePoints.length - 1];
  const totalDistance = lastPoint?.cumulativeDistanceKm ?? 0;

  // Pontos de parada (PP)
  const stopPoints = routePoints.filter((p) => p.type === "PP");
  if (totalDistance > 262 && stopPoints.length === 0) {
    checks.push({
      compliant: false,
      message: "Falta ponto de parada obrigatória (distância acima de 262 km)",
    });
  } else if (stopPoints.length > 0) {
    checks.push({
      compliant: true,
      message: `${stopPoints.length} ponto(s) de parada configurado(s)`,
    });
  }

  // Pontos de apoio (PA)
  const supportPoints = routePoints.filter((p) => p.type === "PA");
  if (totalDistance > 402 && supportPoints.length === 0) {
    checks.push({
      compliant: false,
      message: "Falta ponto de apoio obrigatório (distância acima de 402 km)",
    });
  } else if (supportPoints.length > 0) {
    checks.push({
      compliant: true,
      message: `${supportPoints.length} ponto(s) de apoio configurado(s)`,
    });
  }

  // Troca de motorista (TMJ)
  const driverChangePoints = routePoints.filter((p) => p.type === "TMJ");
  if (totalDistance > 660 && driverChangePoints.length === 0) {
    checks.push({
      compliant: false,
      message:
        "Falta troca de motorista obrigatória (distância acima de 660 km)",
    });
  } else if (driverChangePoints.length > 0) {
    checks.push({
      compliant: true,
      message: `${driverChangePoints.length} ponto(s) de troca de motorista configurado(s)`,
    });
  }

  // Velocidade média alta em algum trecho
  const highSpeedPoints = routePoints.filter((p) => getPointAvgSpeed(p) > 90);
  if (highSpeedPoints.length > 0) {
    checks.push({
      compliant: false,
      message: `${highSpeedPoints.length} ponto(s) com velocidade acima da recomendada (>90 km/h)`,
    });
  } else {
    checks.push({
      compliant: true,
      message: "Todas as velocidades dentro do limite recomendado",
    });
  }

  // Trechos com distância muito longa sem parada
  const longDistancePoints = routePoints.filter(
    (p) => (p.distanceKm ?? 0) > 200
  );
  if (longDistancePoints.length > 0) {
    checks.push({
      compliant: false,
      message: `${longDistancePoints.length} trecho(s) com distância muito longa (>200 km sem parada)`,
    });
  }

  if (checks.length === 0 || checks.every((c) => c.compliant)) {
    checks.push({
      compliant: true,
      message: "Esquema operacional em conformidade com regulamentação ANTT",
    });
  }

  return checks;
}

// Helper para estilos do badge de situação
function getStatusStyles(status?: string) {
  const base = {
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
    dot: "bg-slate-400",
  };

  if (!status) return base;

  const normalized = status.toLowerCase();

  if (normalized.includes("ativa")) {
    return {
      bg: "bg-emerald-50",
      text: "text-emerald-800",
      border: "border-emerald-200",
      dot: "bg-emerald-500",
    };
  }

  if (normalized.includes("susp")) {
    return {
      bg: "bg-amber-50",
      text: "text-amber-800",
      border: "border-amber-200",
      dot: "bg-amber-500",
    };
  }

  if (normalized.includes("inativa") || normalized.includes("baixada")) {
    return {
      bg: "bg-slate-100",
      text: "text-slate-700",
      border: "border-slate-300",
      dot: "bg-slate-500",
    };
  }

  return base;
}
