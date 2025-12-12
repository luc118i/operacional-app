// src/contexts/AuthContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import { API_URL } from "@/services/api";

type UserRole = "admin" | "user" | string;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number; // em segundos (24h = 86400)
  user: AuthUser;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  getAuthHeaders: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const API_BASE_URL = API_URL;

const STORAGE_TOKEN_KEY = "esquema_app.auth.token";
const STORAGE_USER_KEY = "esquema_app.auth.user";
const STORAGE_EXPIRES_AT_KEY = "esquema_app.auth.expiresAt";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const isAuthenticated = !!user && !!accessToken;

  function clearAuthStorage() {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
    localStorage.removeItem(STORAGE_EXPIRES_AT_KEY);
  }

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(STORAGE_TOKEN_KEY);
      const storedUser = localStorage.getItem(STORAGE_USER_KEY);
      const storedExpiresAt = localStorage.getItem(STORAGE_EXPIRES_AT_KEY);

      if (!storedToken || !storedUser || !storedExpiresAt) {
        setIsBootstrapping(false);
        return;
      }

      const expiresAtNumber = Number(storedExpiresAt);

      if (Number.isNaN(expiresAtNumber) || Date.now() > expiresAtNumber) {
        clearAuthStorage();
        setIsBootstrapping(false);
        return;
      }

      const parsedUser: AuthUser = JSON.parse(storedUser);

      setAccessToken(storedToken);
      setUser(parsedUser);
      setExpiresAt(expiresAtNumber);
    } catch {
      clearAuthStorage();
    } finally {
      setIsBootstrapping(false);
    }
  }, []);

  async function login(identifier: string, password: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ identifier, password }),
    });

    if (!response.ok) {
      let message = "Falha ao fazer login. Tente novamente.";

      try {
        const errorBody = await response.json();
        if (errorBody?.error?.message) {
          message = errorBody.error.message;
        }
      } catch {
        // mantém mensagem padrão
      }

      throw new Error(message);
    }

    const data: LoginResponse = await response.json();

    const now = Date.now();
    const expiresAtMs = now + data.expiresIn * 1000;

    setAccessToken(data.accessToken);
    setUser(data.user);
    setExpiresAt(expiresAtMs);

    localStorage.setItem(STORAGE_TOKEN_KEY, data.accessToken);
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(data.user));
    localStorage.setItem(STORAGE_EXPIRES_AT_KEY, String(expiresAtMs));
  }

  function logout() {
    setAccessToken(null);
    setUser(null);
    setExpiresAt(null);
    clearAuthStorage();
  }

  function getAuthHeaders(): Record<string, string> {
    if (!accessToken) {
      return {};
    }

    return {
      Authorization: `Bearer ${accessToken}`,
    };
  }

  const value: AuthContextValue = {
    isAuthenticated,
    user,
    accessToken,
    login,
    logout,
    getAuthHeaders,
  };

  if (isBootstrapping) {
    // Você pode colocar um loader global aqui, se quiser.
    // No mínimo, evita flicker de UI.
    // Exemplo simples:
    // return <div>Carregando...</div>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }

  return context;
}
