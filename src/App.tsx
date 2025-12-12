import { useState, useEffect } from "react";

import { HomePage } from "./pages/Home/HomePage";
import { SchemeDetailPage } from "./pages/SchemeDetail/SchemeDetailPage";
import { CreateSchemePage } from "./pages/SchemeCreate/CreateSchemePage";
import { LocationCreatePage } from "./pages/Locations/LocationCreatePage";

import { LoginModal } from "./components/auth/LoginModal";
import { Footer } from "./components/Footer/Footer";
import { printConsoleInfo } from "./utils/consoleInfo";

import { useAuth } from "./context/AuthContext";

// Tipos continuam IGUAIS
export interface RoutePoint {
  id: string;
  city: string;
  state: string;
  arrivalTime: string;
  localTime: number;
  departureTime: string;
  travelTime: number;
  avgSpeed: number;
  distance: number;
  pointType: string;
  justification: string;
  lat: number;
  lng: number;
  accumulatedDistance: number;
  establishment?: string;
}

export interface InitialPoint {
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

export interface OperationalScheme {
  id: string;

  lineCode: string;
  lineName: string;
  direction: "Ida" | "Volta";

  origin: string;
  originState: string;
  destination: string;
  destinationState: string;

  tripTime: string;

  initialPoint?: InitialPoint;
  routePoints: RoutePoint[];

  totalKm?: number;
  totalStops?: number;
  totalExpectedStops?: number;

  totalTravelMinutes?: number;
  totalStopMinutes?: number;
  totalDurationMinutes?: number;
  averageSpeedKmH?: number;

  travelTime?: string;
  totalStopTime?: string;

  rulesStatus?: {
    status: string;
    message: string;
  };

  createdAt?: string;
  updatedAt?: string;
}

// 🔥 Agora o state guarda só o ID
type ViewType = "home" | "detail" | "create" | "createLocation";

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>("home");
  const [selectedSchemeId, setSelectedSchemeId] = useState<string | null>(null);

  // ✅ controla abrir/fechar modal de login
  const [loginOpen, setLoginOpen] = useState(false);

  const { isAuthenticated } = useAuth();

  const handleViewScheme = (schemeId: string) => {
    setSelectedSchemeId(schemeId);
    setCurrentView("detail");
  };

  const handleBackToHome = () => {
    setCurrentView("home");
    setSelectedSchemeId(null);
  };

  const handleCreateNew = () => {
    if (!isAuthenticated) {
      setLoginOpen(true);
      return;
    }
    setCurrentView("create");
  };

  const handleCreateLocation = () => {
    if (!isAuthenticated) {
      setLoginOpen(true);
      return;
    }
    setCurrentView("createLocation");
  };

  const handleLoginClick = () => {
    setLoginOpen(true);
  };

  const handleCloseLogin = () => {
    setLoginOpen(false);
  };
  useEffect(() => {
    printConsoleInfo();
  }, []);

  useEffect(() => {
    const favicon = document.querySelector("link[rel='icon']");

    if (!favicon) return;

    if (isAuthenticated) {
      favicon.setAttribute("href", "./assets/logo-admin.png");
    } else {
      favicon.setAttribute("href", "/assets/favicon-guest.png");
    }
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Conteúdo principal */}
      <main className="flex-1 bg-gradient-to-br from-slate-50 to-slate-100">
        {currentView === "home" && (
          <HomePage
            onViewScheme={handleViewScheme}
            onCreateNew={handleCreateNew}
            onCreateLocation={handleCreateLocation}
            onLoginClick={handleLoginClick}
          />
        )}

        {currentView === "detail" && selectedSchemeId && (
          <SchemeDetailPage
            schemeId={selectedSchemeId}
            onBack={handleBackToHome}
          />
        )}

        {currentView === "create" && (
          <CreateSchemePage onBack={handleBackToHome} />
        )}

        {currentView === "createLocation" && (
          <LocationCreatePage onBack={handleBackToHome} />
        )}
      </main>

      {/* Footer global */}
      <Footer />

      {/* Modal de login montado globalmente */}
      <LoginModal open={loginOpen} onClose={handleCloseLogin} />
    </div>
  );
}
