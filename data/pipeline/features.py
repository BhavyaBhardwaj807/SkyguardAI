import argparse
import os
import numpy as np
import pandas as pd


# ============================================================
# CONFIGURATION
# ============================================================

from pathlib import Path
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_DATA_DIR = _REPO_ROOT / "data" if (_REPO_ROOT / "data").exists() else Path("data")

DEFAULT_INPUT = str(_DATA_DIR / "injected_stations.csv")
DEFAULT_OUTPUT = str(_DATA_DIR / "features.csv")

ROLLING_WINDOW = 6
MIN_RELATIONSHIP_SAMPLES = 10

# Approximate Earth radius in kilometres
EARTH_RADIUS_KM = 6371.0

# Ground-truth columns.
# These are retained for evaluation but MUST NOT be ML features.
GROUND_TRUTH_COLUMNS = [
    "anomaly_label",
    "anomaly_type",
    "anomaly_id",
    "affected_parameter",
    "injection_start",
    "injection_end",
    "scenario_tag",
]


# ============================================================
# LOAD DATA
# ============================================================

def load_data(input_path):
    print(f"Loading dataset: {input_path}")

    df = pd.read_csv(input_path)

    required_columns = [
        "timestamp",
        "temperature_c",
        "pressure_hpa",
        "humidity_pct",
        "station_id",
        "latitude",
        "longitude",
    ]

    missing = [
        col for col in required_columns
        if col not in df.columns
    ]

    if missing:
        raise ValueError(
            f"Missing required columns: {missing}"
        )

    df["timestamp"] = pd.to_datetime(
        df["timestamp"]
    )

    df = df.sort_values(
        ["station_id", "timestamp"]
    ).reset_index(drop=True)

    return df


# ============================================================
# MISSING FLAG
# ============================================================

def add_missing_flag(df):
    """
    Preserve the existing missing_flag and also detect
    missing T/P/RH values directly.
    """

    calculated_missing = (
        df[
            [
                "temperature_c",
                "pressure_hpa",
                "humidity_pct",
            ]
        ]
        .isna()
        .any(axis=1)
    )

    if "missing_flag" in df.columns:
        df["missing_flag"] = (
            df["missing_flag"]
            .fillna(False)
            .astype(bool)
            | calculated_missing
        )
    else:
        df["missing_flag"] = calculated_missing

    return df


# ============================================================
# DUPLICATE FLAG
# ============================================================

def add_duplicate_flag(df):
    """
    Mark duplicated station/timestamp observations.
    """

    df["duplicate_flag"] = (
        df.duplicated(
            subset=["station_id", "timestamp"],
            keep=False,
        )
    )

    return df


# ============================================================
# RATE OF CHANGE
# ============================================================

def add_rate_features(df):
    """
    First difference calculated separately for every station.

    No difference is calculated across station boundaries.

    For duplicated timestamps, the normal chronological
    difference is preserved rather than deleting duplicates.
    """

    grouped = df.groupby(
        "station_id",
        sort=False,
    )

    df["temp_rate"] = (
        grouped["temperature_c"].diff()
    )

    df["pressure_rate"] = (
        grouped["pressure_hpa"].diff()
    )

    df["humidity_rate"] = (
        grouped["humidity_pct"].diff()
    )

    return df


# ============================================================
# ROLLING FEATURES
# ============================================================

def add_rolling_features(df):
    """
    Six-observation trailing window.

    Because the source data is hourly, this represents
    approximately the previous six hours.

    No future observations are used.
    """

    grouped = df.groupby(
        "station_id",
        sort=False,
    )

    rolling_config = [
        (
            "temperature_c",
            "temp_rolling_mean",
            "temp_rolling_std",
        ),
        (
            "pressure_hpa",
            "pressure_rolling_mean",
            "pressure_rolling_std",
        ),
        (
            "humidity_pct",
            "humidity_rolling_mean",
            "humidity_rolling_std",
        ),
    ]

    for column, mean_name, std_name in rolling_config:

        df[mean_name] = (
            grouped[column]
            .transform(
                lambda x: x.rolling(
                    window=ROLLING_WINDOW,
                    min_periods=2,
                ).mean()
            )
        )

        df[std_name] = (
            grouped[column]
            .transform(
                lambda x: x.rolling(
                    window=ROLLING_WINDOW,
                    min_periods=2,
                ).std()
            )
        )

    return df


# ============================================================
# LEAKAGE-SAFE MULTIVARIATE RESIDUALS
# ============================================================

