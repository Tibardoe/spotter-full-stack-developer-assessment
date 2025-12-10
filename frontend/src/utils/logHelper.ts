import { addMinutes, format, differenceInMinutes } from "date-fns";

import {
  TripInputs,
  SimulationResult,
  LogEvent,
  DutyStatus,
  DailyLog,
  Location,
  Coordinates,
} from "../types";

import {
  AVG_SPEED_MPH,
  MAX_DRIVE_CONTINUOUS,
  MAX_DRIVE_DAILY,
  WINDOW_DAILY,
  MIN_RESTART_BREAK,
  FUEL_INTERVAL_MILES,
  BREAK_DURATION,
  LOAD_UNLOAD_DURATION,
  CARRIER_NAME,
  TRUCK_NUMBER,
} from "../constants";

import {
  calculateDistanceMiles,
  getCoordinates,
  interpolatePoint,
} from "./geoService";

interface SimulationState {
  currentTime: Date;
  currentLocation: Coordinates;
  currentLocationName: string;

  dutyStatus: DutyStatus;
  driveTimeContinuous: number;
  driveTimeDaily: number;
  onDutyTimeDaily: number;
  dutyWindowStart: Date | null;

  cycleUsed: number;
  events: LogEvent[];

  routePath: Coordinates[];
  stops: {
    location: Location;
    type: "start" | "pickup" | "dropoff" | "rest" | "fuel";
  }[];
}

export const generateTripLogs = (inputs: TripInputs): SimulationResult => {
  const startCoords = getCoordinates(inputs.currentLocation);
  const pickupCoords = getCoordinates(inputs.pickupLocation);
  const dropoffCoords = getCoordinates(inputs.dropoffLocation);

  const state: SimulationState = {
    currentTime: new Date(inputs.startDateTime),
    currentLocation: startCoords,
    currentLocationName: inputs.currentLocation,
    dutyStatus: DutyStatus.OFF_DUTY,

    driveTimeContinuous: 0,
    driveTimeDaily: 0,
    onDutyTimeDaily: 0,
    dutyWindowStart: null,

    cycleUsed: Number(inputs.cycleUsed) || 0,
    events: [],
    routePath: [startCoords],
    stops: [
      {
        location: { name: inputs.currentLocation, coords: startCoords },
        type: "start",
      },
    ],
  };

  addEvent(
    state,
    DutyStatus.ON_DUTY,
    0.25,
    state.currentLocationName,
    "Pre-trip Inspection"
  );
  simulateDriveLeg(state, pickupCoords, inputs.pickupLocation);

  addEvent(
    state,
    DutyStatus.ON_DUTY,
    LOAD_UNLOAD_DURATION,
    inputs.pickupLocation,
    "Loading Cargo"
  );
  state.stops.push({
    location: { name: inputs.pickupLocation, coords: pickupCoords },
    type: "pickup",
  });

  simulateDriveLeg(state, dropoffCoords, inputs.dropoffLocation);

  addEvent(
    state,
    DutyStatus.ON_DUTY,
    LOAD_UNLOAD_DURATION,
    inputs.dropoffLocation,
    "Unloading Cargo"
  );
  state.stops.push({
    location: { name: inputs.dropoffLocation, coords: dropoffCoords },
    type: "dropoff",
  });

  addEvent(
    state,
    DutyStatus.ON_DUTY,
    0.25,
    inputs.dropoffLocation,
    "Post-trip Inspection"
  );
  addEvent(
    state,
    DutyStatus.OFF_DUTY,
    0,
    inputs.dropoffLocation,
    "End of Trip"
  );

  const logs = processEventsToDailyLogs(state.events, inputs);

  return {
    logs,
    routePath: state.routePath,
    stops: state.stops,
  };
};

// ---------------------------------------------------------
// Driving Simulation
// ---------------------------------------------------------

