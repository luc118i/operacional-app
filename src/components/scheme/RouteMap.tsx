import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Tooltip,
} from "react-leaflet";
import type { InitialPoint, RoutePoint } from "@/types/scheme";

interface RouteMapProps {
  points: (InitialPoint | RoutePoint)[];
}

export function RouteMap({ points }: RouteMapProps) {
  if (!points.length) return null;

  // NORMALIZA lat/lng independente do tipo do ponto
  const getLat = (p: InitialPoint | RoutePoint) =>
    "location" in p ? p.location?.lat ?? 0 : p.lat;

  const getLng = (p: InitialPoint | RoutePoint) =>
    "location" in p ? p.location?.lng ?? 0 : p.lng;

  const getName = (p: InitialPoint | RoutePoint) =>
    "location" in p ? p.location?.name : p.name;

  const getCity = (p: InitialPoint | RoutePoint) =>
    "location" in p ? p.location?.city : p.city;

  const getState = (p: InitialPoint | RoutePoint) =>
    "location" in p ? p.location?.state : p.state;

  const positions = points.map((p) => [getLat(p), getLng(p)]) as [
    number,
    number
  ][];

  const center = positions[0];

  return (
    <div className="w-full h-[450px] rounded-lg overflow-hidden border border-slate-200">
      <MapContainer
        center={center}
        zoom={6}
        scrollWheelZoom={true}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap contributors"
        />

        {/* linha da rota */}
        <Polyline
          positions={positions}
          pathOptions={{ color: "#3b82f6", weight: 4, dashArray: "10 6" }}
        />

        {/* marcadores */}
        {points.map((p, index) => {
          const isFirst = index === 0;
          const isLast = index === points.length - 1;

          const color = isFirst ? "#22c55e" : isLast ? "#ef4444" : "#3b82f6";

          return (
            <CircleMarker
              key={index}
              center={[getLat(p), getLng(p)]}
              radius={isFirst || isLast ? 10 : 8}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.9 }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                <div className="text-xs">
                  <div className="font-semibold">{getName(p)}</div>
                  <div>
                    {getCity(p)} / {getState(p)}
                  </div>
                  <div className="text-slate-500 mt-1">Ponto {index}</div>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
