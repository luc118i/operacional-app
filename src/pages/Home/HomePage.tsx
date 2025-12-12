// src/pages/Home/HomePage.tsx
import { useState, useMemo } from "react";
import { Search, Route, User, LogOut } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HomeSchemeCard } from "@/components/scheme/HomeSchemeCard";

import { useAuth } from "@/context/AuthContext";

import adminLogo from "../../../public/logo-admin.png";

import { useSchemes } from "@/hooks/useSchemes";

import type {
  SchemeListItem,
  SchemeCardSnapshot,
  FilterMode,
} from "@/types/scheme";

import {
  loadRecentSchemes,
  loadFavoriteSchemes,
  addRecentScheme,
  toggleFavoriteScheme,
} from "@/lib/schemeStorage";

import { mapListItemToCardSnapshot } from "@/lib/schemeMappers";

interface HomePageProps {
  onViewScheme: (schemeId: string) => void;
  onCreateNew: () => void;
  onCreateLocation: () => void;
  onLoginClick?: () => void;
}

export function HomePage({
  onViewScheme,
  onCreateNew,
  onCreateLocation,
  onLoginClick,
}: HomePageProps) {
  const { isAuthenticated, logout, user } = useAuth();

  const isAdmin = isAuthenticated && user?.role === "admin";

  const { data: schemes, loading, error } = useSchemes();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const normalizedSearch = searchTerm.trim();
  const showFilters = normalizedSearch.length < 3;

  const allSnapshots = useMemo<SchemeCardSnapshot[]>(() => {
    return schemes.map((item: SchemeListItem) =>
      mapListItemToCardSnapshot(item)
    );
  }, [schemes]);

  const recentSnapshots = loadRecentSchemes();
  const [favoriteSnapshots, setFavoriteSnapshots] = useState(
    loadFavoriteSchemes()
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">
        Carregando esquemas operacionais...
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

  let listToRender: SchemeCardSnapshot[] = [];

  if (filterMode === "all") listToRender = allSnapshots;
  if (filterMode === "recent") listToRender = recentSnapshots;
  if (filterMode === "favorites") listToRender = favoriteSnapshots;

  let filteredSnapshots: SchemeCardSnapshot[] = listToRender;

  if (normalizedSearch.length >= 3) {
    const term = normalizedSearch.toLowerCase();

    filteredSnapshots = listToRender.filter((snap) => {
      return (
        snap.lineCode.toLowerCase().includes(term) ||
        snap.lineName.toLowerCase().includes(term) ||
        snap.origin.toLowerCase().includes(term) ||
        snap.destination.toLowerCase().includes(term) ||
        `${snap.origin} ${snap.originState}`.toLowerCase().includes(term) ||
        `${snap.destination} ${snap.destinationState}`
          .toLowerCase()
          .includes(term)
      );
    });
  }

  function handleOpenSnapshot(snapshot: SchemeCardSnapshot) {
    addRecentScheme(snapshot);
    onViewScheme(snapshot.schemeId);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center justify-between">
            {/* Bloco logo + título */}

            <div className="flex items-center gap-3">
              {/* LOGO DINÂMICO */}
              {isAuthenticated ? (
                // LOGO ADMIN
                <div className="w-12 h-12 rounded-xl bg-[#3F474F] shadow-lg overflow-hidden flex items-center justify-center">
                  <img
                    src={adminLogo}
                    alt="Logo Admin"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                // LOGO PADRÃO (AZUL)
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
                  <Route className="w-6 h-6 text-white" />
                </div>
              )}

              <div className="leading-tight">
                <h1 className="text-slate-900 font-semibold text-base sm:text-lg">
                  Painel Operacional
                </h1>
                <p className="text-slate-600 text-xs sm:text-sm">
                  Esquemas operacionais e rotas
                </p>
              </div>
            </div>

            {/* Área direita */}
            {!isAuthenticated ? (
              // MODO PÚBLICO — ÍCONE DE LOGIN
              <button
                type="button"
                onClick={onLoginClick}
                className="inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
                aria-label="Acesso administrativo"
              >
                <User className="w-5 h-5" />
              </button>
            ) : (
              // MODO AUTENTICADO — MENU SIMPLES + LOGOUT
              <div className="flex items-center gap-3">
                <div className="flex flex-col leading-tight">
                  <span className="text-slate-500 text-xs">Bem-vindo(a)</span>
                  <span className="text-slate-800 font-medium">
                    {user?.name ?? "Operador"}
                  </span>
                </div>

                <button
                  onClick={logout}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-red-100 text-red-600 transition-colors"
                  aria-label="Sair"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* BOTÕES AVANÇADOS (somente autenticado) */}
        {isAuthenticated && (
          <div className="flex flex-wrap gap-2 mb-8">
            <Button
              onClick={onCreateNew}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Criar/Editar esquema
            </Button>

            <Button
              onClick={onCreateLocation}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Cadastrar local
            </Button>
          </div>
        )}

        {/* Busca */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar esquema operacional..."
              className="pl-12 h-14 text-base border-slate-300 bg-slate-50/60"
            />
          </div>
        </div>

        {/* Filtros */}
        {showFilters && (
          <div className="mb-6 flex items-center gap-2">
            {["all", "recent", "favorites"].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilterMode(mode as FilterMode)}
                className={`px-4 py-2 rounded-full border text-sm transition-all ${
                  filterMode === mode
                    ? "bg-white shadow-sm border-slate-300 text-slate-900"
                    : "bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200"
                }`}
              >
                {mode === "all" && "Todos"}
                {mode === "recent" && "Recentes"}
                {mode === "favorites" && "Favoritos"}
              </button>
            ))}
          </div>
        )}

        <p className="text-slate-600 mb-4">
          {filteredSnapshots.length} esquema
          {filteredSnapshots.length !== 1 ? "s" : ""} encontrado
          {filteredSnapshots.length !== 1 ? "s" : ""}.
        </p>

        {/* Lista */}
        <div className="grid grid-cols-1 gap-4">
          {filteredSnapshots.map((snap) => (
            <HomeSchemeCard
              key={snap.schemeId}
              snapshot={snap}
              direction={snap.direction}
              onClick={() => handleOpenSnapshot(snap)}
              onToggleFavorite={() => {
                toggleFavoriteScheme(snap);
                setFavoriteSnapshots(loadFavoriteSchemes());
              }}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
