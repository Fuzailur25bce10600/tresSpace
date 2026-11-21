
import json
from pathlib import Path
from datetime import datetime, timezone

from sgp4.api import jday

from app.services.orbit_engine import get_satellite_objects


DATA_FILE = (
    Path(__file__).resolve().parent.parent
    / "data"
    / "satellite_positions.json"
)


def update_position_cache():
    """
    Calculate and save the latest positions
    and velocities of all initialized objects.
    """

    satellites = get_satellite_objects()

    timestamp = datetime.now(timezone.utc)
    results = []

    for satellite in satellites:

        satrec = satellite["satrec"]

        jd, fr = jday(
            timestamp.year,
            timestamp.month,
            timestamp.day,
            timestamp.hour,
            timestamp.minute,
            timestamp.second
            + timestamp.microsecond / 1_000_000
        )

        error, position, velocity = satrec.sgp4(jd, fr)

        if error != 0:
            print(
                f"Propagation failed for {satellite['name']}: "
                f"SGP4 error {error}"
            )
            continue

        results.append({
            "name": satellite["name"],
            "norad_id": satellite["norad_id"],
            "timestamp": timestamp.isoformat(),
            "position_km": {
                "x": position[0],
                "y": position[1],
                "z": position[2]
            },
            "velocity_km_s": {
                "x": velocity[0],
                "y": velocity[1],
                "z": velocity[2]
            }
        })

    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)

    with open(DATA_FILE, "w", encoding="utf-8") as file:
        json.dump(results, file, indent=4)

    print(f"Updated position cache: {len(results)} objects")

    return results


def load_position_cache():
    """Load the latest saved satellite positions."""

    if not DATA_FILE.exists():
        return []

    with open(DATA_FILE, "r", encoding="utf-8") as file:
        return json.load(file)


if __name__ == "__main__":

    positions = update_position_cache()

    print("\nFirst five cached objects:")

    for satellite in positions[:5]:
        print(
            satellite["name"],
            satellite["position_km"],
            satellite["velocity_km_s"]
        )
