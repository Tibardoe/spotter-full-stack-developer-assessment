import { DutyStatus } from "./types";

export const APP_NAME = "Spotter HOS Planner";
export const CARRIER_NAME = "Spotter Logistics Inc.";
export const TRUCK_NUMBER = "TRK-1042";

// Simulation settings
export const AVG_SPEED_MPH = 60;
export const MAX_DRIVE_CONTINUOUS = 8; // Max hours before a 30-min break
export const MAX_DRIVE_DAILY = 11;
export const WINDOW_DAILY = 14;
export const MIN_RESTART_BREAK = 10; // Off/Sleeper reset
export const FUEL_INTERVAL_MILES = 1000;
export const BREAK_DURATION = 0.5;
export const LOAD_UNLOAD_DURATION = 1;

// Display text for duty statuses
export const STATUS_LABELS: Record<DutyStatus, string> = {
  [DutyStatus.OFF_DUTY]: "Off Duty",
  [DutyStatus.SLEEPER]: "Sleeper Berth",
  [DutyStatus.DRIVING]: "Driving",
  [DutyStatus.ON_DUTY]: "On Duty",
};

// Colors used for charts and visual indicators
export const STATUS_COLORS: Record<DutyStatus, string> = {
  [DutyStatus.OFF_DUTY]: "#64748b",
  [DutyStatus.SLEEPER]: "#3b82f6",
  [DutyStatus.DRIVING]: "#22c55e",
  [DutyStatus.ON_DUTY]: "#f97316",
};

// City coordinates used for routing
export const CITY_DB: Record<string, { lat: number; lng: number }> = {
  "New York, NY": { lat: 40.7128, lng: -74.006 },
  "Los Angeles, CA": { lat: 34.0522, lng: -118.2437 },
  "Chicago, IL": { lat: 41.8781, lng: -87.6298 },
  "Houston, TX": { lat: 29.7604, lng: -95.3698 },
  "Phoenix, AZ": { lat: 33.4484, lng: -112.074 },
  "Philadelphia, PA": { lat: 39.9526, lng: -75.1652 },
  "San Antonio, TX": { lat: 29.4241, lng: -98.4936 },
  "San Diego, CA": { lat: 32.7157, lng: -117.1611 },
  "Dallas, TX": { lat: 32.7767, lng: -96.797 },
  "San Jose, CA": { lat: 37.3382, lng: -121.8863 },
  "Austin, TX": { lat: 30.2672, lng: -97.7431 },
  "Jacksonville, FL": { lat: 30.3322, lng: -81.6557 },
  "Fort Worth, TX": { lat: 32.7555, lng: -97.3308 },
  "Columbus, OH": { lat: 39.9612, lng: -82.9988 },
  "Charlotte, NC": { lat: 35.2271, lng: -80.8431 },
  "San Francisco, CA": { lat: 37.7749, lng: -122.4194 },
  "Indianapolis, IN": { lat: 39.7684, lng: -86.1581 },
  "Seattle, WA": { lat: 47.6062, lng: -122.3321 },
  "Denver, CO": { lat: 39.7392, lng: -104.9903 },
  "Washington, DC": { lat: 38.9072, lng: -77.0369 },
  "Boston, MA": { lat: 42.3601, lng: -71.0589 },
  "Nashville, TN": { lat: 36.1627, lng: -86.7816 },
  "Detroit, MI": { lat: 42.3314, lng: -83.0458 },
  "Portland, OR": { lat: 45.5152, lng: -122.6784 },
  "Las Vegas, NV": { lat: 36.1699, lng: -115.1398 },
  "Miami, FL": { lat: 25.7617, lng: -80.1918 },
  "Atlanta, GA": { lat: 33.749, lng: -84.388 },
};
