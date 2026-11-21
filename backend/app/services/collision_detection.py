
from datetime import datetime, timedelta, timezone

import numpy as np
from sgp4.api import jday

from app.services.orbit_engine import get_satellite_objects


def get_state(satellite, timestamp):
    """
    Propagate one object to a specified timestamp.

    Returns:
        Position in km (TEME frame)
        Velocity in km/s (TEME frame)
    """

    jd, fr = jday(
        timestamp.year,
        timestamp.month,
        timestamp.day,
        timestamp.hour,
        timestamp.minute,
        timestamp.second + timestamp.microsecond / 1_000_000
    )

    error, position, velocity = satellite.sgp4(jd, fr)

    if error != 0:
        return None

    return np.array(position), np.array(velocity)


def detect_close_approaches(
    time_window_hours=6,
    time_step_seconds=60,
    threshold_km=10
):
    """
    Screen orbital objects for close approaches.

    Stores:
    - Initial position and velocity
    - Closest approach position and velocity
    - Closest approach time
    - Minimum separation
    """

    if time_window_hours <= 0 or time_step_seconds <= 0:
        raise ValueError("Time window and time step must be positive.")

    objects = get_satellite_objects()
    count = len(objects)

    if count < 2:
        return []

    # Generate every unique pair
    pair_i, pair_j = np.triu_indices(count, k=1)
    pair_count = len(pair_i)

    minimum_distances = np.full(pair_count, np.inf)
    closest_times = [None] * pair_count
    closest_states = [None] * pair_count

    initial_positions = None
    initial_velocities = None

    start_time = datetime.now(timezone.utc)

    number_of_steps = int(
        time_window_hours * 3600 / time_step_seconds
    )

    # Screen objects over the requested time window
    for step in range(number_of_steps + 1):

        current_time = start_time + timedelta(
            seconds=step * time_step_seconds
        )

        positions = np.full((count, 3), np.nan)
        velocities = np.full((count, 3), np.nan)

        # Propagate every object to the same timestamp
        for index, obj in enumerate(objects):

            state = get_state(
                obj["satrec"],
                current_time
            )

            if state is not None:
                positions[index] = state[0]
                velocities[index] = state[1]

        # Save initial states at the beginning of screening
        if step == 0:
            initial_positions = positions.copy()
            initial_velocities = velocities.copy()

        # Calculate distances between all unique pairs
        differences = positions[pair_i] - positions[pair_j]

        distances = np.linalg.norm(
            differences,
            axis=1
        )

        # Ignore failed propagations
        valid = np.isfinite(distances)

        improved = valid & (
            distances < minimum_distances
        )

        minimum_distances[improved] = distances[improved]

        # Save states whenever a new minimum is found
        for pair_index in np.where(improved)[0]:

            i = pair_i[pair_index]
            j = pair_j[pair_index]

            closest_times[pair_index] = current_time

            closest_states[pair_index] = {
                "position_1": positions[i].tolist(),
                "velocity_1": velocities[i].tolist(),
                "position_2": positions[j].tolist(),
                "velocity_2": velocities[j].tolist()
            }

    # Build final results
    results = []

    for index in range(pair_count):

        distance = minimum_distances[index]

        if not np.isfinite(distance):
            continue

        i = pair_i[index]
        j = pair_j[index]

        results.append({
            "object_1": objects[i]["name"],
            "norad_id_1": objects[i]["norad_id"],

            "object_2": objects[j]["name"],
            "norad_id_2": objects[j]["norad_id"],

            "closest_approach_km": round(float(distance), 3),

            "screening_start_time": start_time.isoformat(),

            "time_of_closest_approach": (
                closest_times[index].isoformat()
                if closest_times[index]
                else None
            ),

            "screening_status": (
                "CLOSE_APPROACH"
                if distance <= threshold_km
                else "CLEAR"
            ),

            # States at the beginning of screening
            "initial_state": {
                "position_1": initial_positions[i].tolist(),
                "velocity_1": initial_velocities[i].tolist(),
                "position_2": initial_positions[j].tolist(),
                "velocity_2": initial_velocities[j].tolist()
            },

            # States at sampled closest approach
            "state_at_closest_approach": closest_states[index]
        })

    results.sort(
        key=lambda item: item["closest_approach_km"]
    )

    return results


if __name__ == "__main__":

    print("Starting collision screening...")

    results = detect_close_approaches()

    print("\nTotal pairs screened:", len(results))

    print("\nClosest approaches:")

    for result in results[:10]:

        print(
            result["object_1"],
            "<->",
            result["object_2"],
            "| Distance:",
            result["closest_approach_km"],
            "km |",
            result["screening_status"]
        )

        print(
            "Closest approach time:",
            result["time_of_closest_approach"]
        )

        print(
            "Initial states available:",
            result["initial_state"] is not None
        )

        print(
            "Closest approach states available:",
            result["state_at_closest_approach"] is not None
        )

        print("-" * 50)
