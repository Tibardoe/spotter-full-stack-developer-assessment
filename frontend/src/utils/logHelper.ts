import {
  addMinutes,
  addHours,
  format,
  startOfDay,
  differenceInMinutes,
  parseISO,
} from "date-fns";
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

  // Counters (reset daily or as per rules)
  driveTimeContinuous: number; // Hours
  driveTimeDaily: number; // Hours
  onDutyTimeDaily: number; // Hours (includes driving)
  dutyWindowStart: Date | null;

  cycleUsed: number;
  events: LogEvent[];

  // To track route
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
    currentTime: parseISO(inputs.startDateTime),
    currentLocation: startCoords,
    currentLocationName: inputs.currentLocation,
    dutyStatus: DutyStatus.OFF_DUTY,

    driveTimeContinuous: 0,
    driveTimeDaily: 0,
    onDutyTimeDaily: 0,
    dutyWindowStart: null,

    cycleUsed: inputs.cycleUsed,
    events: [],
    routePath: [startCoords],
    stops: [
      {
        location: { name: inputs.currentLocation, coords: startCoords },
        type: "start",
      },
    ],
  };

  // 1. Initial State: Assume driver starts fresh or is Off Duty before trip
  // We'll add a small "On Duty" Pre-trip inspection (15 mins)
  addEvent(
    state,
    DutyStatus.ON_DUTY,
    0.25,
    state.currentLocationName,
    "Pre-trip Inspection"
  );

  // 2. Drive to Pickup
  simulateDriveLeg(state, pickupCoords, inputs.pickupLocation);

  // 3. Pickup (On Duty)
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

  // 4. Drive to Dropoff
  simulateDriveLeg(state, dropoffCoords, inputs.dropoffLocation);

  // 5. Dropoff (On Duty)
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

  // 6. Post-trip
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
  ); // Until end of day

  // 7. Process Events into Daily Logs
  const logs = processEventsToDailyLogs(state.events, inputs);

  return {
    logs,
    routePath: state.routePath,
    stops: state.stops,
  };
};

// --- Helper Functions ---

const simulateDriveLeg = (
  state: SimulationState,
  destination: Coordinates,
  destName: string
) => {
  const totalDist = calculateDistanceMiles(state.currentLocation, destination);
  let distRemaining = totalDist;
  let milesSinceFuel = 0; // Simplified fuel tracking for this leg

  while (distRemaining > 0) {
    // Determine max drive time allowed by various constraints

    // Constraint 1: Distance
    const timeToDest = distRemaining / AVG_SPEED_MPH;

    // Constraint 2: 8 Hour Break Rule
    const timeToBreak = MAX_DRIVE_CONTINUOUS - state.driveTimeContinuous;

    // Constraint 3: 11 Hour Daily Limit
    const timeToDailyLimit = MAX_DRIVE_DAILY - state.driveTimeDaily;

    // Constraint 4: 14 Hour Window
    // If window hasn't started, it starts now.
    // If it has, calculate time left.
    // Note: This simulation assumes we can stop driving exactly at the limit.
    let timeToWindowLimit = 14;
    if (state.dutyWindowStart) {
      const hoursSinceWindowStart =
        differenceInMinutes(state.currentTime, state.dutyWindowStart) / 60;
      timeToWindowLimit = Math.max(0, WINDOW_DAILY - hoursSinceWindowStart);
    }

    // Constraint 5: Fuel (Every 1000 miles)
    const milesToFuel = FUEL_INTERVAL_MILES - milesSinceFuel;
    const timeToFuel = milesToFuel / AVG_SPEED_MPH;

    // Find the limiting factor
    const segmentTime = Math.min(
      timeToDest,
      timeToBreak,
      timeToDailyLimit,
      timeToWindowLimit,
      timeToFuel
    );

    // Check if we can drive at all
    if (segmentTime <= 0.01) {
      // Must take a break or reset cycle
      handleForcedStop(state);
      continue;
    }

    // Execute Drive Segment
    const milesDriven = segmentTime * AVG_SPEED_MPH;
    addEvent(
      state,
      DutyStatus.DRIVING,
      segmentTime,
      "Highway",
      "Driving",
      milesDriven
    );

    // Update State
    state.driveTimeContinuous += segmentTime;
    state.driveTimeDaily += segmentTime;
    distRemaining -= milesDriven;
    milesSinceFuel += milesDriven;

    // Update position (Interpolation)
    const fraction = 1 - distRemaining / totalDist; // Approximate linear path
    const newPos = interpolatePoint(
      state.currentLocation,
      destination,
      fraction
    );
    state.currentLocation = newPos; // Roughly
    state.routePath.push(newPos);

    // Handle Events triggering the stop
    if (Math.abs(segmentTime - timeToDest) < 0.001) {
      // Arrived!
      state.currentLocation = destination;
      state.currentLocationName = destName;
      break;
    } else if (Math.abs(segmentTime - timeToBreak) < 0.001) {
      // 30 min break required
      takeRestBreak(state, BREAK_DURATION, "Mandatory 30m Rest");
    } else if (
      Math.abs(segmentTime - timeToWindowLimit) < 0.001 ||
      Math.abs(segmentTime - timeToDailyLimit) < 0.001
    ) {
      // Daily limit reached
      takeDailyReset(state);
    } else if (Math.abs(segmentTime - timeToFuel) < 0.001) {
      // Fuel Stop
      addEvent(
        state,
        DutyStatus.ON_DUTY,
        0.25,
        "Highway Truck Stop",
        "Refueling"
      );
      state.stops.push({
        location: { name: "Fuel Stop", coords: state.currentLocation },
        type: "fuel",
      });
      milesSinceFuel = 0;
    }
  }
};

