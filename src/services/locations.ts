// src/services/locations.ts
import type { LocationInput, LocationType } from "@/types/location";

export type Location = {
  id: string;
  sigla: string;
  descricao: string;
  cidade: string;
  uf: string;
  tipo: LocationType;
  lat: number;
  lng: number;
};

export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

// ✅ mesma key do AuthContext
const STORAGE_TOKEN_KEY = "esquema_app.auth.token";

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readErrorText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

function buildAuthErrorMessage(text: string) {
  return `Não autorizado (401). Faça login novamente.${
    text ? ` - ${text}` : ""
  }`;
}

// ==================================================
// GET /locations/sigla/:sigla  (PÚBLICO)
// ==================================================
export async function getLocationBySigla(
  sigla: string
): Promise<Location | null> {
  const normalized = sigla.trim().toUpperCase();
  if (!normalized) return null;

  const res = await fetch(
    `${API_BASE}/locations/sigla/${encodeURIComponent(normalized)}`
  );

  if (res.status === 404) return null;

  if (!res.ok) {
    const text = await readErrorText(res);
    throw new Error(
      `Erro ao buscar local pela sigla: ${res.status} - ${
        text || res.statusText
      }`
    );
  }

  return (await res.json()) as Location;
}

// ==================================================
// GET /locations/:id (PÚBLICO)
// ==================================================
export async function getLocationById(id: string): Promise<Location | null> {
  const res = await fetch(`${API_BASE}/locations/${id}`);

  if (res.status === 404) return null;

  if (!res.ok) {
    const text = await readErrorText(res);
    throw new Error(
      `Erro ao buscar local por ID: ${res.status} - ${text || res.statusText}`
    );
  }

  return (await res.json()) as Location;
}

// ==================================================
// GET /locations?q=texto (PÚBLICO)
// ==================================================
export async function searchLocations(q: string): Promise<Location[]> {
  const query = q.trim();

  const res = await fetch(
    `${API_BASE}/locations?q=${encodeURIComponent(query)}`
  );

  if (!res.ok) {
    const text = await readErrorText(res);
    throw new Error(
      `Erro ao buscar locais: ${res.status} - ${text || res.statusText}`
    );
  }

  return (await res.json()) as Location[];
}

// ==================================================
// POST /locations (🔐 PROTEGIDO)
// ==================================================
export async function createLocation(input: LocationInput): Promise<Location> {
  const res = await fetch(`${API_BASE}/locations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(input),
  });

  if (res.status === 401) {
    const text = await readErrorText(res);
    throw new Error(buildAuthErrorMessage(text));
  }

  if (!res.ok) {
    const text = await readErrorText(res);
    throw new Error(
      `Erro ao criar local: ${res.status} - ${text || res.statusText}`
    );
  }

  return (await res.json()) as Location;
}

// ==================================================
// PUT /locations/:id (🔐 PROTEGIDO)
// ==================================================
export async function updateLocation(
  id: string,
  input: LocationInput
): Promise<Location> {
  const res = await fetch(`${API_BASE}/locations/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(input),
  });

  if (res.status === 401) {
    const text = await readErrorText(res);
    throw new Error(buildAuthErrorMessage(text));
  }

  if (!res.ok) {
    const text = await readErrorText(res);
    throw new Error(
      `Erro ao atualizar local: ${res.status} - ${text || res.statusText}`
    );
  }

  return (await res.json()) as Location;
}

// ==================================================
// DELETE /locations/:id (🔐 PROTEGIDO)
// ==================================================
export async function deleteLocation(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/locations/${id}`, {
    method: "DELETE",
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (res.status === 401) {
    const text = await readErrorText(res);
    throw new Error(buildAuthErrorMessage(text));
  }

  if (!res.ok) {
    const text = await readErrorText(res);
    throw new Error(
      `Erro ao excluir local: ${res.status} - ${text || res.statusText}`
    );
  }
}
