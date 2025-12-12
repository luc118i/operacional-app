// src/pages/SchemeDetail/SchemeDetailPage.tsx
import { ArrowLeft, MapPin, Route as RouteIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { DetailPointCard } from "@/components/scheme/DetailPointCard";
import { DetailSummary } from "@/components/scheme/DetailSummary";

import { DetailFirstPointCard } from "@/components/scheme/DetailFirstPointCard";

import { useScheme } from "@/hooks/useScheme";

// 🆕 JSON de linhas ANTT
import linhasJson from "@/data/lista-de-linhas.json";

interface SchemeDetailPageProps {
  schemeId: string;
  onBack: () => void;
}

// Tipagem básica do JSON (ajuste se tiver mais campos)
type LinhaMeta = {
  Prefixo: string;
  "Nome Empresa": string;
  "UF Origem": string;
  "Município Origem": string;
  "Instalação Origem": string;
  "UF Destino": string;
  "Município Destino": string;
  "Instalação Destino": string;
  Situação: string;
};

export function SchemeDetailPage({ schemeId, onBack }: SchemeDetailPageProps) {
  const { data: scheme, loading, error } = useScheme(schemeId);

  // ⏳ LOADING
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">
        Carregando informações do esquema...
      </div>
    );
  }

  // ❌ ERROR
  if (error || !scheme) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        Erro ao carregar esquema operacional
      </div>
    );
  }

  // 🔐 garante sempre arrays válidos
  const routePoints = scheme.routePoints ?? [];

  // 👉 ponto inicial real vindo do banco (isInitial)
  const initialIndex = routePoints.findIndex((p) => p.isInitial);
  const safeInitialIndex = initialIndex >= 0 ? initialIndex : 0;
  const initialRoutePoint =
    routePoints.find((p) => p.isInitial) ?? routePoints[0] ?? null;

  // 👉 o que vamos mostrar no card "Ponto Inicial"
  const displayInitialPoint = initialRoutePoint
    ? {
        name: initialRoutePoint.location.name,
        city: initialRoutePoint.location.city,
        state: initialRoutePoint.location.state,
      }
    : scheme.initialPoint ?? null;

  const allPoints = [
    ...(scheme.initialPoint ? [scheme.initialPoint] : []),
    ...routePoints,
  ];

  // 🆕 Mesclagem BANCO + JSON
  const linhas = linhasJson as LinhaMeta[];

  // 👉 aqui estou assumindo que o Prefixo do JSON é o mesmo que scheme.lineCode
  //    se for outro campo do esquema, é só trocar o `scheme.lineCode` abaixo
  const linhaMeta = linhas.find((l) => l.Prefixo === scheme.lineCode);

  // Campos "mesclados": prioriza JSON, cai pro banco se não tiver
  const originCity =
    linhaMeta?.["Município Origem"] || scheme.origin || "Origem não informada";
  const originState = linhaMeta?.["UF Origem"] || scheme.originState || "--";
  const destinationCity =
    linhaMeta?.["Município Destino"] ||
    scheme.destination ||
    "Destino não informado";
  const destinationState =
    linhaMeta?.["UF Destino"] || scheme.destinationState || "--";

  const originInstallation = linhaMeta?.["Instalação Origem"];
  const destinationInstallation = linhaMeta?.["Instalação Destino"];

  const companyName = linhaMeta?.["Nome Empresa"] || "Empresa não informada";

  const prefixo = linhaMeta?.Prefixo || scheme.lineCode || "--";

  const situacao = linhaMeta?.Situação;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={onBack}
              className="border-slate-300 hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-slate-900">Esquema Operacional</h1>
                <Badge
                  variant="outline"
                  className={
                    scheme.direction === "Ida"
                      ? "border-green-300 text-green-700 bg-green-50"
                      : "border-purple-300 text-purple-700 bg-purple-50"
                  }
                >
                  {scheme.direction}
                </Badge>
                {situacao && (
                  <Badge
                    variant="outline"
                    className={getSituacaoClasses(situacao)}
                  >
                    {situacao}
                  </Badge>
                )}
              </div>

              {/* 🆕 Empresa + Prefixo embaixo do título */}
              <p className="text-xs text-slate-500 mt-1">
                {companyName} • Prefixo{" "}
                <span className="font-semibold text-slate-800">{prefixo}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Informações da Linha */}
        <Card className="p-6 bg-white shadow-sm border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="text-slate-600 text-sm mb-1 block">
                Código da Linha
              </label>
              <p className="text-slate-900">{scheme.lineCode}</p>
            </div>

            <div>
              <label className="text-slate-600 text-sm mb-1 block">
                Nome da Linha
              </label>
              <p className="text-slate-900">{scheme.lineName}</p>
            </div>

            {/* Origem → Destino vindo SÓ do JSON */}
            <div>
              <label className="text-slate-600 text-sm mb-1 block">
                Origem → Destino
              </label>
              {linhaMeta ? (
                <>
                  <p className="text-slate-900">
                    {linhaMeta["Município Origem"]} ({linhaMeta["UF Origem"]}) →{" "}
                    {linhaMeta["Município Destino"]} ({linhaMeta["UF Destino"]})
                  </p>
                  {(linhaMeta["Instalação Origem"] ||
                    linhaMeta["Instalação Destino"]) && (
                    <p className="text-xs text-slate-500 mt-1 truncate">
                      {linhaMeta["Instalação Origem"] ??
                        "Instalação origem não informada"}{" "}
                      →{" "}
                      {linhaMeta["Instalação Destino"] ??
                        "Instalação destino não informada"}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-slate-400">—</p>
              )}
            </div>

            <div>
              <label className="text-slate-600 text-sm mb-1 block">
                Horário de Início
              </label>
              <p className="text-slate-900">{scheme.tripTime}</p>
            </div>

            {/* Empresa (só JSON) */}
            <div>
              <label className="text-slate-600 text-sm mb-1 block">
                Empresa
              </label>
              <p className="text-slate-900">
                {linhaMeta ? linhaMeta["Nome Empresa"] : "—"}
              </p>
            </div>

            {/* Prefixo ANTT (só JSON) */}
            <div>
              <label className="text-slate-600 text-sm mb-1 block">
                Prefixo ANTT
              </label>
              <p className="text-slate-900">
                {linhaMeta ? linhaMeta.Prefixo : "—"}
              </p>
            </div>
          </div>

          {/* Ponto inicial continua vindo do esquema do banco */}
          <div className="mt-4 pt-4 border-t border-slate-200">
            <label className="text-slate-600 text-sm mb-2 block">
              Ponto Inicial
            </label>
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-blue-900">{displayInitialPoint?.name}</p>
                <p className="text-blue-700 text-sm">
                  {displayInitialPoint?.city} / {displayInitialPoint?.state}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Mapa */}

        {/* Lista de Pontos */}
        <Card className="p-6 bg-white shadow-sm border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h2 className="text-slate-900">Pontos da Rota</h2>
          </div>

          <div className="space-y-4">
            {routePoints.length > 0 ? (
              routePoints.map((point, index) => {
                const isFirst = index === 0;
                const isFirstButNotInitial =
                  isFirst && index !== safeInitialIndex;

                // 👉 se for o primeiro ponto e NÃO for o inicial, usa o card especial
                if (isFirstButNotInitial) {
                  return (
                    <DetailFirstPointCard
                      key={point.id}
                      point={point}
                      index={index}
                    />
                  );
                }

                // demais pontos (inclusive o inicial) usam o card completo
                return (
                  <DetailPointCard key={point.id} point={point} index={index} />
                );
              })
            ) : (
              <p className="text-sm text-slate-500">
                Nenhum ponto cadastrado para este esquema (ainda).
              </p>
            )}
          </div>
        </Card>
        {/* Resumo */}
        {/* Aqui você ainda pode usar o linhaMeta no DetailSummary / RouteSummary */}
        <DetailSummary
          scheme={{ ...scheme, routePoints }}
          linhaMeta={linhaMeta}
        />
      </div>
    </div>
  );
}

// 🆕 Helper só pra estilizar o badge de situação
function getSituacaoClasses(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("ativa")) {
    return "border-emerald-300 text-emerald-700 bg-emerald-50";
  }

  if (normalized.includes("susp")) {
    return "border-amber-300 text-amber-700 bg-amber-50";
  }

  if (normalized.includes("inativa") || normalized.includes("baixada")) {
    return "border-slate-300 text-slate-700 bg-slate-50";
  }

  return "border-slate-300 text-slate-700 bg-slate-50";
}
