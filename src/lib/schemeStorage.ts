// src/lib/schemeStorage.ts
import {
  RECENT_SCHEMES_KEY,
  FAVORITE_SCHEMES_KEY,
  type SchemeCardSnapshot,
} from "@/types/scheme";

/* ============================================================
   Funções auxiliares para parse seguro do localStorage
   ============================================================ */

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    console.warn("[schemeStorage] JSON inválido no localStorage");
    return null;
  }
}

function safeGetItem<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  return safeParse<T>(raw);
}

function safeSetItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn("[schemeStorage] Falha ao salvar no localStorage", err);
  }
}

/* ============================================================
   RECENTES
   ============================================================ */

export function loadRecentSchemes(): SchemeCardSnapshot[] {
  const list = safeGetItem<SchemeCardSnapshot[]>(RECENT_SCHEMES_KEY);
  return Array.isArray(list) ? list : [];
}

export function saveRecentSchemes(list: SchemeCardSnapshot[]): void {
  safeSetItem(RECENT_SCHEMES_KEY, list);
}

/**
 * Adiciona um esquema aos recentes:
 * - Move para o topo caso já exista
 * - Limita a 10 itens
 */
export function addRecentScheme(scheme: SchemeCardSnapshot): void {
  const current = loadRecentSchemes();

  // remove duplicado
  const filtered = current.filter((s) => s.schemeId !== scheme.schemeId);

  const updated = [scheme, ...filtered].slice(0, 10);

  saveRecentSchemes(updated);
}

/* ============================================================
   FAVORITOS
   ============================================================ */

export function loadFavoriteSchemes(): SchemeCardSnapshot[] {
  const list = safeGetItem<SchemeCardSnapshot[]>(FAVORITE_SCHEMES_KEY);
  return Array.isArray(list) ? list : [];
}

export function saveFavoriteSchemes(list: SchemeCardSnapshot[]): void {
  safeSetItem(FAVORITE_SCHEMES_KEY, list);
}

export function isFavorite(schemeId: string): boolean {
  const favorites = loadFavoriteSchemes();
  return favorites.some((s) => s.schemeId === schemeId);
}

/**
 * Alterna favorito:
 * - Se já existe → remove
 * - Se não existe → adiciona
 * - Retorna a lista atualizada (útil para setState na Home)
 */
export function toggleFavoriteScheme(
  scheme: SchemeCardSnapshot
): SchemeCardSnapshot[] {
  const favorites = loadFavoriteSchemes();
  const exists = favorites.some((s) => s.schemeId === scheme.schemeId);

  let updated: SchemeCardSnapshot[];
  if (exists) {
    updated = favorites.filter((s) => s.schemeId !== scheme.schemeId);
  } else {
    updated = [...favorites, scheme];
  }

  saveFavoriteSchemes(updated);
  return updated;
}
