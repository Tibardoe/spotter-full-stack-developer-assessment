import { CITY_DB } from "../constants";
import { Location, Coordinates } from "../types";

// Haversine formula for distance
export const calculateDistanceMiles = (
  coord1: Coordinates,
  coord2: Coordinates
): number => {
  const R = 3958.8; // Radius of Earth in miles
  const dLat = (coord2.lat - coord1.lat) * (Math.PI / 180);
  const dLon = (coord2.lng - coord1.lng) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.lat * (Math.PI / 180)) *
      Math.cos(coord2.lat * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Interpolate a point between two coordinates
export const interpolatePoint = (
  start: Coordinates,
  end: Coordinates,
  fraction: number
): Coordinates => {
  return {
    lat: start.lat + (end.lat - start.lat) * fraction,
    lng: start.lng + (end.lng - start.lng) * fraction,
  };
};

export const getCoordinates = (locationName: string): Coordinates => {
  // Simple lookup for demo. In production, call a Geocoding API.
  const found = CITY_DB[locationName];
  if (found) return found;

  // Fallback: Return a random-ish coordinate in US if not found to prevent crash,
  // but in reality we would throw error.
  console.warn(`City not found: ${locationName}. Using default.`);
  return { lat: 39.8283, lng: -98.5795 };
};

export const getCityNameFromCoords = (coords: Coordinates): string => {
  // Reverse lookup approximation for simulation "stops" in middle of nowhere
  return "Highway Stop";
};
