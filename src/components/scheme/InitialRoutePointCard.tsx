// src/components/scheme/InitialRoutePointCard.tsx
import { useState } from "react";
import { ChevronDown, ChevronUp, Trash2, Route } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import type { RoutePoint } from "@/types/scheme";

interface InitialRoutePointCardProps {
  point: RoutePoint;
  index: number;
  onUpdate: (id: string, updates: Partial<RoutePoint>) => void;
  onDelete: (id: string) => void;
  previousPoint?: RoutePoint | null;
}

export function InitialRoutePointCard({
  point,
  index,
  onUpdate,
  onDelete,
}: InitialRoutePointCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const city = point.location?.city ?? "";
  const state = point.location?.state ?? "";
  const name = point.location?.name ?? "";

  const isInitial = !!point.isInitial;

  return (
    <Card className="border border-slate-200 overflow-hidden">
      {/* Header do Card */}
      <div className="bg-gradient-to-r from-slate-50 to-white p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white">
              {index + 1}
            </div>

            <div className="flex-1 min-w-0">
              {/* Cidade / UF */}
              <div className="flex items-center gap-2">
                <h3 className="text-slate-900 font-semibold truncate">
                  {city && state ? `${city} / ${state}` : "Ponto inicial"}
                </h3>

                {/* Badge de contexto */}
                {isInitial && (
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 
               text-[10px] font-semibold 
               bg-blue-100 text-blue-800 border border-blue-200"
                  >
                    Início da viagem
                  </span>
                )}
              </div>

              {/* Nome do local (se tiver) */}
              {name && (
                <p className="text-slate-600 text-xs truncate">{name}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
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

      {/* Corpo do Card */}
      {isExpanded && (
        <div className="p-4">
          {isInitial ? (
            /* Modo: ponto inicial oficial da viagem */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Hr. Saída (início) */}
              <div>
                <label className="text-slate-600 text-xs mb-1.5 block">
                  Hr. Saída (início)
                </label>
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm">
                  {point.departureTime ? (
                    <span className="text-slate-900">
                      {point.departureTime}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">
                      Adicione o próximo ponto para calcular o horário
                    </span>
                  )}
                </div>
              </div>

              {/* Distância (fica somente no modo inicial) */}
              <div>
                <label className="text-slate-600 text-xs mb-1.5 block">
                  Distância
                </label>
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 text-sm flex items-center gap-1">
                  <Route className="w-3.5 h-3.5 text-slate-500" />
                  <span>{point.distanceKm.toFixed(1)} km</span>
                </div>
              </div>
            </div>
          ) : (
            /* Modo: ponto pré-inicial */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Hr. Passagem (único campo no pré-inicial) */}
              <div>
                <label className="text-slate-600 text-xs mb-1.5 block">
                  Hr. Saida
                </label>
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm">
                  {point.departureTime ? (
                    <span className="text-slate-900">
                      {point.departureTime}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">
                      Horário calculado a partir do início da viagem
                    </span>
                  )}
                </div>
              </div>

              {/* Nada mais aqui! Distância removida completamente */}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
