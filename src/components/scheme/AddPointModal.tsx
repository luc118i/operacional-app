// src/components/.../AddPointModal.tsx
import { Search, MapPin, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  pointType?: string; // "PA" | "TMJ" etc
  functions?: string[]; // ["DESCANSO"] | ["APOIO"] | ["TROCA_MOTORISTA"]
  justification?: string;
};

interface AddPointModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (point: any) => void;
  onSetInitial: (point: any) => void;
  canSetInitial: boolean;
  initialPoint: RoutePoint | null;

  preset?: ModalPreset | null;
}

const pointTypes = [
  { value: "PE", label: "PE - Ponto de Embarque" },
  { value: "PD", label: "PD - Ponto de Desembarque" },
  { value: "PP", label: "PP - Ponto de Parada" },
  { value: "PA", label: "PA - Ponto de Apoio" },
  { value: "TMJ", label: "TMJ - Troca de Motorista em Jornada" },
  { value: "PL", label: "PL - Ponto Livre" },
];

type ANTTFunctionKey = PointFunction;

const ANTT_FUNCTIONS: {
  id: ANTTFunctionKey;
  label: string;
  description: string;
}[] = [
  {
    id: "DESCANSO",
    label: "Parada obrigatória (descanso)",
    description: "Conta como parada obrigatória em trechos longos.",
  },
  {
    id: "APOIO",
    label: "Ponto de apoio",
    description: "Local com estrutura de apoio (banheiro, alimentação etc.).",
  },
  {
    id: "TROCA_MOTORISTA",
    label: "Troca de motorista",
    description: "Utilizado para registrar a troca de motorista na jornada.",
  },
  {
    id: "EMBARQUE",
    label: "Embarque",
    description: "Ponto onde os passageiros embarcam.",
  },
  {
    id: "DESEMBARQUE",
    label: "Desembarque",
    description: "Ponto onde os passageiros desembarcam.",
  },
  {
    id: "PARADA_LIVRE",
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

export function AddPointModal({
  isOpen,
  onClose,
  onAdd,
  onSetInitial,
  canSetInitial,
  initialPoint,
  preset,
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

  const [pointType, setPointType] = useState("PP");
  const [localTime, setLocalTime] = useState(20);
  const [avgSpeed, setAvgSpeed] = useState(80);
  const [justification, setJustification] = useState("");

  const [suppressTypeDefaultsOnce, setSuppressTypeDefaultsOnce] =
    useState(false);

  // ✅ contrato público: única fonte de verdade para funções ANTT
  const [functions, setFunctions] = useState<ANTTFunctionKey[]>(() =>
    defaultFunctionsByPointType("PP")
  );

  // Quando muda o tipo, sugerimos defaults (e sobrescrevemos a seleção atual).
  // Se você quiser "manter marcações" quando muda tipo, aí a regra muda — mas por ora está consistente com seu fluxo.
  useEffect(() => {
    // evita que o preset (que seta pointType) seja sobrescrito pelo default
    if (suppressTypeDefaultsOnce) {
      setSuppressTypeDefaultsOnce(false);
      return;
    }

    setFunctions(defaultFunctionsByPointType(pointType));
  }, [pointType, suppressTypeDefaultsOnce]);

  // Flags derivadas (compat/UI). Não viram state: evitamos dupla fonte.
  const flags = useMemo(() => {
    return deriveFlagsFromFunctions(functions);
  }, [functions]);

  const resetForm = () => {
    setSearchTerm("");
    clearResults();

    setPointType("PP");
    setLocalTime(20);
    setAvgSpeed(80);
    setJustification("");

    setFunctions(defaultFunctionsByPointType("PP"));
  };

  useEffect(() => {
    if (!isOpen) return;
    if (!preset) return;

    // 1) trava o auto-default UMA vez (porque vamos setar pointType via preset)
    setSuppressTypeDefaultsOnce(true);

    // 2) aplica presets
    if (preset.pointType) setPointType(preset.pointType);

    if (preset.functions?.length) {
      // normaliza para o seu tipo (PointFunction) e remove duplicados
      const normalized = uniq(preset.functions as ANTTFunctionKey[]);
      setFunctions(normalized);
    }

    if (preset.justification !== undefined) {
      setJustification(preset.justification);
    }
  }, [isOpen, preset]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const buildPayloadFromLocation = (location: LocationOption) => {
    const normalizedFunctions = uniq(functions);
    const derived = deriveFlagsFromFunctions(normalizedFunctions);

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
      },

      type: pointType,
      stopTimeMin: localTime,
      avgSpeed: Number(avgSpeed),
      justification,

      // ✅ contrato público
      functions: normalizedFunctions,

      // ✅ compat enquanto o resto do front ainda usa flags
      ...derived,
    };
  };

  const handleAdd = () => {
    if (!selectedLocation) return;
    const payload = buildPayloadFromLocation(selectedLocation);
    onAdd(payload);
    handleClose();
  };

  const handleSetInitialLocal = () => {
    if (!selectedLocation) return;
    const payload = buildPayloadFromLocation(selectedLocation);
    onSetInitial(payload);
    handleClose();
  };

  const toggleFunction = (id: ANTTFunctionKey) => {
    setFunctions((prev) => {
      const next = prev.includes(id)
        ? prev.filter((f) => f !== id)
        : [...prev, id];
      return uniq(next);
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} contentClassName="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Adicionar Ponto à Rota
        </h2>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-full p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
        >
          <X className="w-4 h-4" />
          <span className="sr-only">Fechar</span>
        </button>
      </div>

      <div className="space-y-6 mt-2">
        {/* Busca de Local */}
        <div className="space-y-3">
          <Label>Buscar Local Cadastrado</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite cidade, nome do local ou estado..."
              className="pl-10"
            />
          </div>

          {/* Ponto inicial da rota */}
          <div className="mt-2">
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">
              Ponto inicial da rota
            </p>

            {initialPoint ? (
              <div className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <div>
                  <p className="text-xs font-semibold text-emerald-700 mb-1">
                    PONTO INICIAL DEFINIDO
                  </p>
                  <p className="text-sm text-slate-900">
                    {initialPoint.location?.city} /{" "}
                    {initialPoint.location?.state}
                  </p>
                  {initialPoint.location?.name && (
                    <p className="text-xs text-slate-600 mt-0.5">
                      {initialPoint.location.name}
                    </p>
                  )}
                  {initialPoint.type && (
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Tipo:{" "}
                      <span className="font-medium">{initialPoint.type}</span>
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-xs text-amber-900 font-medium">
                  Nenhum ponto inicial definido
                </p>
                <p className="text-[11px] text-amber-900 mt-1">
                  Selecione um local na lista abaixo e clique em{" "}
                  <span className="font-semibold">"como ponto inicial"</span>{" "}
                  para iniciar a rota.
                </p>
              </div>
            )}
          </div>

          {/* Lista de Resultados */}
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
                      key={location.id}
                      onClick={() => selectLocation(location)}
                      className={`w-full text-left p-3 hover:bg-slate-50 transition-colors ${
                        selectedLocation?.id === location.id ? "bg-blue-50" : ""
                      }`}
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
                            {location.city} / {location.state} • {location.type}
                          </div>
                        </div>
                        {selectedLocation?.id === location.id && (
                          <div className="flex items-center gap-1 text-blue-600 text-sm">
                            ✓ Selecionado
                          </div>
                        )}
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
        </div>

        {/* Informações do Local Selecionado */}
        {selectedLocation && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-blue-900">{selectedLocation.name}</p>
                <p className="text-blue-700 text-sm mt-1">
                  {selectedLocation.city} / {selectedLocation.state}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-blue-600">Tipo:</span>
                <span className="text-blue-900 ml-2">
                  {selectedLocation.type}
                </span>
              </div>
              <div>
                <span className="text-blue-600">Coordenadas:</span>
                <span className="text-blue-900 ml-2">
                  {selectedLocation.lat.toFixed(4)},{" "}
                  {selectedLocation.lng.toFixed(4)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Configurações do Ponto */}
        {selectedLocation && (
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-slate-900">Configurações do Ponto</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tipo de Ponto */}
              <div className="space-y-2">
                <Label>Tipo de Ponto</Label>
                <select
                  value={pointType}
                  onChange={(e) => setPointType(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {pointTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tempo no Local */}
              <div className="space-y-2">
                <Label>Tempo no Local</Label>
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

              {/* Velocidade Média */}
              <div className="space-y-2">
                <Label>Velocidade Média (km/h)</Label>
                <Input
                  type="number"
                  value={avgSpeed}
                  onChange={(e) => setAvgSpeed(Number(e.target.value))}
                  min={1}
                  max={120}
                />
              </div>

              {/* Funções ANTT deste ponto */}
              <div className="space-y-2">
                <Label>Funções ANTT deste ponto</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ANTT_FUNCTIONS.map((fn) => (
                    <label
                      key={fn.id}
                      className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={functions.includes(fn.id)}
                        onChange={() => toggleFunction(fn.id)}
                      />
                      <div>
                        <div className="font-medium text-slate-900">
                          {fn.label}
                        </div>
                        <div className="text-xs text-slate-600">
                          {fn.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Justificativa */}
            <div className="space-y-2">
              <Label>Justificativa Operacional</Label>
              <Input
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Descreva a justificativa para este ponto..."
              />
            </div>

            {/* (Opcional) Preview das flags derivadas para debug/UX */}
            {/* <pre className="text-xs text-slate-500">{JSON.stringify(flags, null, 2)}</pre> */}
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
          <Button variant="outline" type="button" onClick={handleClose}>
            Cancelar
          </Button>

          {canSetInitial && (
            <Button
              variant="outline"
              type="button"
              onClick={handleSetInitialLocal}
              disabled={!selectedLocation || !canSetInitial}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              {initialPoint
                ? "Alterar ponto inicial"
                : "Definir como ponto inicial"}
            </Button>
          )}

          <Button
            type="button"
            onClick={handleAdd}
            disabled={!selectedLocation}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Adicionar Ponto
          </Button>
        </div>
      </div>
    </Modal>
  );
}
