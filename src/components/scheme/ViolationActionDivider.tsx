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
    <div className="relative flex items-center justify-center">
      <div className="h-px w-full bg-slate-200" />

      <div className="absolute flex items-center gap-3 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 shadow-sm">
        <Icon className="h-4 w-4 text-amber-700" />

        <div className="text-xs text-amber-900">
          <div className="font-semibold">{title ?? "Ação recomendada"}</div>
          {suggestion && <div className="text-amber-800">{suggestion}</div>}
        </div>

        <Button
          type="button"
          size="icon"
          onClick={onAdd}
          className="h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700 animate-pulse"
          title="Inserir ponto recomendado aqui"
        >
          <Plus className="h-4 w-4 text-white" />
        </Button>
      </div>
    </div>
  );
}
