// src/pages/SchemeDetail/index.tsx
import { SchemeDetailPage } from "./SchemeDetailPage";
import { useSchemeDetail } from "@/hooks/useSchemeDetail";

interface SchemeDetailContainerProps {
  schemeId: string;
  onBack: () => void;
}

export function SchemeDetailContainer({
  schemeId,
  onBack,
}: SchemeDetailContainerProps) {
  const { data, loading, error } = useSchemeDetail(schemeId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">
        Carregando detalhes do esquema...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        {error}
      </div>
    );
  }

  if (!data) return null;

  // aqui o SchemeDetailPage recebe o OperationalScheme completo
  return <SchemeDetailPage scheme={data} onBack={onBack} />;
}
