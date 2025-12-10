import { CITY_DB } from "../constants";
import { Location, Coordinates } from "../types";

export const calculateDistanceMiles = (
  coord1: Coordinates,
  coord2: Coordinates
): number => {
  const R = 3958.8; // Earth radius in miles
  const dLat = (coord2.lat - coord1.lat) * (Math.PI / 180);
  const dLon = (coord2.lng - coord1.lng) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(coord1.lat * (Math.PI / 180)) *
      Math.cos(coord2.lat * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

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
  const match = CITY_DB[locationName];
  if (match) return match;

  console.warn(`Unknown city: ${locationName}. Using default coordinates.`);
  return { lat: 39.8283, lng: -98.5795 };
};

export const getCityNameFromCoords = (_coords: Coordinates): string => {
  return "Highway Stop";
};