def add_multivariate_residuals(df):
    """
    Calculate:

        temperature-pressure residual
        temperature-humidity residual

    IMPORTANT:

    Regression parameters are learned from ORIGINAL values
    rather than injected sensor values.

    This prevents synthetic anomalies from changing the
    baseline relationship.

    The original_* columns were preserved by the injection
    engine before anomalies were introduced.
    """

    df["temp_pressure_residual"] = np.nan
    df["temp_humidity_residual"] = np.nan

    # --------------------------------------------------------
    # Select baseline columns
    # --------------------------------------------------------

    temp_col = (
        "original_temperature_c"
        if "original_temperature_c" in df.columns
        else "temperature_c"
    )

    pressure_col = (
        "original_pressure_hpa"
        if "original_pressure_hpa" in df.columns
        else "pressure_hpa"
    )

    humidity_col = (
        "original_humidity_pct"
        if "original_humidity_pct" in df.columns
        else "humidity_pct"
    )

    # --------------------------------------------------------
    # Fit separately for each station
    # --------------------------------------------------------

    for station_id, group in df.groupby(
        "station_id",
        sort=False,
    ):

        idx = group.index

        # ====================================================
        # Temperature vs Pressure
        # ====================================================

        valid_tp = (
            group[temp_col].notna()
            & group[pressure_col].notna()
        )

        if valid_tp.sum() >= MIN_RELATIONSHIP_SAMPLES:

            x = (
                group.loc[
                    valid_tp,
                    pressure_col,
                ]
                .to_numpy(dtype=float)
            )

            y = (
                group.loc[
                    valid_tp,
                    temp_col,
                ]
                .to_numpy(dtype=float)
            )

            x_mean = x.mean()
            x_std = x.std()

            if x_std == 0:
                x_std = 1.0

            x_scaled = (
                x - x_mean
            ) / x_std

            slope, intercept = np.polyfit(
                x_scaled,
                y,
                1,
            )

            current_x = (
                group[pressure_col] - x_mean
            ) / x_std

            expected_temperature = (
                intercept
                + slope * current_x
            )

            # Residual is based on CURRENT observed values
            # against the clean baseline relationship.
            df.loc[
                idx,
                "temp_pressure_residual",
            ] = (
                group["temperature_c"]
                - expected_temperature
            )

        # ====================================================
        # Temperature vs Humidity
        # ====================================================

        valid_th = (
            group[temp_col].notna()
            & group[humidity_col].notna()
        )

        if valid_th.sum() >= MIN_RELATIONSHIP_SAMPLES:

            x = (
                group.loc[
                    valid_th,
                    humidity_col,
                ]
                .to_numpy(dtype=float)
            )

            y = (
                group.loc[
                    valid_th,
                    temp_col,
                ]
                .to_numpy(dtype=float)
            )

            x_mean = x.mean()
            x_std = x.std()

            if x_std == 0:
                x_std = 1.0

            x_scaled = (
                x - x_mean
            ) / x_std

            slope, intercept = np.polyfit(
                x_scaled,
                y,
                1,
            )

            current_x = (
                group[humidity_col] - x_mean
            ) / x_std

            expected_temperature = (
                intercept
                + slope * current_x
            )

            df.loc[
                idx,
                "temp_humidity_residual",
            ] = (
                group["temperature_c"]
                - expected_temperature
            )

    return df


# ============================================================
# HAVERSINE DISTANCE
# ============================================================

def haversine_km(
    lat1,
    lon1,
    lat2,
    lon2,
):
    """
    Calculate great-circle distance between two coordinates.
    """

    lat1 = np.radians(lat1)
    lon1 = np.radians(lon1)
    lat2 = np.radians(lat2)
    lon2 = np.radians(lon2)

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        np.sin(dlat / 2) ** 2
        + np.cos(lat1)
        * np.cos(lat2)
        * np.sin(dlon / 2) ** 2
    )

    return (
        2
        * EARTH_RADIUS_KM
        * np.arcsin(
            np.sqrt(a)
        )
    )


# ============================================================
# STATION DISTANCE MATRIX
# ============================================================

def build_station_distances(df):
    """
    Build pairwise distances between stations.

    Returns:
        station_ids
        distance_matrix
    """

    stations = (
        df[
            [
                "station_id",
                "latitude",
                "longitude",
            ]
        ]
        .drop_duplicates("station_id")
        .reset_index(drop=True)
    )

    station_ids = stations["station_id"].tolist()

    n = len(stations)

    distances = np.zeros(
        (n, n),
        dtype=float,
    )

    for i in range(n):

        for j in range(n):

            if i == j:
                continue

            distances[i, j] = haversine_km(
                stations.loc[i, "latitude"],
                stations.loc[i, "longitude"],
                stations.loc[j, "latitude"],
                stations.loc[j, "longitude"],
            )

    return station_ids, distances


# ============================================================
# DISTANCE-WEIGHTED SPATIAL FEATURES
# ============================================================

