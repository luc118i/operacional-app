import { ImportDryRunResponse } from "@/types/schemeImport";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

function getAuthHeader(): HeadersInit {
  // ajuste para seu AuthContext/localStorage (JWT)
  const token = localStorage.getItem("esquema_app.auth.token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function dryRunSchemesImport(params: {
  file: File;
  force?: boolean;
  importSessionId?: string;
}): Promise<ImportDryRunResponse> {
  const url = new URL(`${API_BASE}/imports/schemes/dry-run`);
  if (params.force) url.searchParams.set("force", "1");
  if (params.importSessionId)
    url.searchParams.set("importSessionId", params.importSessionId);

  const form = new FormData();
  form.append("file", params.file);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      ...getAuthHeader(),
      // NÃO setar Content-Type com FormData
    },
    body: form,
  });

  // Erro HTTP: tenta extrair mensagem útil
  if (!res.ok) {
    const contentType = res.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await res.json().catch(() => null)
      : await res.text().catch(() => "");

    const msg =
      (typeof payload === "string" && payload) ||
      (payload &&
        typeof payload === "object" &&
        "message" in payload &&
        String((payload as any).message)) ||
      `Falha no DRY-RUN (${res.status})`;

    throw new Error(msg);
  }

  // Sucesso: parse seguro
  const data = (await res.json()) as ImportDryRunResponse;

  // Normalização defensiva: garante que missingLocations exista se vier via resolve.missing
  // (isso evita map of undefined no front e resolve divergência de shape)
  if (!data.missingLocations && data.resolve?.missing) {
    data.missingLocations = data.resolve.missing;
  }

  // Outra defesa: se o backend mandar null em vez de array
  if (data.missingLocations == null) {
    data.missingLocations = [];
  }

  return data;
}

/**
 * Atualizar lista:
 * - Se o backend tiver GET por importSessionId, use aqui.
 * - Caso não tenha, pode reusar o DRY-RUN (mesmo arquivo) com force=1 (menos ideal).
 */

export async function commitSchemesImport(
  importSessionId: string
): Promise<{ ok: boolean }> {
  if (typeof importSessionId !== "string" || !importSessionId.trim()) {
    throw new Error("importSessionId é obrigatório e deve ser string.");
  }

  const url = new URL(`${API_BASE}/imports/schemes/commit`);
  url.searchParams.set("importSessionId", importSessionId.trim());

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    // ✅ Envia também no body (muitos backends exigem isso)
    body: JSON.stringify({ importSessionId: importSessionId.trim() }),
  });

  if (!res.ok) {
    const raw = await res.text().catch(() => "");

    // ✅ tenta extrair mensagem amigável do JSON
    try {
      const parsed = JSON.parse(raw);
      const msg =
        parsed?.error?.message ||
        parsed?.message ||
        raw ||
        `Falha no commit (${res.status})`;
      throw new Error(msg);
    } catch {
      throw new Error(raw || `Falha no commit (${res.status})`);
    }
  }

  // ✅ evita crash se o backend responder 204/empty
  const rawOk = await res.text().catch(() => "");
  if (!rawOk) return { ok: true };

  try {
    return JSON.parse(rawOk) as { ok: boolean };
  } catch {
    // fallback: se backend respondeu texto
    return { ok: true };
  }
}
