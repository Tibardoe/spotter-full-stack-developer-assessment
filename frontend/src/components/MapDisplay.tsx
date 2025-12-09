"use client";

import React from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import { Coordinates, Location } from "../types";
import L from "leaflet";

// Fix for default marker icon in React-Leaflet
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface Props {
  routePath: Coordinates[];
  stops: { location: Location; type: string }[];
}

export const MapDisplay: React.FC<Props> = ({ routePath, stops }) => {
  if (routePath.length === 0) {
    return (
      <div className="h-full w-full bg-slate-100 flex items-center justify-center text-slate-400">
        Map Ready
      </div>
    );
  }

  const center = routePath[0];

  return (
    <div className="h-[400px] w-full rounded-xl overflow-hidden shadow-sm border border-slate-200 relative z-0">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={4}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {stops.map((stop, idx) => (
          <Marker
            key={idx}
            position={[stop.location.coords.lat, stop.location.coords.lng]}
          >
            <Popup>
              <strong>{stop.type.toUpperCase()}</strong> <br />{" "}
              {stop.location.name}
            </Popup>
          </Marker>
        ))}

        <Polyline
          positions={routePath.map((c) => [c.lat, c.lng])}
          color="#2563eb"
          weight={4}
          opacity={0.7}
        />
      </MapContainer>
    </div>
  );
};