def add_spatial_features(df):
    """
    Compare each station with a distance-weighted average
    of OTHER stations at the same timestamp.

    Closer stations receive higher weights.

        weight = 1 / distance

    The station itself is explicitly excluded.

    Missing observations from neighboring stations are ignored.
    """

    station_ids, distances = build_station_distances(df)

    station_to_index = {
        station_id: i
        for i, station_id in enumerate(station_ids)
    }

    spatial_columns = [
        (
            "temperature_c",
            "spatial_temp_deviation",
        ),
        (
            "pressure_hpa",
            "spatial_pressure_deviation",
        ),
        (
            "humidity_pct",
            "spatial_humidity_deviation",
        ),
    ]

    # --------------------------------------------------------
    # Process every timestamp
    # --------------------------------------------------------

    for timestamp, group in df.groupby(
        "timestamp",
        sort=False,
    ):

        available_stations = set(
            group["station_id"]
        )

        for value_column, output_column in spatial_columns:

            values = {
                row["station_id"]: row[value_column]
                for _, row in group.iterrows()
                if pd.notna(row[value_column])
            }

            for row_index, row in group.iterrows():

                station_id = row["station_id"]

                current_value = row[value_column]

                if pd.isna(current_value):
                    df.loc[
                        row_index,
                        output_column,
                    ] = np.nan
                    continue

                current_index = station_to_index[
                    station_id
                ]

                weighted_sum = 0.0
                weight_sum = 0.0

                for other_station in available_stations:

                    if other_station == station_id:
                        continue

                    if other_station not in values:
                        continue

                    other_index = station_to_index[
                        other_station
                    ]

                    distance = distances[
                        current_index,
                        other_index,
                    ]

                    if distance <= 0:
                        continue

                    weight = 1.0 / distance

                    weighted_sum += (
                        weight
                        * values[other_station]
                    )

                    weight_sum += weight

                if weight_sum > 0:

                    spatial_baseline = (
                        weighted_sum
                        / weight_sum
                    )

                    df.loc[
                        row_index,
                        output_column,
                    ] = (
                        current_value
                        - spatial_baseline
                    )

                else:

                    df.loc[
                        row_index,
                        output_column,
                    ] = np.nan

    return df


# ============================================================
# TIME-OF-DAY FEATURES
# ============================================================

def add_time_features(df):
    """
    Cyclical encoding of hour of day.

        hour_sin
        hour_cos

    This keeps 23:00 and 00:00 mathematically close.
    """

    hour = df["timestamp"].dt.hour

    df["hour_sin"] = np.sin(
        2 * np.pi * hour / 24
    )

    df["hour_cos"] = np.cos(
        2 * np.pi * hour / 24
    )

    return df


# ============================================================
# PERSISTENCE FLAG
# ============================================================

def add_persistence_flag(df):
    """
    Mark a sensor as persistent when its value remains
    unchanged for at least three consecutive observations.

    This is calculated independently of anomaly_label.
    """

    df["persistence_flag"] = False

    for station_id, group in df.groupby(
        "station_id",
        sort=False,
    ):

        idx = group.index

        for column in [
            "temperature_c",
            "pressure_hpa",
            "humidity_pct",
        ]:

            same_as_previous = (
                group[column]
                .eq(group[column].shift(1))
            )

            persistent = (
                same_as_previous
                & same_as_previous.shift(
                    1,
                    fill_value=False,
                )
            )

            persistent_indices = idx[
                persistent.fillna(False)
            ]

            df.loc[
                persistent_indices,
                "persistence_flag",
            ] = True

    return df


# ============================================================
# FEATURE LIST
# ============================================================

def get_ml_feature_columns():

    return [
        "temp_rate",
        "pressure_rate",
        "humidity_rate",

        "temp_rolling_mean",
        "temp_rolling_std",

        "pressure_rolling_mean",
        "pressure_rolling_std",

        "humidity_rolling_mean",
        "humidity_rolling_std",

        "temp_pressure_residual",
        "temp_humidity_residual",

        "spatial_temp_deviation",
        "spatial_pressure_deviation",
        "spatial_humidity_deviation",

        "hour_sin",
        "hour_cos",

        "persistence_flag",
        "missing_flag",
        "duplicate_flag",
    ]


# ============================================================
# VALIDATION
# ============================================================

def validate_features(df):

    ml_features = get_ml_feature_columns()

    # --------------------------------------------------------
    # Check ML feature columns exist
    # --------------------------------------------------------

    missing_features = [
        feature
        for feature in ml_features
        if feature not in df.columns
    ]

    if missing_features:
        raise ValueError(
            "Missing ML features: "
            + str(missing_features)
        )

    # --------------------------------------------------------
    # Check for ground-truth leakage
    # --------------------------------------------------------

    leakage = set(
        ml_features
    ).intersection(
        GROUND_TRUTH_COLUMNS
    )

    if leakage:
        raise ValueError(
            f"Ground-truth leakage detected: {leakage}"
        )

    # --------------------------------------------------------
    # Check regional event
    # --------------------------------------------------------

    if (
        "scenario_tag" in df.columns
        and "anomaly_label" in df.columns
    ):

        regional = df[
            df["scenario_tag"]
            .astype(str)
            .eq("regional_event")
        ]

        if len(regional) > 0:

            incorrect = (
                regional["anomaly_label"]
                != 0
            ).sum()

            if incorrect > 0:
                raise ValueError(
                    "Regional-event rows incorrectly "
                    "have anomaly_label=1."
                )

    print()
    print("Validation:")
    print("  ML feature leakage:       PASS")
    print("  Required features:        PASS")
    print("  Regional event labeling:  PASS")


