import type { SchemeCardSnapshot } from "@/types/scheme";

// Normalização para busca (remove acentos + baixa tudo)
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// 🔍 Busca local inteligente nos cards
export function matchesSearchQuery(
  scheme: SchemeCardSnapshot,
  query: string
): boolean {
  if (!query || query.length < 3) return true;

  const normalizedQuery = normalizeText(query);

  const haystackParts: string[] = [
    scheme.lineCode,
    scheme.lineName,
    scheme.origin,
    scheme.destination,
  ].filter(Boolean) as string[];

  const haystack = normalizeText(haystackParts.join(" "));

  return haystack.includes(normalizedQuery);
}
