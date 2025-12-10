from datetime import datetime, timedelta
import math

AVG_SPEED_MPH = 60

CITY_DB = {
    "New York, NY": {"lat": 40.7128, "lng": -74.0060},
    "Chicago, IL": {"lat": 41.8781, "lng": -87.6298},
    "Los Angeles, CA": {"lat": 34.0522, "lng": -118.2437},
}

def get_coords(city):
    return CITY_DB.get(city, {"lat": 39.82, "lng": -98.57})

def haversine(c1, c2):
    R = 3958.8
    lat1, lon1 = math.radians(c1["lat"]), math.radians(c1["lng"])
    lat2, lon2 = math.radians(c2["lat"]), math.radians(c2["lng"])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def interpolate(c1, c2, fraction):
    return {
        "lat": c1["lat"] + (c2["lat"] - c1["lat"]) * fraction,
        "lng": c1["lng"] + (c2["lng"] - c1["lng"]) * fraction,
    }

def calculate_trip(data):
    start_time = datetime.fromisoformat(data["startDateTime"].replace("Z", "+00:00"))
    current_loc = get_coords(data["currentLocation"])

    events = []
    route_path = [current_loc]
    stops = [{
        "location": {"name": data["currentLocation"], "coords": current_loc},
        "type": "start",
    }]

    sim_time = start_time
    drive_continuous = 0

    def add_event(status, duration, loc, remarks):
        nonlocal sim_time
        end_time = sim_time + timedelta(hours=duration)
        events.append({
            "status": status,
            "startTime": sim_time.isoformat(),
            "endTime": end_time.isoformat(),
            "duration": duration,
            "location": loc,
            "remarks": remarks,
        })
        sim_time = end_time

    add_event("ON", 0.25, data["currentLocation"], "Pre-trip Inspection")

    legs = [
        (data["pickupLocation"], "pickup"),
        (data["dropoffLocation"], "dropoff")
    ]

    curr_pos = current_loc

    for target_city, label in legs:
        target_coords = get_coords(target_city)
        dist = haversine(curr_pos, target_coords)

        while dist > 0:
            drive_avail = 8.0 - drive_continuous
            time_needed = dist / AVG_SPEED_MPH

            if time_needed > drive_avail:
                add_event("D", drive_avail, "Highway", "Driving")

                fraction = drive_avail / time_needed
                curr_pos = interpolate(curr_pos, target_coords, fraction)
                route_path.append(curr_pos)

                add_event("OFF", 0.5, "Rest Area", "30m Break")
                stops.append({
                    "location": {"name": "Rest Area", "coords": curr_pos},
                    "type": "rest",
                })

                drive_continuous = 0
                dist -= drive_avail * AVG_SPEED_MPH
            else:
                add_event("D", time_needed, "Highway", "Driving")
                route_path.append(target_coords)
                drive_continuous += time_needed
                dist = 0
                curr_pos = target_coords

        add_event("ON", 1.0, target_city, f"{label.title()} Operation")
        stops.append({
            "location": {"name": target_city, "coords": target_coords},
            "type": label,
        })

    add_event("ON", 0.25, data["dropoffLocation"], "Post-trip Inspection")
    add_event("OFF", 0, data["dropoffLocation"], "End of Trip")

    return {
        "events": events,
        "routePath": route_path,
        "stops": stops,
    }
