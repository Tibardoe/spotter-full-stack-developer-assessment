export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Location {
  name: string;
  coords: Coordinates;
}

export interface TripInputs {
  currentLocation: string;
  pickupLocation: string;
  dropoffLocation: string;
  cycleUsed: number;
  startDateTime: string;
}

export enum DutyStatus {
  OFF_DUTY = "OFF",
  SLEEPER = "SB",
  DRIVING = "D",
  ON_DUTY = "ON",
}

export interface LogEvent {
  id: string;
  status: DutyStatus;
  startTime: number;
  endTime: number;
  duration: number;
  location: string;
  remarks: string;
  distance?: number;
}

export interface DailyLog {
  date: string;
  events: LogEvent[];
  totalMiles: number;
  totalHours: {
    [key in DutyStatus]: number;
  };
  cycleUsedStart: number;
  cycleUsedEnd: number;
  carrier: string;
  truckNumber: string;
}

export interface SimulationResult {
  logs: DailyLog[];
  routePath: Coordinates[];
  stops: {
    location: Location;
    type: "start" | "pickup" | "dropoff" | "rest" | "fuel";
  }[];
  error?: string;
}
