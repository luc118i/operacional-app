import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw } from "lucide-react";

import type {
  ImportDryRunResponse,
  MissingLocation,
} from "@/types/schemeImport";

import {
  commitSchemesImport,
  dryRunSchemesImport,
} from "@/lib/schemeImportApi";

type Step = 1 | 2;

type Props = {
  onBack: () => void;
};

export function SchemeImportWizardPage({ onBack }: Props) {
  const [step, setStep] = useState<Step>(1);

  const [file, setFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<ImportDryRunResponse | null>(
    null
  );

  type BusyState = "idle" | "dryRun" | "refresh" | "commit";
  const [busy, setBusy] = useState<BusyState>("idle");
  const [error, setError] = useState<string>("");

  const UI = {
    title: "Importar esquemas (CSV)",
    subtitle:
      "Envie uma planilha e o sistema verifica pendências antes de importar.",
    steps: {
      upload: "1. Enviar planilha",
      review: "2. Verificação",
    },
    actions: {
      verify: "Verificar planilha",
      recheck: "Reverificar planilha",
      import: "Confirmar importação",
    },
    status: {
      approved: "Aprovado",
      pending: "Com pendências",
    },
  };

  // -----------------------------
  // Loading / disponibilidade
  // -----------------------------
  const isBusy = busy !== "idle";
  const isDryRunning = busy === "dryRun";
  const isRefreshing = busy === "refresh";
  const isCommitting = busy === "commit";

  const canInteract = !isBusy;
  const canGoStep2 = !!importData;

  // -----------------------------
  // "Sensação de clique"
  // -----------------------------
  const pressable =
    "transform-gpu transition-all duration-150 " +
    "active:scale-[0.97] active:translate-y-[1px] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 " +
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:active:translate-y-0";

  const pillPressableEnabled =
    "cursor-pointer select-none transform-gpu transition-all duration-150 " +
    "active:scale-[0.98] active:translate-y-[1px] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2";

  const pillDisabled = "opacity-60 cursor-not-allowed";

  // -----------------------------
  // A) Derivados e ordem correta
  // -----------------------------
  const normalizedStatus = (importData?.status ?? "").toUpperCase();
  const isValid = normalizedStatus === "VALID";

  const missingLocationsSafe = useMemo<MissingLocation[]>(() => {
    const raw = importData?.missingLocations;
    if (Array.isArray(raw)) return raw;

    const fromResolve = (importData as any)?.resolve?.missing;
    if (Array.isArray(fromResolve)) return fromResolve as MissingLocation[];

    return [];
  }, [importData]);

  const missingCount = useMemo(() => {
    if (missingLocationsSafe.length > 0) return missingLocationsSafe.length;
    return importData?.validation?.summary?.missingLocationsUnique ?? 0;
  }, [
    missingLocationsSafe.length,
    importData?.validation?.summary?.missingLocationsUnique,
  ]);

  const hasMissingLocations = missingCount > 0;

  const isApproved = !!importData && isValid && !hasMissingLocations;

  const importSessionId = useMemo(() => {
    const raw =
      (importData as any)?.importSessionId ??
      (importData as any)?.import_session_id ??
      (importData as any)?.importSessionID;

    return typeof raw === "string" ? raw.trim() : "";
  }, [importData]);

  const canCommit = isApproved && !!importSessionId;

  const isBlocked = !!importData && !isApproved;

  // -----------------------------
  // Textos
  // -----------------------------
  const statusLabel = isApproved ? UI.status.approved : UI.status.pending;

  const diagnosisTitle = hasMissingLocations
    ? "Localizações ausentes no cadastro"
    : isValid
    ? "Verificação aprovada"
    : "Pendências na verificação";

  const commitDisabledTitle = !canCommit
    ? !isApproved
      ? "Importação bloqueada... resolva pendências e reverifique."
      : "A verificação foi aprovada, mas o backend não retornou importSessionId. Clique em ‘Reverificar planilha’."
    : "";

  // -----------------------------
  // Navegação Steps
  // -----------------------------
  function goToStep(next: Step) {
    if (!canInteract) return;

    if (next === 1) {
      setStep(1);
      setError("");
      return;
    }

    if (canGoStep2) {
      setStep(2);
      setError("");
    }
  }

  // -----------------------------
  // D) Handlers
  // -----------------------------
  async function handleDryRun(force?: boolean) {
    if (!file) {
      setError("Selecione um arquivo CSV.");
      return;
    }

    setBusy("dryRun");
    setError("");
    try {
      const result = await dryRunSchemesImport({ file, force });

      // DEBUG (temporário)
      console.log("[DEBUG] dryRun status:", (result as any)?.status);
      console.log("[DEBUG] dryRun importSessionId raw:", {
        importSessionId: (result as any)?.importSessionId,
        import_session_id: (result as any)?.import_session_id,
        importSessionID: (result as any)?.importSessionID,
      });
      console.log("[DEBUG] dryRun keys:", Object.keys(result as any));

      setImportData(result);
      setStep(2);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao verificar a planilha.");
    } finally {
      setBusy("idle");
    }
  }

  async function handleRefresh() {
    if (!file) {
      setError("Selecione novamente o arquivo CSV para reverificar.");
      return;
    }

    setBusy("refresh");
    setError("");
    try {
      const updated = await dryRunSchemesImport({ file, force: true });
      setImportData(updated);
      setStep(2);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao reverificar.");
    } finally {
      setBusy("idle");
    }
  }

  async function handleCommit() {
    console.log("importSessionId (front):", importSessionId);
    console.log("importData:", importData);

    if (!importSessionId) {
      setError(
        "Verificação aprovada, mas a sessão de importação não foi retornada pelo backend. Clique em “Reverificar planilha”."
      );
      return;
    }

    setBusy("commit");
    setError("");
    try {
      await commitSchemesImport(importSessionId);
      alert("Importação concluída.");
    } catch (e: any) {
      setError(e?.message ?? "Erro ao concluir a importação.");
    } finally {
      setBusy("idle");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-slate-900 font-semibold text-lg">
                {UI.title}
              </h1>
              <p className="text-slate-600 text-sm break-words">
                {UI.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                onClick={onBack}
                disabled={isBusy}
                className={pressable}
              >
                Voltar
              </Button>

              <button
                type="button"
                onClick={() => goToStep(1)}
                disabled={!canInteract}
                className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                  step === 1
                    ? "bg-white border-slate-300 text-slate-900"
                    : "bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200"
                } ${!canInteract ? pillDisabled : pillPressableEnabled}`}
              >
                {UI.steps.upload}
              </button>

              <button
                type="button"
                onClick={() => goToStep(2)}
                disabled={!canInteract || !canGoStep2}
                className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                  step === 2
                    ? "bg-white border-slate-300 text-slate-900"
                    : "bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200"
                } ${
                  !canInteract || !canGoStep2
                    ? pillDisabled
                    : pillPressableEnabled
                }`}
                title={
                  !canGoStep2
                    ? "Faça a verificação para acessar esta etapa."
                    : ""
                }
              >
                {UI.steps.review}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 border border-red-200 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {step === 1 && (
          <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-slate-900 font-semibold mb-2">Upload do CSV</h2>
            <p className="text-slate-600 text-sm mb-4 break-words">
              Selecione o arquivo CSV para iniciar a verificação.
            </p>

            <div className="flex flex-col gap-3 max-w-xl">
              <Input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);

                  setImportData(null);
                  setStep(1);
                  setError("");
                }}
              />

              <div className="flex gap-2">
                <Button
                  onClick={() => handleDryRun(false)}
                  disabled={isBusy || !file}
                  className={`bg-blue-600 hover:bg-blue-700 text-white ${pressable}`}
                >
                  {isDryRunning ? "Verificando..." : UI.actions.verify}
                </Button>
              </div>
            </div>
          </section>
        )}

        {step === 2 && importData && (
          <section className="grid grid-cols-1 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-3">
                {/* ESQUERDA */}
                <div className="min-w-0">
                  <h2 className="text-slate-900 font-semibold">
                    {diagnosisTitle}
                  </h2>

                  <p className="text-slate-600 text-sm break-words">
                    {hasMissingLocations ? (
                      <>
                        Alguns locais informados na planilha não estão
                        cadastrados no sistema. Cadastre (ou ajuste o nome) e
                        clique em <strong>{UI.actions.recheck}</strong>.
                        {!isValid ? (
                          <>
                            {" "}
                            Além disso, existem outras pendências na
                            verificação.
                          </>
                        ) : null}
                      </>
                    ) : isValid ? (
                      <>
                        Nenhuma pendência encontrada. Você já pode concluir a
                        importação.
                      </>
                    ) : (
                      <>
                        Encontramos pendências na verificação. Resolva e clique
                        em <strong>{UI.actions.recheck}</strong>.
                      </>
                    )}
                  </p>

                  {/* clareza quando a sessão não vem */}
                  {isApproved && !importSessionId && (
                    <div className="mt-3 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-900">
                      <div className="font-semibold">
                        Sessão de importação ausente
                      </div>
                      <div className="text-sm mt-1 break-words">
                        A verificação foi aprovada, mas o backend não retornou{" "}
                        <strong>importSessionId</strong>. Clique em{" "}
                        <strong>{UI.actions.recheck}</strong> para tentar
                        novamente.
                      </div>
                    </div>
                  )}
                </div>

                {/* DIREITA (ações sempre visíveis) */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <div className="text-slate-700 text-sm">
                    Situação:{" "}
                    <span
                      className={`font-semibold ${
                        isApproved ? "text-green-700" : "text-amber-800"
                      }`}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={handleRefresh}
                      disabled={isBusy}
                      variant="outline"
                      size="sm"
                      className={`gap-2 ${pressable}`}
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${
                          isRefreshing ? "animate-spin" : ""
                        }`}
                      />
                      {isRefreshing ? "Reverificando..." : UI.actions.recheck}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleCommit}
                      disabled={isBusy || !canCommit}
                      title={
                        !canCommit
                          ? !isApproved
                            ? "Importação bloqueada. Resolva as pendências e reverifique."
                            : "Verificação aprovada, mas a sessão de importação não foi retornada. Clique em ‘Reverificar planilha’."
                          : ""
                      }
                    >
                      Confirmar importação
                    </Button>
                  </div>
                </div>
              </div>

              {isBlocked && (
                <div className="mt-3 p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-900">
                  <div className="font-semibold">Importação bloqueada</div>
                  <div className="text-sm mt-1 break-words">
                    {hasMissingLocations ? (
                      <>
                        Existem locais na planilha que não estão cadastrados no
                        sistema. Sem isso, não é possível concluir a importação.
                      </>
                    ) : (
                      <>
                        Encontramos pendências na verificação que precisam ser
                        resolvidas antes de importar.
                      </>
                    )}
                  </div>

                  {hasMissingLocations && (
                    <div className="text-sm mt-3">
                      <div className="font-medium">Como resolver</div>
                      <ol className="list-decimal ml-5 mt-1 space-y-1">
                        <li>
                          Cadastre os locais listados abaixo (ou ajuste o nome
                          na planilha).
                        </li>
                        <li>
                          Clique em <strong>{UI.actions.recheck}</strong>.
                        </li>
                      </ol>
                    </div>
                  )}
                </div>
              )}

              {missingCount === 0 ? (
                <div
                  className={`p-4 rounded-lg border ${
                    isValid
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  {isValid
                    ? "Nenhuma localização ausente encontrada."
                    : "Nenhuma localização ausente encontrada, mas ainda existem pendências na verificação."}
                </div>
              ) : (
                <div className="space-y-4">
                  {missingLocationsSafe.map((loc) => (
                    <div
                      key={loc.descricaoNorm}
                      className="border border-slate-200 rounded-lg p-4"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-red-600">●</span>
                        <h3 className="font-semibold text-slate-900 break-words">
                          {loc.descricaoNorm}
                        </h3>

                        {typeof loc.occurrences === "number" && (
                          <span className="text-xs text-slate-500">
                            ({loc.occurrences} ocorrência
                            {loc.occurrences === 1 ? "" : "s"})
                          </span>
                        )}
                      </div>

                      <div className="mt-2 text-slate-600 text-sm break-words">
                        Exemplos afetados ({loc.examples?.length ?? 0}):
                      </div>

                      <ul className="mt-2 space-y-1">
                        {(loc.examples ?? []).map((ex, idx) => (
                          <li
                            key={`${loc.descricaoNorm}-${idx}`}
                            className="text-slate-800 text-sm break-words"
                          >
                            {ex.codigoLinha} · {ex.horaPartida} · {ex.sentido}
                            {ex.externalKey && (
                              <span className="text-slate-500">
                                {" "}
                                · {ex.externalKey}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {!isValid && importData.validation?.summary && (
                <div className="mt-3 p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-900">
                  <div className="font-semibold">Resumo de validações</div>
                  <div className="text-sm mt-1 break-words">
                    Erros: {importData.validation.summary.errorsCount} ·
                    Alertas: {importData.validation.summary.warningsCount} ·
                    Esquemas inválidos:{" "}
                    {importData.validation.summary.invalidSchemes} /{" "}
                    {importData.validation.summary.totalSchemes}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
