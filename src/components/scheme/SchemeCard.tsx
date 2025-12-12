import { Clock, MapPin, Route, ChevronRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import type { OperationalScheme, SchemeSummary } from "@/types/scheme";
import type { LinhaMeta } from "@/types/linhas";
import linhasJson from "@/data/lista-de-linhas.json";

interface SchemeCardProps {
  scheme: OperationalScheme;
  summary?: SchemeSummary;
  onClick: () => void;
}

export function SchemeCard({ scheme, summary, onClick }: SchemeCardProps) {
  // 🔎 Meta ANTT (JSON) para essa linha
  const linhas = linhasJson as LinhaMeta[];

  // ⚠️ Se o identificador no JSON não for Prefixo, ajuste aqui
  const linhaMeta = linhas.find((l) => l.Prefixo === scheme.lineCode);

  // 🧠 Regra:
  // - Se tiver JSON: usa município + UF do JSON
  // - Se não tiver JSON: usa só cidades do banco, SEM UF (pra não inventar combinação esquisita)
  const origemLabel = linhaMeta
    ? `${linhaMeta["Município Origem"]} (${linhaMeta["UF Origem"]})`
    : scheme.origin || "Origem não informada";

  const destinoLabel = linhaMeta
    ? `${linhaMeta["Município Destino"]} (${linhaMeta["UF Destino"]})`
    : scheme.destination || "Destino não informada";

  // Tenta usar o totalKm resumido; se não tiver, usa a distância acumulada do último ponto
  const lastPoint = scheme.routePoints[scheme.routePoints.length - 1] ?? null;

  const totalKm =
    typeof summary?.totalKm === "number"
      ? summary.totalKm
      : typeof scheme.totalKm === "number"
      ? scheme.totalKm
      : lastPoint?.cumulativeDistanceKm ?? 0;

  // Paradas: se vier de totalStops, usa; senão, conta nos pontos (PP e PA)
  const stopsFromPoints = scheme.routePoints.filter(
    (p) => p.type === "PP" || p.type === "PA"
  ).length;

  const totalStops =
    summary?.totalStops ??
    scheme.totalParadas ??
    scheme.totalStops ??
    stopsFromPoints;

  // Quantidade de pontos cadastrados
  const totalPoints =
    summary?.totalPontos ?? scheme.totalPontos ?? scheme.routePoints.length;

  return (
    <Card
      onClick={onClick}
      className="p-6 hover:shadow-lg transition-all cursor-pointer border border-slate-200 bg-white hover:border-blue-300 group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
              <Route className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="text-slate-900">{scheme.lineCode}</h3>
                <Badge
                  variant="outline"
                  className={
                    scheme.direction?.toLowerCase() === "ida"
                      ? "border-green-300 text-green-700 bg-green-50"
                      : "border-purple-300 text-purple-700 bg-purple-50"
                  }
                >
                  {scheme.direction}
                </Badge>
              </div>
              <p className="text-slate-700">{scheme.lineName}</p>
            </div>
          </div>

          {/* Informações */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm truncate">
                {origemLabel} → {destinoLabel}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">Horário: {scheme.tripTime || "—"}</span>
            </div>
          </div>

          {/* Resumo */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-slate-600">
                <span className="text-slate-900">{totalKm.toFixed(1)} km</span>{" "}
                totais
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-slate-600">
                <span className="text-slate-900">{totalStops}</span> parada
                {totalStops !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-slate-600">
                <span className="text-slate-900">{totalPoints}</span> pc
                {totalPoints !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Seta */}
        <div className="flex items-center">
          <ChevronRight className="w-6 h-6 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </Card>
  );
}