const addEvent = (
  state: SimulationState,
  status: DutyStatus,
  durationHours: number,
  location: string,
  remarks: string,
  distance: number = 0
) => {
  const start = state.currentTime.getTime();
  const end = addMinutes(state.currentTime, durationHours * 60).getTime();

  state.events.push({
    id: Math.random().toString(36).substr(2, 9),
    status,
    startTime: start,
    endTime: end,
    duration: durationHours,
    location,
    remarks,
    distance,
  });

  state.currentTime = new Date(end);

  if (status === DutyStatus.DRIVING || status === DutyStatus.ON_DUTY) {
    if (!state.dutyWindowStart) {
      state.dutyWindowStart = new Date(start);
    }
    state.onDutyTimeDaily += durationHours;
    state.cycleUsed += durationHours;
  }
};

const takeRestBreak = (
  state: SimulationState,
  duration: number,
  reason: string
) => {
  addEvent(state, DutyStatus.OFF_DUTY, duration, "Rest Area", reason);
  state.stops.push({
    location: { name: "Rest Area", coords: state.currentLocation },
    type: "rest",
  });
  // Reset continuous drive timer if break > 30 mins
  if (duration >= 0.5) {
    state.driveTimeContinuous = 0;
  }
};

const handleForcedStop = (state: SimulationState) => {
  // If we can't drive due to window or daily limit, take 10h break
  takeDailyReset(state);
};

const takeDailyReset = (state: SimulationState) => {
  addEvent(
    state,
    DutyStatus.SLEEPER,
    MIN_RESTART_BREAK,
    "Truck Stop/Rest Area",
    "Daily Reset (10h)"
  );
  state.stops.push({
    location: { name: "Sleep Stop", coords: state.currentLocation },
    type: "rest",
  });

  // Reset Counters
  state.driveTimeDaily = 0;
  state.driveTimeContinuous = 0;
  state.onDutyTimeDaily = 0;
  state.dutyWindowStart = null;
};

// Split continuous event stream into Daily Logs (Midnight to Midnight)
export const processEventsToDailyLogs = (
  events: LogEvent[],
  inputs: TripInputs
): DailyLog[] => {
  const logs: Record<string, DailyLog> = {};
  let currentCycle = inputs.cycleUsed;

  events.forEach((event) => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);

    // Handle events spanning across midnight
    let currentChunkStart = start;
    while (currentChunkStart < end) {
      const dateStr = format(currentChunkStart, "yyyy-MM-dd");
      const nextMidnight = startOfDay(addHours(currentChunkStart, 24)); // Actually next day start
      // Fix: startOfDay returns 00:00 of the given date.
      // If currentChunkStart is 2023-10-01 23:00, startOfDay is 2023-10-01 00:00.
      // We want 2023-10-02 00:00.
      const dayEnd = new Date(currentChunkStart);
      dayEnd.setHours(24, 0, 0, 0);

      const chunkEnd = end < dayEnd ? end : dayEnd;
      const duration = differenceInMinutes(chunkEnd, currentChunkStart) / 60;

      if (!logs[dateStr]) {
        logs[dateStr] = {
          date: dateStr,
          events: [],
          totalMiles: 0,
          totalHours: { OFF: 0, SB: 0, D: 0, ON: 0 },
          cycleUsedStart: currentCycle,
          cycleUsedEnd: currentCycle,
          carrier: CARRIER_NAME,
          truckNumber: TRUCK_NUMBER,
        };
      }

      const dailyLog = logs[dateStr];

      // Add event chunk
      dailyLog.events.push({
        ...event,
        startTime: currentChunkStart.getTime(),
        endTime: chunkEnd.getTime(),
        duration,
      });

      // Update Totals
      dailyLog.totalHours[event.status] += duration;
      if (event.distance) {
        // Pro-rate distance for the chunk
        const totalEventDuration =
          (event.endTime - event.startTime) / (1000 * 60 * 60);
        dailyLog.totalMiles += event.distance * (duration / totalEventDuration);
      }

      if (
        event.status === DutyStatus.ON_DUTY ||
        event.status === DutyStatus.DRIVING
      ) {
        currentCycle += duration;
      }
      dailyLog.cycleUsedEnd = currentCycle;

      currentChunkStart = chunkEnd;
    }
  });

  return Object.values(logs).sort((a, b) => a.date.localeCompare(b.date));
};
