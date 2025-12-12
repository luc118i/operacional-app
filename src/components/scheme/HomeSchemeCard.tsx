// src/components/scheme/HomeSchemeCard.tsx
import {
  Clock,
  MapPin,
  Route,
  ChevronRight,
  Star,
  StarOff,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { isFavorite, toggleFavoriteScheme } from "@/lib/schemeStorage";

import type { SchemeCardSnapshot } from "@/types/scheme";

interface HomeSchemeCardProps {
  snapshot: SchemeCardSnapshot;
  direction?: "Ida" | "Volta";
  onClick: () => void;
  onToggleFavorite: () => void; // ⭐ ADICIONAR
}

export function HomeSchemeCard({
  snapshot,
  direction = "Ida",
  onClick,
  onToggleFavorite,
}: HomeSchemeCardProps) {
  const {
    lineCode,
    lineName,
    origin,
    originState,
    destination,
    destinationState,
    tripTime,
    totalKm,
    totalStops,
    totalPoints,
  } = snapshot;

  // Origem e destino formatados
  const origemLabel = `${origin} (${originState})`;
  const destinoLabel = `${destination} (${destinationState})`;

  const isFav = isFavorite(snapshot.schemeId);

  function handleToggleFavorite(e: React.MouseEvent) {
    e.stopPropagation();
    onToggleFavorite();
  }

  return (
    <Card
      onClick={onClick}
      className="
        p-6 
        hover:shadow-lg 
        transition-all 
        cursor-pointer 
        border border-slate-200 
        bg-white 
        hover:border-blue-300 
        group
      "
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <div
              className="
                w-12 h-12 rounded-lg 
                bg-blue-100 
                flex items-center justify-center 
                flex-shrink-0 
                group-hover:bg-blue-200 
                transition-colors
              "
            >
              <Route className="w-6 h-6 text-blue-600" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="text-slate-900">{lineCode}</h3>

                <Badge
                  variant="outline"
                  className={
                    direction?.toLowerCase() === "ida"
                      ? "border-green-300 text-green-700 bg-green-50"
                      : "border-purple-300 text-purple-700 bg-purple-50"
                  }
                >
                  {direction}
                </Badge>
              </div>

              <p className="text-slate-700">{lineName}</p>
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
              <span className="text-sm">Horário: {tripTime || "—"}</span>
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

        {/* ⭐ Estrela + Seta */}
        <div className="flex flex-col items-end gap-2">
          {/* ⭐ Botão Favorito */}
          <button
            onClick={handleToggleFavorite}
            className="
              p-1
              rounded-full
              hover:bg-blue-50
              transition-colors
            "
          >
            <Star
              size={20}
              className={
                isFav ? "text-blue-600 fill-blue-600" : "text-blue-400"
              }
            />
          </button>

          {/* Seta */}
          <div className="flex items-center">
            <ChevronRight
              className="
              w-6 h-6 
              text-slate-400 
              group-hover:text-blue-600 
              group-hover:translate-x-1 
              transition-all
            "
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
