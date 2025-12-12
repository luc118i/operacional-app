import { Card } from "@/components/ui/card";
import type { RoutePoint } from "@/types/scheme";

interface DetailFirstPointCardProps {
  point: RoutePoint;
  index: number;
}

export function DetailFirstPointCard({
  point,
  index,
}: DetailFirstPointCardProps) {
  const city = point.location?.city ?? "";
  const state = point.location?.state ?? "";
  const description =
    point.location?.name ?? point.location?.shortName ?? `${city} / ${state}`;

  return (
    <Card className="border border-slate-200 overflow-hidden bg-slate-50">
      {/* ===================== HEADER ===================== */}
      <div className="bg-gradient-to-r from-slate-50 to-white p-4 border-b border-slate-200">
        <div className="flex items-start justify-between gap-4">
          {/* ESQUERDA: número + texto */}
          <div className="flex items-start gap-3">
            {/* Ordem – usa o mesmo estilo do card normal */}
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white flex-shrink-0">
              {index + 1}
            </div>

            <div className="flex-1 min-w-0">
              {/* Linha: Descrição + Badge */}
              <div className="flex items-center gap-2">
                <h3 className="text-slate-900 text-base font-medium truncate">
                  {description}
                </h3>

                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px]
        font-semibold bg-slate-200 text-slate-700 border border-slate-300 whitespace-nowrap"
                >
                  Pré-viagem
                </span>
              </div>

              {/* Cidade / UF */}
              <p className="text-slate-600 text-sm truncate">
                {city} {city && state && "/"} {state}
              </p>
            </div>
          </div>

          {/* DIREITA – Distância Acumulada */}
          <div className="text-right">
            <p className="text-slate-600 text-xs">Distância Acumulada</p>
            <p className="text-slate-900 font-medium">
              {point.cumulativeDistanceKm.toFixed(1)} km
            </p>
          </div>
        </div>
      </div>

      {/* ===================== CONTEÚDO ENXUTO ===================== */}
      <div className="p-4">
        {/* Horários (somente saída e, se quiser, chegada) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {/* Saída (ESSENCIAL) */}
          <div>
            <p className="text-slate-600 text-xs mb-1">Saída</p>
            <p className="text-slate-900">{point.departureTime}</p>
          </div>
        </div>

        {/* Tipo */}
        <div className="pb-4 border-b border-slate-200 mb-4">
          <p className="text-slate-600 text-xs mb-1">Tipo de Ponto</p>
          <p className="text-slate-900 text-sm">Ponto Livre / Garagem</p>
        </div>

        {/* Texto explicativo */}
        <p className="text-xs text-slate-500 leading-relaxed">
          Este ponto representa a preparação do veículo antes do início da
          viagem. Os tempos de deslocamento, parada e demais métricas são
          contabilizados a partir do ponto marcado como{" "}
          <span className="font-semibold">“Início da viagem”.</span>
        </p>
      </div>
    </Card>
  );
}