const simulateDriveLeg = (
  state: SimulationState,
  destination: Coordinates,
  destName: string
) => {
  const totalDistance = calculateDistanceMiles(
    state.currentLocation,
    destination
  );
  let remaining = totalDistance;
  let milesSinceFuel = 0;

  while (remaining > 0) {
    const timeToDest = remaining / AVG_SPEED_MPH;
    const timeToBreak = MAX_DRIVE_CONTINUOUS - state.driveTimeContinuous;
    const timeToDailyLimit = MAX_DRIVE_DAILY - state.driveTimeDaily;

    let timeToWindowLimit = 14;
    if (state.dutyWindowStart) {
      const hoursElapsed =
        differenceInMinutes(state.currentTime, state.dutyWindowStart) / 60;
      timeToWindowLimit = Math.max(0, WINDOW_DAILY - hoursElapsed);
    }

    const milesLeftForFuel = FUEL_INTERVAL_MILES - milesSinceFuel;
    const timeToFuel = milesLeftForFuel / AVG_SPEED_MPH;

    const segment = Math.min(
      timeToDest,
      timeToBreak,
      timeToDailyLimit,
      timeToWindowLimit,
      timeToFuel
    );

    if (segment <= 0.01) {
      handleForcedStop(state);
      continue;
    }

    const milesDriven = segment * AVG_SPEED_MPH;
    addEvent(
      state,
      DutyStatus.DRIVING,
      segment,
      "Highway",
      "Driving",
      milesDriven
    );

    state.driveTimeContinuous += segment;
    state.driveTimeDaily += segment;

    remaining -= milesDriven;
    milesSinceFuel += milesDriven;

    const progress = 1 - remaining / totalDistance;
    const newPos = interpolatePoint(
      state.currentLocation,
      destination,
      progress
    );
    state.currentLocation = newPos;
    state.routePath.push(newPos);

    if (segment === timeToDest) {
      state.currentLocation = destination;
      state.currentLocationName = destName;
      break;
    }

    if (segment === timeToBreak) {
      takeRestBreak(state, BREAK_DURATION, "Mandatory 30min Break");
    } else if (segment === timeToDailyLimit || segment === timeToWindowLimit) {
      takeDailyReset(state);
    } else if (segment === timeToFuel) {
      addEvent(state, DutyStatus.ON_DUTY, 0.25, "Truck Stop", "Refueling");
      state.stops.push({
        location: { name: "Fuel Stop", coords: state.currentLocation },
        type: "fuel",
      });
      milesSinceFuel = 0;
    }
  }
};

// ---------------------------------------------------------
// Event Helpers
// ---------------------------------------------------------

const addEvent = (
  state: SimulationState,
  status: DutyStatus,
  hours: number,
  location: string,
  remarks: string,
  distance: number = 0
) => {
  const start = state.currentTime.getTime();
  const end = addMinutes(state.currentTime, hours * 60).getTime();

  state.events.push({
    id: Math.random().toString(36).substr(2, 9),
    status,
    startTime: start,
    endTime: end,
    duration: hours,
    location,
    remarks,
    distance,
  });

  state.currentTime = new Date(end);

  if (status === DutyStatus.DRIVING || status === DutyStatus.ON_DUTY) {
    if (!state.dutyWindowStart) state.dutyWindowStart = new Date(start);
    state.onDutyTimeDaily += hours;
    state.cycleUsed += hours;
  }
};

const takeRestBreak = (
  state: SimulationState,
  hours: number,
  reason: string
) => {
  addEvent(state, DutyStatus.OFF_DUTY, hours, "Rest Area", reason);
  state.stops.push({
    location: { name: "Rest Area", coords: state.currentLocation },
    type: "rest",
  });

  if (hours >= 0.5) state.driveTimeContinuous = 0;
};

const handleForcedStop = (state: SimulationState) => {
  takeDailyReset(state);
};

const takeDailyReset = (state: SimulationState) => {
  addEvent(
    state,
    DutyStatus.SLEEPER,
    MIN_RESTART_BREAK,
    "Rest Area",
    "Daily Reset"
  );
  state.stops.push({
    location: { name: "Sleep Stop", coords: state.currentLocation },
    type: "rest",
  });

  state.driveTimeDaily = 0;
  state.driveTimeContinuous = 0;
  state.onDutyTimeDaily = 0;
  state.dutyWindowStart = null;
};

// ---------------------------------------------------------
// Daily Log Generation
// ---------------------------------------------------------

export const processEventsToDailyLogs = (
  events: LogEvent[],
  inputs: TripInputs
): DailyLog[] => {
  const logs: Record<string, DailyLog> = {};
  let cycle = Number(inputs.cycleUsed) || 0;

  events.forEach((event) => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);

    let chunkStart = start;
    while (chunkStart < end) {
      const date = format(chunkStart, "yyyy-MM-dd");
      const dayEnd = new Date(chunkStart);
      dayEnd.setHours(24, 0, 0, 0);

      const chunkEnd = end < dayEnd ? end : dayEnd;
      const hours = differenceInMinutes(chunkEnd, chunkStart) / 60;

      if (!logs[date]) {
        logs[date] = {
          date,
          events: [],
          totalMiles: 0,
          totalHours: { OFF: 0, SB: 0, D: 0, ON: 0 },
          cycleUsedStart: cycle,
          cycleUsedEnd: cycle,
          carrier: CARRIER_NAME,
          truckNumber: TRUCK_NUMBER,
        };
      }

      const daily = logs[date];

      daily.events.push({
        ...event,
        startTime: chunkStart.getTime(),
        endTime: chunkEnd.getTime(),
        duration: hours,
      });

      daily.totalHours[event.status] += hours;

      if (event.distance) {
        const fullDuration =
          (event.endTime - event.startTime) / (1000 * 60 * 60);
        daily.totalMiles += event.distance * (hours / fullDuration);
      }

      if (
        event.status === DutyStatus.DRIVING ||
        event.status === DutyStatus.ON_DUTY
      ) {
        cycle += hours;
      }

      daily.cycleUsedEnd = cycle;
      chunkStart = chunkEnd;
    }
  });

  return Object.values(logs).sort((a, b) => a.date.localeCompare(b.date));
};
