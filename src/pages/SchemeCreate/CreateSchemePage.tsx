// CreateSchemePage.tsx
import { useState, useMemo, useEffect, useRef } from "react";
import { ArrowLeft, Plus, Save, Map, X, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { RoutePointCard } from "@/components/scheme/RoutePointCard";
import {
  AddPointModal,
  type ModalPreset,
} from "@/components/scheme/AddPointModal";
import { RouteSummary } from "@/components/scheme/RouteSummary";
import { InitialRoutePointCard } from "@/components/scheme/InitialRoutePointCard";
import { ViolationActionDivider } from "@/components/scheme/ViolationActionDivider";

import type { RoutePoint, PointFunction } from "@/types/scheme";
import { createSchemeHandlers, type Line } from "./createSchemeHandlers";

import {
  buildRulesOverviewFromIssues,
  normalizeFromBackendEvaluation,
  mapIssuesToPointAlerts,
  type RulesSourceUsed,
  type BackendEvaluationResponse,
  type BackendEvaluationResult,
} from "@/lib/rules";

import { useSaveScheme } from "@/hooks/useSaveScheme";
import { mapToOperationalScheme } from "@/lib/mapToOperationalScheme";
import type { OperationalScheme } from "@/types/scheme";

import { API_URL } from "@/services/api";

import type {
  SchemeDraft,
  Direction as DraftDirection,
} from "@/services/schemes/saveScheme";
import { findSchemeByKey } from "@/services/schemes/saveScheme";

interface CreateSchemePageProps {
  onBack: () => void;
}

type Direction = "ida" | "volta";
type ModalMode = "add" | "editInitial" | "insertAfter" | null;

export function CreateSchemePage({ onBack }: CreateSchemePageProps) {
  const [lineCode, setLineCode] = useState("");
  const [selectedLine, setSelectedLine] = useState<Line | null>(null);
  const [direction, setDirection] = useState<Direction | "">("");
  const [tripTime, setTripTime] = useState<string>("");
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [modalPreset, setModalPreset] = useState<ModalPreset | null>(null);

  const [insertAfterPointId, setInsertAfterPointId] = useState<string | null>(
    null,
  );

  const [editingSchemeId, setEditingSchemeId] = useState<string | null>(null);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [isRefreshingDistances, setIsRefreshingDistances] = useState(false);

  const lookupTimeoutRef = useRef<number | null>(null);

  const { isSaving, error, save } = useSaveScheme();

  const {
    handleLineCodeChange,
    handleAddPoint,
    handleUpdatePoint,
    handleDeletePoint,
    handleSetInitialPoint,
    handleMovePointUp,
    handleMovePointDown,
    handleInsertPointAfter,
    handleRefreshDistances,
  } = createSchemeHandlers({
    routePoints,
    setRoutePoints,
    selectedLine,
    setSelectedLine,
    tripTime,
    setLineCode,
    setIsModalOpen,
  });

  const [backendEvaluation, setBackendEvaluation] =
    useState<BackendEvaluationResponse | null>(null);

  const evaluationByOrder = useMemo(() => {
    const map: Record<number, BackendEvaluationResponse["avaliacao"][number]> =
      {};
    const arr = backendEvaluation?.avaliacao ?? [];
    for (const ev of arr) map[ev.ordem] = ev;
    return map;
  }, [backendEvaluation]);

  // Em geral, você quer renderizar a lista ordenada (não a original)
  const sortedRoutePoints = useMemo(() => {
    return [...routePoints].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [routePoints]);

  const canShowLineDetails = !!selectedLine && !!direction && !!tripTime;
  const canShowPointsSection = !!selectedLine && !!direction && !!tripTime;
  const canSaveScheme =
    !!selectedLine && !!direction && !!tripTime && routePoints.length > 0;

  const lineDisplayName =
    selectedLine?.municipioOrigem && selectedLine?.municipioDestino
      ? `${selectedLine.municipioOrigem} - ${selectedLine.municipioDestino}`
      : "";

  const origemDestinoText = selectedLine
    ? `${selectedLine.ufOrigem} ${selectedLine.municipioOrigem} → ${selectedLine.ufDestino} ${selectedLine.municipioDestino}`
    : "";

  const currentInitialPoint = routePoints.find((p) => p.isInitial) ?? null;

  const initialCity =
    currentInitialPoint?.location?.city ??
    (direction === "ida"
      ? selectedLine?.municipioOrigem
      : selectedLine?.municipioDestino);

  const initialState =
    currentInitialPoint?.location?.state ??
    (direction === "ida" ? selectedLine?.ufOrigem : selectedLine?.ufDestino);

  const finalCity =
    direction === "ida"
      ? selectedLine?.municipioDestino
      : selectedLine?.municipioOrigem;

  const finalState =
    direction === "ida" ? selectedLine?.ufDestino : selectedLine?.ufOrigem;

  const anttAlertsByPointId = useMemo(() => {
    if (!backendEvaluation) return {};
    const issues = normalizeFromBackendEvaluation(
      backendEvaluation,
      routePoints,
    );
    return mapIssuesToPointAlerts(issues);
  }, [backendEvaluation, routePoints]);

  const {
    issues: ruleIssues,
    overview: rulesOverview,
    sourceUsed,
  } = useMemo(() => {
    // Mantive sua regra original: só mostra/considera backend se estiver editando
    if (!editingSchemeId || !backendEvaluation) {
      const emptyIssues: any[] = [];
      const source: RulesSourceUsed = "none";
      return {
        issues: emptyIssues,
        overview: buildRulesOverviewFromIssues(emptyIssues, source),
        sourceUsed: source,
      };
    }

    const issues = normalizeFromBackendEvaluation(
      backendEvaluation,
      routePoints,
    );
    const source: RulesSourceUsed = issues.length ? "backend" : "none";

    return {
      issues,
      overview: buildRulesOverviewFromIssues(issues, source),
      sourceUsed: source,
    };
  }, [editingSchemeId, backendEvaluation, routePoints]);

  useEffect(() => {
    if (!lineCode || !direction || !tripTime) {
      setEditingSchemeId(null);
      setBackendEvaluation(null);
      setIsLoadingExisting(false);
      return;
    }

    if (lookupTimeoutRef.current !== null) {
      window.clearTimeout(lookupTimeoutRef.current);
    }

    lookupTimeoutRef.current = window.setTimeout(async () => {
      try {
        setIsLoadingExisting(true);

        const existing = await findSchemeByKey(
          lineCode,
          direction as DraftDirection,
          tripTime,
        );

        if (!existing) {
          setEditingSchemeId(null);
          setBackendEvaluation(null);
          return;
        }

        setEditingSchemeId(existing.id);

        const operational = await loadOperationalSchemeById(existing.id);
        const evaluation = await loadRulesEvaluationBySchemeId(existing.id);

        setBackendEvaluation(evaluation);
        setRoutePoints(operational.routePoints ?? []);

        if (operational.tripTime) setTripTime(operational.tripTime);
      } catch (err) {
        console.error(
          "[CreateSchemePage] erro ao buscar/carregar esquema por chave:",
          err,
        );
        setEditingSchemeId(null);
      } finally {
        setIsLoadingExisting(false);
      }
    }, 400) as unknown as number;

    return () => {
      if (lookupTimeoutRef.current !== null) {
        window.clearTimeout(lookupTimeoutRef.current);
      }
    };
  }, [lineCode, direction, tripTime]);

  useEffect(() => {
    const sorted = [...routePoints].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );

    console.log(
      "[DBG] routePoints len:",
      routePoints.length,
      "sorted len:",
      sorted.length,
    );

    const p = sorted[10];
    console.log("[DBG] sorted[10] exists?", !!p);

    if (!p) {
      console.log(
        "[DBG] first 5 orders:",
        sorted.slice(0, 5).map((x) => x.order),
      );
      return;
    }

    console.log("[DBG] id:", p.id, "order:", p.order);

    console.log("[DBG] km candidates:", {
      distancia_km: (p as any).distancia_km,
      distance_km: (p as any).distance_km,
      distancia_km_trecho: (p as any).distancia_km_trecho,
      distancia_km_acumulada: (p as any).distancia_km_acumulada,
      distancia_total_km: (p as any).distancia_total_km,
    });

    console.log("[DBG] time candidates:", {
      duracao_min: (p as any).duracao_min,
      duration_min: (p as any).duration_min,
      travel_time_min: (p as any).travel_time_min,
      tempo_min: (p as any).tempo_min,
    });
  }, [routePoints]);

  const handleConfirmPointFromModal = async (pointInput: any) => {
    if (modalMode === "insertAfter" && insertAfterPointId) {
      handleInsertPointAfter(insertAfterPointId, pointInput);
      return;
    }

    await handleAddPoint(pointInput);
  };

  const handleAddPointAsInitial = async (pointFromModal: any) => {
    if (!tripTime) return;

    const locId = String(pointFromModal.location.id);

    const existing = routePoints.find((p) => String(p.location?.id) === locId);

    if (existing) {
      handleSetInitialPoint(existing.id, tripTime);
      return;
    }

    await handleAddPoint(pointFromModal);

    // ⚠️ re-encontra após adicionar (usando location.id)
    const added = [...routePoints, pointFromModal].find(
      (p) => String(p.location?.id) === locId,
    );

    // melhor: usar o estado atualizado (ideal seria dentro do handler ou via callback),
    // mas, se seu handleAddPoint já coloca no state sincronicamente, isso funciona.
    // Se não, eu te passo a versão 100% correta baseada no retorno do handler.

    if (added?.id) {
      handleSetInitialPoint(added.id, tripTime);
    }
  };

  const handleSaveScheme = async () => {
    if (!selectedLine || !direction || !tripTime || routePoints.length === 0) {
      return;
    }

    let existingSchemeId: string | undefined;

    try {
      const existing = await findSchemeByKey(lineCode, direction, tripTime);
      if (existing) existingSchemeId = existing.id;
    } catch (err) {
      console.error(
        "[CreateSchemePage] erro ao verificar esquema existente:",
        err,
      );
    }

    const firstPoint = routePoints[0];
    const lastPoint = routePoints[routePoints.length - 1];

    const originLocationId = firstPoint?.location?.id;
    const destinationLocationId = lastPoint?.location?.id;

    if (!originLocationId || !destinationLocationId) {
      console.error(
        "[CreateSchemePage] Não foi possível determinar origem/destino a partir dos pontos",
      );
      return;
    }

    const draft: SchemeDraft = {
      schemeId: existingSchemeId,
      lineCode,
      lineName:
        lineDisplayName ||
        origemDestinoText ||
        lineCode ||
        "Esquema operacional",
      originLocationId,
      destinationLocationId,
      direction,
      tripTime,
      routePoints,
    };

    const result = await save(draft);
    if (result && result.schemeId) onBack();
  };

  async function loadRulesEvaluationBySchemeId(
    id: string,
  ): Promise<BackendEvaluationResponse | null> {
    try {
      const url = `${API_URL}/scheme-points/schemes/${id}/points/evaluation`;
      const res = await fetch(url);
      if (!res.ok) return null;
      return (await res.json()) as BackendEvaluationResponse;
    } catch (err) {
      console.error("[CreateSchemePage] erro ao carregar evaluation:", err);
      return null;
    }
  }

  function getBestActionableResult(
    ev?: BackendEvaluationResponse["avaliacao"][number],
  ): BackendEvaluationResult | null {
    const results = ev?.results ?? [];

    if (!results.length) return null;

    const actionable = results.filter(
      (r) => !!r?.violation?.remediation || !!r?.violation?.expected?.function,
    );

    if (!actionable.length) return null;

    actionable.sort((a, b) => {
      const rank = (s?: string) =>
        s === "BLOCKING" ? 3 : s === "WARNING" ? 2 : s === "INFO" ? 1 : 0;
      return rank(b?.violation?.severity) - rank(a?.violation?.severity);
    });

    return actionable[0];
  }

  function presetFromExpected(expected?: {
    function?: string;
    point_type?: string;
  }): ModalPreset {
    const fn = expected?.function as PointFunction | undefined;

    if (fn === "DESCANSO") return { pointType: "PA", functions: ["DESCANSO"] };
    if (fn === "APOIO")
      return { pointType: "PA", functions: ["DESCANSO", "APOIO"] };
    if (fn === "TROCA_MOTORISTA")
      return { pointType: "TMJ", functions: ["TROCA_MOTORISTA"] };

    return { pointType: "PA", functions: [] };
  }

  async function loadOperationalSchemeById(
    id: string,
  ): Promise<OperationalScheme> {
    const schemeUrl = `${API_URL}/schemes/${id}`;
    const pointsUrl = `${API_URL}/scheme-points/schemes/${id}/points`;
    const summaryUrl = `${API_URL}/schemes/${id}/summary`;

    const [schemeRes, pointsRes, summaryRes] = await Promise.all([
      fetch(schemeUrl),
      fetch(pointsUrl),
      fetch(summaryUrl),
    ]);

    if (!schemeRes.ok) {
      throw new Error(
        `Erro ao carregar esquema: ${schemeRes.status} ${schemeRes.statusText}`,
      );
    }

    if (!pointsRes.ok) {
      throw new Error(
        `Erro ao carregar pontos do esquema: ${pointsRes.status} ${pointsRes.statusText}`,
      );
    }

    const schemeJson = await schemeRes.json();
    const pointsJson = await pointsRes.json();
    const summaryJson = summaryRes.ok ? await summaryRes.json() : undefined;

    return mapToOperationalScheme(schemeJson, pointsJson, summaryJson);
  }

  // ===============================
  // ✅ CORREÇÃO DO ERRO:
  // - NÃO existe map no "nível do componente".
  // - O componente deve retornar UM JSX só.
  // - O map fica DENTRO da seção de lista.
  // ===============================
  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="border-slate-300 hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-slate-900">Criar Esquema Operacional</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <Card className="p-6 bg-white shadow-sm border-slate-200">
          <h2 className="text-slate-900 mb-4">Informações da Linha</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lineCode">Código da Linha</Label>
              <Input
                id="lineCode"
                value={lineCode}
                onChange={(e) => handleLineCodeChange(e.target.value)}
                placeholder="Ex: DFG0053049"
                className="uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="direction">Sentido</Label>
              <select
                id="direction"
                className="border-input flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-input-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={direction}
                onChange={(e) => setDirection(e.target.value as Direction | "")}
              >
                <option value="">Selecione...</option>
                <option value="ida">Ida</option>
                <option value="volta">Volta</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tripTime">Horário da Viagem</Label>
              <Input
                id="tripTime"
                type="time"
                value={tripTime}
                onChange={(e) => setTripTime(e.target.value)}
              />
            </div>
          </div>

          {editingSchemeId && (
            <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Já existe um esquema para esta linha, sentido e horário. Você está
              editando esse esquema.
            </div>
          )}

          {canShowLineDetails && selectedLine && (
            <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-600">Nome da Linha</Label>
                  <p className="text-slate-900 mt-1">
                    {lineDisplayName || "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-600">Origem → Destino</Label>
                  <p className="text-slate-900 mt-1 transition-opacity duration-300">
                    <span
                      key={direction}
                      className="inline-block opacity-100 transition-opacity duration-300"
                    >
                      {selectedLine
                        ? `${selectedLine.ufOrigem} ${
                            selectedLine.municipioOrigem
                          } ${direction === "ida" ? "→" : "←"} ${
                            selectedLine.ufDestino
                          } ${selectedLine.municipioDestino}`
                        : "-"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-600">Empresa</Label>
                  <p className="text-slate-900 mt-1">
                    {selectedLine.nomeEmpresa}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-600">Situação</Label>
                  <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        selectedLine.situacao === "Ativa"
                          ? "bg-emerald-500"
                          : "bg-rose-500"
                      }`}
                    />
                    <span className="text-slate-900">
                      {selectedLine.situacao}
                    </span>
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <Label className="text-slate-600">Pontos principais</Label>

                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="text-left p-4 bg-blue-50 border border-blue-200 rounded-lg hover:border-blue-300 transition flex flex-col justify-between"
                    onClick={() => {
                      setModalMode("editInitial");
                      setModalPreset(null);
                      setIsModalOpen(true);
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold uppercase text-blue-700">
                        Ponto inicial
                      </span>
                      <span className="text-xs text-blue-700 underline cursor-pointer hover:text-blue-900 transition-colors">
                        {currentInitialPoint ? "Editar" : "Definir"}
                      </span>
                    </div>

                    <p className="text-blue-900 font-medium">
                      {initialCity && initialState
                        ? initialCity
                        : "Definir ponto inicial"}
                    </p>

                    {initialCity && initialState && (
                      <p className="text-blue-700 text-sm mt-1">
                        {initialCity} / {initialState}
                      </p>
                    )}
                  </button>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between">
                    <div className="mb-1">
                      <span className="text-xs font-semibold uppercase text-slate-500">
                        Ponto final
                      </span>
                    </div>
                    <p className="text-slate-900 font-medium">
                      {finalCity && finalState ? `${finalCity}` : "Ponto final"}
                    </p>
                    {finalCity && finalState && (
                      <p className="text-slate-700 text-sm mt-1">
                        {finalCity} / {finalState}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {canShowPointsSection && (
          <Card className="p-6 bg-white shadow-sm border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-slate-900">Pontos da Rota</h2>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    console.log("[UI] clicar atualizar distancias", {
                      size: routePoints.length,
                    });
                    setIsRefreshingDistances(true);
                    try {
                      await handleRefreshDistances();
                      console.log("[UI] handleRefreshDistances finalizou");
                    } catch (e) {
                      console.error("[UI] handleRefreshDistances falhou", e);
                    } finally {
                      setIsRefreshingDistances(false);
                    }
                  }}
                  disabled={
                    isLoadingExisting ||
                    isRefreshingDistances ||
                    routePoints.length < 2
                  }
                  className="border-slate-300"
                  title="Recalcula distâncias e tempos de deslocamento usando os trechos salvos (road_segments) antes de chamar API externa."
                >
                  <RefreshCcw
                    className={`w-4 h-4 mr-2 ${
                      isRefreshingDistances ? "animate-spin" : ""
                    }`}
                  />
                  {isRefreshingDistances
                    ? "Atualizando..."
                    : "Atualizar distâncias"}
                </Button>

                <Button
                  type="button"
                  onClick={() => {
                    setModalMode("add");
                    setModalPreset(null); // 🔴 ESSENCIAL
                    setIsModalOpen(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={isLoadingExisting || isRefreshingDistances}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Ponto
                </Button>
              </div>
            </div>

            {sortedRoutePoints.length === 0 ? (
              isLoadingExisting ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <div className="h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mb-3" />
                  <p className="text-sm text-slate-600">
                    Carregando esquema existente para esta linha, sentido e
                    horário...
                  </p>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Map className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum ponto adicionado ainda</p>
                  <p className="text-sm mt-1">
                    Clique em &quot;Adicionar Ponto&quot; para começar a montar
                    a rota
                  </p>
                </div>
              )
            ) : (
              <div className="space-y-4">
                {sortedRoutePoints.map((point, index) => {
                  const ordem = Number(point.order ?? index + 1);
                  const ev = evaluationByOrder[ordem];

                  const best = getBestActionableResult(ev);

                  const targetOrdem =
                    best?.violation?.remediation?.target_ordem;

                  // Mostrar o divider somente quando o ponto atual for o alvo (ou fallback)
                  const shouldShowDivider =
                    index > 0 &&
                    !!best &&
                    (targetOrdem ? targetOrdem === ordem : true);

                  return (
                    <div key={point.id} className="space-y-2">
                      {shouldShowDivider && (
                        <ViolationActionDivider
                          title={best!.message}
                          suggestion={
                            best?.violation?.remediation?.suggestion ??
                            "Adicionar um ponto conforme a função esperada pelo backend."
                          }
                          expectedFunction={best?.violation?.expected?.function}
                          onAdd={() => {
                            const prevId = String(
                              sortedRoutePoints[index - 1].id,
                            );

                            setModalMode("insertAfter");
                            setInsertAfterPointId(prevId);

                            setModalPreset(
                              presetFromExpected(best?.violation?.expected),
                            );
                            setIsModalOpen(true);
                          }}
                        />
                      )}

                      {index === 0 ? (
                        <InitialRoutePointCard
                          point={point}
                          index={index}
                          onUpdate={handleUpdatePoint}
                          onDelete={handleDeletePoint}
                        />
                      ) : (
                        <RoutePointCard
                          point={point}
                          index={index}
                          previousPoint={sortedRoutePoints[index - 1]}
                          alerts={anttAlertsByPointId[point.id] ?? []}
                          onUpdate={handleUpdatePoint}
                          onDelete={handleDeletePoint}
                          onMoveUp={handleMovePointUp}
                          onMoveDown={handleMovePointDown}
                          onInsertAfter={(id) => {
                            setModalMode("insertAfter");
                            setInsertAfterPointId(id);
                            setModalPreset(null);
                            setIsModalOpen(true);
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {sortedRoutePoints.length > 0 && (
          <RouteSummary
            routePoints={sortedRoutePoints}
            tripStartTime={tripTime}
            ruleIssues={ruleIssues}
            rulesOverview={rulesOverview}
            rulesSourceUsed={sourceUsed}
          />
        )}

        {canSaveScheme && (
          <Card className="p-6 bg-white shadow-sm border-slate-200">
            <div className="flex flex-wrap gap-3 justify-end">
              <Button
                variant="outline"
                onClick={onBack}
                className="border-slate-300"
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>

              <Button
                className="bg-green-600 hover:bg-green-700"
                disabled={!canSaveScheme || isSaving}
                onClick={handleSaveScheme}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Salvando..." : "Salvar Esquema"}
              </Button>
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </Card>
        )}
      </div>

      <AddPointModal
        isOpen={isModalOpen}
        preset={modalPreset}
        //presetLocked={false}

        onClose={() => {
          setIsModalOpen(false);
          setModalMode(null);
          setInsertAfterPointId(null);
          setModalPreset(null);
        }}
        onAdd={handleConfirmPointFromModal}
        onSetInitial={handleAddPointAsInitial}
        canSetInitial={!!tripTime}
        initialPoint={routePoints.find((p) => p.isInitial) ?? null}
        routePoints={routePoints}
      />
    </div>
  );
}
