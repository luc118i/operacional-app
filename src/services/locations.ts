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

// ==================================================
// GET /locations/sigla/:sigla
// ==================================================
export async function getLocationBySigla(
  sigla: string
): Promise<Location | null> {
  const normalized = sigla.trim().toUpperCase();
  if (!normalized) return null;

  const res = await fetch(
    `${API_BASE}/locations/sigla/${encodeURIComponent(normalized)}`
  );

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error("Erro ao buscar local pela sigla");
  }

  return (await res.json()) as Location;
}

// ==================================================
// GET /locations/:id
// ==================================================
export async function getLocationById(id: string): Promise<Location | null> {
  const res = await fetch(`${API_BASE}/locations/${id}`);

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error("Erro ao buscar local por ID");
  }

  return (await res.json()) as Location;
}

// ==================================================
// GET /locations?q=texto
// ==================================================
export async function searchLocations(q: string): Promise<Location[]> {
  const query = q.trim();
  const res = await fetch(
    `${API_BASE}/locations?q=${encodeURIComponent(query)}`
  );

  if (!res.ok) {
    throw new Error("Erro ao buscar locais");
  }

  return (await res.json()) as Location[];
}

// ==================================================
// POST /locations
// ==================================================
export async function createLocation(input: LocationInput): Promise<Location> {
  const res = await fetch(`${API_BASE}/locations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Erro ao criar local: ${res.status} - ${text || res.statusText}`
    );
  }

  return res.json();
}

// ==================================================
// PUT /locations/:id
// ==================================================
export async function updateLocation(
  id: string,
  input: LocationInput
): Promise<Location> {
  const res = await fetch(`${API_BASE}/locations/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Erro ao atualizar local: ${res.status} - ${text || res.statusText}`
    );
  }

  return res.json();
}

// ==================================================
// DELETE /locations/:id
// ==================================================
export async function deleteLocation(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/locations/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error("Erro ao excluir local");
  }
}
