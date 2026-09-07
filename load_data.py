import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta


# ============================================================
# 1. STATIONS
# ============================================================

stations = [
    {
        "station_id": "AWS001",
        "station_name": "Delhi",
        "latitude": 28.6139,
        "longitude": 77.2090
    },
    {
        "station_id": "AWS002",
        "station_name": "Mumbai",
        "latitude": 19.0760,
        "longitude": 72.8777
    },
    {
        "station_id": "AWS003",
        "station_name": "Bengaluru",
        "latitude": 12.9716,
        "longitude": 77.5946
    },
    {
        "station_id": "AWS004",
        "station_name": "Chennai",
        "latitude": 13.0827,
        "longitude": 80.2707
    },
    {
        "station_id": "AWS005",
        "station_name": "Kolkata",
        "latitude": 22.5726,
        "longitude": 88.3639
    },
    {
        "station_id": "AWS006",
        "station_name": "Jaipur",
        "latitude": 26.9124,
        "longitude": 75.7873
    }
]


# ============================================================
# 2. DATE RANGE
# ============================================================

# Last 60 complete days
end_date = datetime.now().date() - timedelta(days=1)
start_date = end_date - timedelta(days=59)

print(f"Downloading data from {start_date} to {end_date}")


# ============================================================
# 3. OPEN-METEO API
# ============================================================

API_URL = "https://archive-api.open-meteo.com/v1/archive"


def get_station_data(station):

    params = {
        "latitude": station["latitude"],
        "longitude": station["longitude"],

        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),

        "hourly": (
            "temperature_2m,"
            "relative_humidity_2m,"
            "surface_pressure"
        ),

        "timezone": "Asia/Kolkata",

        "temperature_unit": "celsius"
    }

    response = requests.get(
        API_URL,
        params=params,
        timeout=30
    )

    response.raise_for_status()

    data = response.json()

    hourly = data["hourly"]

    df = pd.DataFrame({
        "timestamp": hourly["time"],
        "temperature_c": hourly["temperature_2m"],
        "humidity_pct": hourly["relative_humidity_2m"],
        "pressure_hpa": hourly["surface_pressure"]
    })

    # Add station information
    df["station_id"] = station["station_id"]
    df["station_name"] = station["station_name"]
    df["latitude"] = station["latitude"]
    df["longitude"] = station["longitude"]

    return df


# ============================================================
# 4. DOWNLOAD ALL STATIONS
# ============================================================

all_data = []

for station in stations:

    print(
        f"Downloading {station['station_id']} "
        f"({station['station_name']})..."
    )

    try:

        station_df = get_station_data(station)

        all_data.append(station_df)

        print(
            f"   Received {len(station_df)} rows"
        )

    except Exception as e:

        print(
            f"   ERROR: {e}"
        )


if not all_data:
    raise RuntimeError("No data was downloaded.")


# Combine all stations
df = pd.concat(
    all_data,
    ignore_index=True
)


# ============================================================
# 5. BASIC CLEANING
# ============================================================

# Convert timestamp to datetime
df["timestamp"] = pd.to_datetime(
    df["timestamp"],
    errors="coerce"
)


# Remove duplicate timestamp for a station
df = df.drop_duplicates(
    subset=["station_id", "timestamp"]
)


# Sort data
df = df.sort_values(
    ["station_id", "timestamp"]
)


# ============================================================
# 6. BASIC SENSOR RANGE CHECK
# ============================================================

# Temperature
bad_temperature = (
    (df["temperature_c"] < -80) |
    (df["temperature_c"] > 60)
)

# Humidity
bad_humidity = (
    (df["humidity_pct"] < 0) |
    (df["humidity_pct"] > 100)
)

# Pressure
bad_pressure = (
    (df["pressure_hpa"] < 800) |
    (df["pressure_hpa"] > 1100)
)


# Replace physically invalid values with NaN

df.loc[
    bad_temperature,
    "temperature_c"
] = np.nan

df.loc[
    bad_humidity,
    "humidity_pct"
] = np.nan

df.loc[
    bad_pressure,
    "pressure_hpa"
] = np.nan


# ============================================================
# 7. RESAMPLE TO HOURLY + GAP FLAG
# ============================================================

cleaned_data = []

for station_id, station_df in df.groupby("station_id"):

    station_df = station_df.set_index("timestamp")

    # Force an hourly timeline
    hourly = station_df.resample("1h").asfreq()

    # Restore station information
    hourly["station_id"] = station_id
    hourly["station_name"] = station_df["station_name"].iloc[0]
    hourly["latitude"] = station_df["latitude"].iloc[0]
    hourly["longitude"] = station_df["longitude"].iloc[0]

    # Flag missing observations
    hourly["missing_flag"] = (
        hourly[
            [
                "temperature_c",
                "pressure_hpa",
                "humidity_pct"
            ]
        ]
        .isna()
        .any(axis=1)
    )

    cleaned_data.append(
        hourly.reset_index()
    )


# Combine cleaned stations
clean_df = pd.concat(
    cleaned_data,
    ignore_index=True
)


# ============================================================
# 8. ADD TIME FEATURES
# ============================================================

clean_df["hour"] = clean_df["timestamp"].dt.hour

clean_df["day_of_week"] = (
    clean_df["timestamp"].dt.dayofweek
)

clean_df["month"] = (
    clean_df["timestamp"].dt.month
)


# ============================================================
# 9. SAVE CSV
# ============================================================

output_file = "data/clean_stations.csv"

clean_df.to_csv(
    output_file,
    index=False
)


# ============================================================
# 10. SHOW RESULTS
# ============================================================

print("\n====================================")
print("DATASET CREATED")
print("====================================")

print(
    "Total rows:",
    len(clean_df)
)

print(
    "Stations:",
    clean_df["station_id"].nunique()
)

print(
    "Missing/gap rows:",
    clean_df["missing_flag"].sum()
)

print(
    "Saved to:",
    output_file
)


# ============================================================
# 11. PROOF FOR ONE STATION
# ============================================================

delhi = clean_df[
    clean_df["station_id"] == "AWS001"
]

print("\n====================================")
print("DELHI SAMPLE")
print("====================================")

print(
    delhi[
        [
            "timestamp",
            "temperature_c",
            "pressure_hpa",
            "humidity_pct",
            "missing_flag"
        ]
    ].head(20)
)