# ============================================================
# MAIN PIPELINE
# ============================================================

def create_features(
    input_path,
    output_path,
):

    df = load_data(
        input_path
    )

    original_rows = len(df)

    # --------------------------------------------------------
    # Preserve original sensor values
    # --------------------------------------------------------

    for source, target in [
        (
            "temperature_c",
            "original_temperature_c",
        ),
        (
            "pressure_hpa",
            "original_pressure_hpa",
        ),
        (
            "humidity_pct",
            "original_humidity_pct",
        ),
    ]:

        if target not in df.columns:

            df[target] = df[source]

    # --------------------------------------------------------
    # Data-quality features
    # --------------------------------------------------------

    df = add_missing_flag(df)

    df = add_duplicate_flag(df)

    # --------------------------------------------------------
    # Temporal features
    # --------------------------------------------------------

    df = add_rate_features(df)

    df = add_rolling_features(df)

    # --------------------------------------------------------
    # Multivariate features
    # --------------------------------------------------------

    df = add_multivariate_residuals(df)

    # --------------------------------------------------------
    # Spatial features
    # --------------------------------------------------------

    print("Calculating distance-weighted spatial features...")

    df = add_spatial_features(df)

    # --------------------------------------------------------
    # Time encoding
    # --------------------------------------------------------

    df = add_time_features(df)

    # --------------------------------------------------------
    # Persistence
    # --------------------------------------------------------

    df = add_persistence_flag(df)

    # --------------------------------------------------------
    # Final ordering
    # --------------------------------------------------------

    df = df.sort_values(
        [
            "station_id",
            "timestamp",
        ]
    ).reset_index(drop=True)

    # --------------------------------------------------------
    # Validate
    # --------------------------------------------------------

    validate_features(df)

    # --------------------------------------------------------
    # Save
    # --------------------------------------------------------

    output_directory = os.path.dirname(
        output_path
    )

    if output_directory:
        os.makedirs(
            output_directory,
            exist_ok=True,
        )

    df.to_csv(
        output_path,
        index=False,
    )

    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    ml_features = get_ml_feature_columns()

    print()
    print("=" * 60)
    print("SkyGuard AI — feature engineering summary")
    print("=" * 60)

    print(
        f"Input rows:          {original_rows}"
    )

    print(
        f"Output rows:         {len(df)}"
    )

    print(
        f"Stations:            {df['station_id'].nunique()}"
    )

    print(
        f"ML features:         {len(ml_features)}"
    )

    print(
        f"Output file:         {output_path}"
    )

    print()
    print("ML feature columns:")

    for feature in ml_features:
        print(f"  {feature}")

    print()
    print("Missing values in ML features:")

    missing_summary = (
        df[ml_features]
        .isna()
        .sum()
    )

    nonzero_missing = (
        missing_summary[
            missing_summary > 0
        ]
    )

    if len(nonzero_missing) > 0:
        print(
            nonzero_missing.to_string()
        )
    else:
        print("  None")

    print()
    print("Sample:")

    print(
        df[
            [
                "station_id",
                "timestamp",
                "temperature_c",
                "pressure_hpa",
                "humidity_pct",
                "temp_rate",
                "temp_rolling_mean",
                "temp_rolling_std",
                "temp_pressure_residual",
                "spatial_temp_deviation",
                "hour_sin",
                "hour_cos",
                "persistence_flag",
                "missing_flag",
                "duplicate_flag",
                "anomaly_label",
                "anomaly_type",
            ]
        ]
        .head(10)
        .to_string(index=False)
    )

    print()
    print("=" * 60)
    print("FEATURE DATASET CREATED SUCCESSFULLY")
    print("=" * 60)


# ============================================================
# COMMAND LINE
# ============================================================

if __name__ == "__main__":

    parser = argparse.ArgumentParser(
        description=(
            "SkyGuard AI feature engineering pipeline"
        )
    )

    parser.add_argument(
        "--input",
        default=DEFAULT_INPUT,
        help="Input CSV file",
    )

    parser.add_argument(
        "--output",
        default=DEFAULT_OUTPUT,
        help="Output CSV file",
    )

    args = parser.parse_args()

    create_features(
        args.input,
        args.output,
    )