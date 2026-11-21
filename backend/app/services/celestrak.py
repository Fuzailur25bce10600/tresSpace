
import requests
import json
from pathlib import Path

BASE_URL = "https://celestrak.org/NORAD/elements/gp.php"

# Location where satellite records will be stored
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
CACHE_FILE = DATA_DIR / "satellites.json"


def fetch_satellites(group="visual", limit=100):
    """
    Fetch satellite orbital records from CelesTrak
    and save them locally as JSON.
    """

    params = {
        "GROUP": group,
        "FORMAT": "JSON"
    }

    response = requests.get(
        BASE_URL,
        params=params,
        timeout=30
    )

    response.raise_for_status()

    satellites = response.json()
    satellites = satellites[:limit]

    # Create data folder if it doesn't exist
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Save satellite records
    with open(CACHE_FILE, "w", encoding="utf-8") as file:
        json.dump(satellites, file, indent=4)

    print(f"Saved {len(satellites)} orbital records.")

    return satellites


def load_satellites():
    """
    Load previously saved satellite records.
    """

    if not CACHE_FILE.exists():
        return []

    with open(CACHE_FILE, "r", encoding="utf-8") as file:
        return json.load(file)


if __name__ == "__main__":

    data = fetch_satellites()

    print("Total orbital records:", len(data))

    for satellite in data[:5]:
        print(
            satellite.get("OBJECT_NAME"),
            satellite.get("NORAD_CAT_ID")
        )
