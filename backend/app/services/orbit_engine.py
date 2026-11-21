
import json
from pathlib import Path
from datetime import datetime, timezone

from sgp4.api import Satrec, jday
from sgp4 import omm


# Locate our cached satellite dataset
DATA_FILE = (
    Path(__file__).resolve().parent.parent
    / "data"
    / "satellites.json"
)


def load_orbital_records():
    """Load cached OMM records from JSON."""

    if not DATA_FILE.exists():
        raise FileNotFoundError(
            "satellites.json not found. Run celestrak.py first."
        )

    with open(DATA_FILE, "r", encoding="utf-8") as file:
        return json.load(file)


def propagate_satellite(record, timestamp=None):
    """
    Calculate a satellite's position and velocity
    using SGP4.

    Position: km (TEME frame)
    Velocity: km/s (TEME frame)
    """

    if timestamp is None:
        timestamp = datetime.now(timezone.utc)

    if timestamp.tzinfo is None:
        raise ValueError("Timestamp must be timezone-aware.")

    # Create an SGP4 satellite object from OMM data
    satellite = Satrec()
    omm.initialize(satellite, record)

    # Convert timestamp into Julian date
    jd, fr = jday(
        timestamp.year,
        timestamp.month,
        timestamp.day,
        timestamp.hour,
        timestamp.minute,
        timestamp.second + timestamp.microsecond / 1_000_000
    )

    # Calculate position and velocity
    error, position, velocity = satellite.sgp4(jd, fr)

    if error != 0:
        return {
            "name": record.get("OBJECT_NAME"),
            "norad_id": record.get("NORAD_CAT_ID"),
            "error": error
        }

    return {
        "name": record.get("OBJECT_NAME"),
        "norad_id": record.get("NORAD_CAT_ID"),
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
    }


def propagate_all_satellites(limit=100):
    """Calculate positions for cached orbital records."""

    records = load_orbital_records()
    results = []

    for record in records[:limit]:
        try:
            result = propagate_satellite(record)

            if "position_km" in result:
                results.append(result)

        except (ValueError, TypeError, KeyError) as error:
            print(
                f"Skipping {record.get('OBJECT_NAME')}: {error}"
            )

    return results

def get_satellite_objects():
    """
    Load OMM records and initialize SGP4 objects.
    """

    records = load_orbital_records()
    satellites = []

    for record in records:
        try:
            satellite = Satrec()
            omm.initialize(satellite, record)

            satellites.append({
                "name": record.get("OBJECT_NAME"),
                "norad_id": record.get("NORAD_CAT_ID"),
                "satrec": satellite
            })

        except (ValueError, TypeError, KeyError) as error:
            print(
                f"Could not initialize "
                f"{record.get('OBJECT_NAME')}: {error}"
            )

    return satellites

if __name__ == "__main__":

    positions = propagate_all_satellites()

    print("Successfully propagated:", len(positions))

    for satellite in positions[:5]:
        print("\nSatellite:", satellite["name"])
        print("NORAD ID:", satellite["norad_id"])
        print("Position:", satellite["position_km"])
        print("Velocity:", satellite["velocity_km_s"])
