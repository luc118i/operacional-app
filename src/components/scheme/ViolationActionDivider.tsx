import { Plus, AlertTriangle, Coffee, Bed, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

function iconForExpected(fn?: string) {
  if (fn === "DESCANSO") return Bed;
  if (fn === "APOIO") return Coffee;
  if (fn === "TROCA_MOTORISTA") return RefreshCcw;
  return AlertTriangle;
}

export function ViolationActionDivider({
  title,
  suggestion,
  expectedFunction,
  onAdd,
}: {
  title?: string;
  suggestion?: string;
  expectedFunction?: string;
  onAdd: () => void;
}) {
  const Icon = iconForExpected(expectedFunction);

  return (
    <div className="w-full my-4">
      {/* linha separadora */}
      <div className="h-px w-full bg-slate-200" />

      {/* pill centralizado */}
      <div className="flex w-full justify-center">
        <div
          onClick={onAdd}
          className="
            group
            cursor-pointer
            flex items-center gap-3
            rounded-full border border-amber-200 bg-amber-50
            px-4 py-2
            shadow-sm
            motion-safe:animate-pulse
            hover:animate-none
            hover:shadow-md
            transition
          "
          title="Inserir ponto recomendado"
        >
          <Icon className="h-4 w-4 text-amber-700 shrink-0" />

          <div className="text-xs text-amber-900 text-center">
            <div className="font-semibold">{title ?? "Ação recomendada"}</div>
            <div className="text-amber-800">
              {suggestion ?? "Inserir um ponto de troca (TMJ)"}
            </div>
          </div>

          <Button
            type="button"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            className="
              h-8 w-8 shrink-0
              rounded-full
              bg-blue-600 hover:bg-blue-700
              group-hover:scale-110
              transition
            "
          >
            <Plus className="h-4 w-4 text-white" />
          </Button>
        </div>
      </div>
    </div>
  );
}
