// src/components/scheme/AddPointModal.tsx
import {
  Search,
  MapPin,
  X,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";

import type { RoutePoint, PointFunction } from "@/types/scheme";
import {
  useLocationSearch,
  type LocationOption,
} from "@/hooks/useLocationSearch";

export type ModalPreset = {
  pointType?: string; // mantém para compat, mas UI não expõe mais
  functions?: PointFunction[];
  justification?: string; // será ignorado (UI removida)
};

interface AddPointModalProps {
  isOpen: boolean;
  onClose: () => void;

  onAdd: (point: any) => void;
  onSetInitial: (point: any) => void;

  canSetInitial: boolean;
  initialPoint: RoutePoint | null;

  // ✅ novo: sequência real da rota para exibir no drawer (sem staging)
  routePoints: RoutePoint[];

  preset?: ModalPreset | null;
  presetLocked?: boolean;
}

type ANTTFunctionKey = PointFunction;

const ANTT_FUNCTIONS: {
  id: ANTTFunctionKey;
  shortLabel: string;
  label: string;
  description: string;
}[] = [
  {
    id: "DESCANSO",
    shortLabel: "Descanso",
    label: "Parada obrigatória (descanso)",
    description: "Conta como parada obrigatória em trechos longos.",
  },
  {
    id: "APOIO",
    shortLabel: "Apoio",
    label: "Ponto de apoio",
    description: "Local com estrutura de apoio (banheiro, alimentação etc.).",
  },
  {
    id: "TROCA_MOTORISTA",
    shortLabel: "Troca",
    label: "Troca de motorista",
    description: "Utilizado para registrar a troca de motorista na jornada.",
  },
  {
    id: "EMBARQUE",
    shortLabel: "Embarque",
    label: "Embarque",
    description: "Ponto onde os passageiros embarcam.",
  },
  {
    id: "DESEMBARQUE",
    shortLabel: "Desembarque",
    label: "Desembarque",
    description: "Ponto onde os passageiros desembarcam.",
  },
  {
    id: "PARADA_LIVRE",
    shortLabel: "Livre",
    label: "Parada livre / comercial",
    description: "Parada não obrigatória, usada para fins operacionais.",
  },
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

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function deriveFlagsFromFunctions(fns: PointFunction[]) {
  return {
    isRestStop: fns.includes("DESCANSO"),
    isSupportPoint: fns.includes("APOIO"),
    isDriverChange: fns.includes("TROCA_MOTORISTA"),
    isBoardingPoint: fns.includes("EMBARQUE"),
    isDropoffPoint: fns.includes("DESEMBARQUE"),
    isFreeStop: fns.includes("PARADA_LIVRE"),
  };
}

// Mantemos o mesmo conceito de defaults por "tipo" (interno).
// Como você removeu o select de tipo, aqui você pode:
function defaultFunctionsByPointType(pointType: string): ANTTFunctionKey[] {
  switch (pointType) {
    case "PP":
      return ["DESCANSO"];
    case "PA":
      return ["DESCANSO", "APOIO"];
    case "TMJ":
      return ["DESCANSO", "TROCA_MOTORISTA"];
    case "PE":
      return ["EMBARQUE"];
    case "PD":
      return ["DESEMBARQUE"];
    case "PL":
      return ["PARADA_LIVRE"];
    default:
      return [];
  }
}

// ⚠️ Placeholder: como você disse que o "tipo" vem do banco,
// aqui você mapeia selectedLocation.type/tipo -> seu pointType interno.
// Se você ainda não tiver essa regra, pode começar com "PP".
function derivePointTypeFromLocation(location: LocationOption): string {
  const raw = String(
    (location as any).tipo ?? (location as any).type ?? "",
  ).toUpperCase();

  // Exemplo simples (ajuste conforme sua base real):
  if (raw.includes("RODOVIARIA") || raw.includes("TERMINAL")) return "PE"; // ou PP/PA conforme tua regra
  if (raw.includes("RESTAURANTE")) return "PP";
  if (raw.includes("FECHAMENTO")) return "PP";
  if (raw.includes("NAO AUTORIZADO") || raw.includes("NÃO AUTORIZADO"))
    return "PL";

  return "PP";
}

export function AddPointModal({
  isOpen,
  onClose,
  onAdd,
  onSetInitial,
  canSetInitial,
  initialPoint,
  routePoints = [],
  preset,
  presetLocked = false,
}: AddPointModalProps) {
  const {
    searchTerm,
    setSearchTerm,
    locations,
    selectedLocation,
    selectLocation,
    clearSelection,
    clearResults,
    isLoading,
    error,
  } = useLocationSearch("");

  // ✅ Mantém tempo e ANTT entre adições (builder rápido)
  const [localTime, setLocalTime] = useState(20);
  const [functions, setFunctions] = useState<ANTTFunctionKey[]>(() =>
    defaultFunctionsByPointType("PP"),
  );

  // Drawer de sequência (não aumenta modal)
  const [isSequenceOpen, setIsSequenceOpen] = useState(false);

  // Foco no input após adicionar
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // ✅ aplica preset ao abrir (somente para functions, já que justificativa sai e tipo não é manual)
  useEffect(() => {
    if (!isOpen) return;

    if (preset?.functions?.length) {
      setFunctions(uniq(preset.functions as ANTTFunctionKey[]));
    }

    // foco inicial
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, [isOpen, preset]);

  const flags = useMemo(() => deriveFlagsFromFunctions(functions), [functions]);

  // Reset hard ao fechar (não afeta routePoints)
  const resetHard = () => {
    setSearchTerm("");
    clearResults();
    clearSelection();

    setLocalTime(20);
    setFunctions(defaultFunctionsByPointType("PP"));

    setIsSequenceOpen(false);
  };

  const handleClose = () => {
    resetHard();
    onClose();
  };

  // ✅ Reset parcial pós-add: volta para busca, mantém tempo e ANTT
  const resetForNext = () => {
    clearSelection();
    setSearchTerm("");
    clearResults();

    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  };

  const buildPayloadFromLocation = (location: LocationOption) => {
    const normalizedFunctions = uniq(functions);
    const derived = deriveFlagsFromFunctions(normalizedFunctions);

    // avgSpeed fixo 80 (sem UI)
    const avgSpeed = 80;

    // type não é mais escolhido via UI
    const pointType = derivePointTypeFromLocation(location);

    return {
      location: {
        id: String(location.id),
        name: String(location.name ?? ""),
        city: String(location.city ?? ""),
        state: String(location.state ?? ""),
        shortName: String(location.shortName ?? location.name ?? ""),
        kind: String((location as any).kind ?? "OUTRO"),
        lat: Number(location.lat ?? 0),
        lng: Number(location.lng ?? 0),
        // opcional: carrega o tipo original do banco para debug/relatórios
        tipo: (location as any).tipo ?? (location as any).type ?? undefined,
      },
      type: pointType,
      stopTimeMin: localTime,
      avgSpeed: Number(avgSpeed),
      justification: "", // removido da UI
      functions: normalizedFunctions,
      ...derived,
    };
  };

  const handleAdd = () => {
    if (!selectedLocation) return;
    onAdd(buildPayloadFromLocation(selectedLocation));
    resetForNext(); // ✅ não fecha
  };

  const handleSetInitialLocal = () => {
    if (!selectedLocation) return;
    onSetInitial(buildPayloadFromLocation(selectedLocation));
    resetForNext(); // ✅ não fecha
  };

  const toggleFunction = (id: ANTTFunctionKey) => {
    if (presetLocked) return;
    setFunctions((prev) =>
      uniq(prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]),
    );
  };

  const handleDefaultByType = () => {
    if (presetLocked) return;
    if (!selectedLocation) return;

    const pointType = derivePointTypeFromLocation(selectedLocation);
    setFunctions(defaultFunctionsByPointType(pointType));
  };

  const selectedTipo = selectedLocation
    ? String(
        (selectedLocation as any).tipo ?? selectedLocation.type ?? "",
      ).trim()
    : "";

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      contentClassName="max-w-3xl pointer-events-auto relative z-[60]"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Adicionar pontos à rota
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Selecione um local, ajuste ANTT e adicione em sequência.
          </p>
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="rounded-full p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
        >
          <X className="w-4 h-4" />
          <span className="sr-only">Fechar</span>
        </button>
      </div>

      <div className="space-y-4 mt-2">
        {/* Bloco: Busca / Selecionado */}
        <div className="space-y-2">
          {!selectedLocation ? (
            <>
              <Label>Buscar local</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  ref={(el) => {
                    searchInputRef.current = el;
                  }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Digite cidade, nome do local ou estado..."
                  className="pl-10"
                />
              </div>

              {searchTerm && (
                <div className="border border-slate-200 rounded-lg max-h-64 overflow-y-auto">
                  {isLoading ? (
                    <div className="p-4 text-sm text-slate-500">
                      Buscando locais...
                    </div>
                  ) : error ? (
                    <div className="p-4 text-sm text-red-600">{error}</div>
                  ) : locations.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {locations.map((location) => (
                        <button
                          type="button"
                          key={location.id}
                          onClick={() => selectLocation(location)}
                          className="w-full text-left p-3 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-blue-600" />
                                <span className="text-slate-900">
                                  {location.name}
                                </span>
                              </div>
                              <div className="text-sm text-slate-600 mt-1">
                                {location.city} / {location.state} •{" "}
                                {String(
                                  (location as any).tipo ?? location.type ?? "",
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-slate-500">
                      <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>Nenhum local encontrado</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-blue-950 font-medium truncate">
                    {selectedLocation.name}
                  </p>
                  <p className="text-blue-800 text-sm mt-0.5">
                    {selectedLocation.city} / {selectedLocation.state}
                  </p>

                  {selectedTipo && (
                    <div className="mt-2">
                      <span className="inline-flex items-center rounded-full bg-white/70 border border-blue-200 px-2 py-0.5 text-[11px] font-medium text-blue-900">
                        {selectedTipo}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={resetForNext}
                    className="border-blue-200 text-blue-800 hover:bg-blue-100"
                  >
                    Trocar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Configuração mínima (somente quando há local selecionado) */}
        {selectedLocation && (
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-slate-900 font-medium">
                Configuração do ponto
              </h3>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDefaultByType}
                disabled={presetLocked || !selectedLocation}
                className="gap-2"
                title="Aplicar funções padrão pelo tipo"
              >
                <RotateCcw className="w-4 h-4" />
                Default por tipo
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tempo no local</Label>
                <select
                  value={String(localTime)}
                  onChange={(e) => setLocalTime(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {localTimeOptions.map((option) => (
                    <option key={option.value} value={String(option.value)}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Funções ANTT</Label>

                {/* Chips compactos */}
                <div className="flex flex-wrap gap-2">
                  {ANTT_FUNCTIONS.map((fn) => {
                    const active = functions.includes(fn.id);
                    return (
                      <button
                        key={fn.id}
                        type="button"
                        onClick={() => toggleFunction(fn.id)}
                        disabled={presetLocked}
                        title={fn.description}
                        className={[
                          "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition",
                          active
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50",
                          presetLocked ? "opacity-60 cursor-not-allowed" : "",
                        ].join(" ")}
                      >
                        {fn.shortLabel}
                      </button>
                    );
                  })}
                </div>

                {/* opcional: debug flags */}
                {/* <pre className="text-xs text-slate-500 mt-2">{JSON.stringify(flags, null, 2)}</pre> */}
              </div>
            </div>
          </div>
        )}

        {/* Sequência adicionada (drawer com altura fixa) */}
        <div className="pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={() => setIsSequenceOpen((v) => !v)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="text-sm font-medium text-slate-900">
              Sequência adicionada{" "}
              <span className="text-slate-500 font-normal">
                ({routePoints.length})
              </span>
            </div>
            {isSequenceOpen ? (
              <ChevronUp className="w-4 h-4 text-slate-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {isSequenceOpen && (
            <div className="mt-2 rounded-lg border border-slate-200 bg-white">
              <div className="max-h-44 overflow-y-auto">
                {routePoints.length === 0 ? (
                  <div className="p-3 text-sm text-slate-500">
                    Nenhum ponto adicionado ainda.
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {routePoints.map((p, idx) => {
                      const name =
                        (p.location?.shortName ??
                          p.location?.name ??
                          `${p.location?.city ?? ""}/${p.location?.state ?? ""}`.trim()) ||
                        "—";

                      const isLast = idx === routePoints.length - 1;

                      return (
                        <li
                          key={p.id ?? `${p.location?.id ?? "loc"}-${idx}`}
                          className={[
                            "px-3 py-2 text-sm",
                            isLast ? "bg-blue-50" : "",
                          ].join(" ")}
                        >
                          <span className="text-slate-500 mr-2">
                            {String(idx + 1).padStart(2, "0")} —
                          </span>
                          <span className="text-slate-900">{name}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <div className="text-[11px] text-slate-500">
            Fechar não remove pontos já adicionados.
          </div>

          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={handleClose}>
              Fechar
            </Button>

            <Button variant="outline" type="button" onClick={handleClose}>
              Finalizar adição
            </Button>

            <Button
              type="button"
              onClick={handleAdd}
              disabled={!selectedLocation}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Adicionar ponto
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
