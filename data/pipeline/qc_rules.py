import pandas as pd
import numpy as np


# ============================================================
# SKYGUARD BASIC QUALITY CONTROL
# ============================================================
#
# These are fast deterministic checks performed before ML.
#
# Checks:
#   1. Range
#   2. Step / sudden change
#   3. Persistence / frozen sensor
#   4. Missing data
#   5. Duplicate timestamp
#
# IMPORTANT:
# Raw observations are NEVER overwritten.
# QC only creates flags.
# ============================================================


# ------------------------------------------------------------
# 1. PLAUSIBLE VALUE RANGES
# ------------------------------------------------------------
#
# These are deliberately configurable prototype QC limits.
# They are not claimed as official WMO hard limits.
#
# The anomaly model will later provide a more context-aware
# judgement using station-relative features.
# ------------------------------------------------------------

RANGES = {
    "temperature_c": (-80.0, 60.0),
    "pressure_hpa": (800.0, 1100.0),
    "humidity_pct": (0.0, 100.0),
}


# ------------------------------------------------------------
# 2. MAXIMUM HOURLY STEP
# ------------------------------------------------------------
#
# Used to catch sudden jumps/drops between consecutive
# hourly observations.
#
# These are configurable engineering thresholds for our
# prototype QC layer.
# ------------------------------------------------------------

MAX_STEP = {
    "temperature_c": 8.0,     # °C/hour
    "pressure_hpa": 8.0,      # hPa/hour
    "humidity_pct": 25.0,     # percentage points/hour
}


# ------------------------------------------------------------
# 3. PERSISTENCE WINDOW
# ------------------------------------------------------------

PERSISTENCE_WINDOW = 6

# A sensor is considered suspiciously persistent if the same
# value continues for the whole window.


# ------------------------------------------------------------
# RANGE CHECK
# ------------------------------------------------------------

def range_check(df):

    result = pd.DataFrame(index=df.index)

    for column, (minimum, maximum) in RANGES.items():

        result[f"{column}_range_flag"] = (
            df[column].notna()
            & (
                (df[column] < minimum)
                | (df[column] > maximum)
            )
        )

    return result


# ------------------------------------------------------------
# STEP CHECK
# ------------------------------------------------------------

def step_check(df):

    result = pd.DataFrame(index=df.index)

    # Make sure observations are ordered correctly
    df = df.sort_values(
        ["station_id", "timestamp"]
    )

    for column, max_step in MAX_STEP.items():

        change = (
            df.groupby("station_id")[column]
            .diff()
            .abs()
        )

        result.loc[
            df.index,
            f"{column}_step_flag"
        ] = (
            change > max_step
        )

    return result


# ------------------------------------------------------------
# PERSISTENCE CHECK
# ------------------------------------------------------------

def persistence_check(df):

    result = pd.DataFrame(index=df.index)

    for column in RANGES.keys():

        # Count how many consecutive observations are equal.
        same_as_previous = (
            df.groupby("station_id")[column]
            .diff()
            .eq(0)
        )

        persistence_count = (
            same_as_previous
            .groupby(df["station_id"])
            .rolling(
                PERSISTENCE_WINDOW,
                min_periods=PERSISTENCE_WINDOW
            )
            .sum()
            .reset_index(
                level=0,
                drop=True
            )
        )

        result[f"{column}_persistence_flag"] = (
            persistence_count
            >= PERSISTENCE_WINDOW - 1
        )

    return result


# ------------------------------------------------------------
# MISSING DATA CHECK
# ------------------------------------------------------------

def missing_check(df):

    result = pd.DataFrame(index=df.index)

    sensor_columns = list(RANGES.keys())

    result["missing_flag_qc"] = (
        df[sensor_columns]
        .isna()
        .any(axis=1)
    )

    return result


# ------------------------------------------------------------
# DUPLICATE CHECK
# ------------------------------------------------------------

def duplicate_check(df):

    result = pd.DataFrame(index=df.index)

    result["duplicate_flag_qc"] = (
        df.duplicated(
            subset=[
                "station_id",
                "timestamp"
            ],
            keep=False
        )
    )

    return result


# ------------------------------------------------------------
# RUN ALL QC CHECKS
# ------------------------------------------------------------

def run_qc(df):

    df = df.copy()

    # Make sure timestamp is datetime
    df["timestamp"] = pd.to_datetime(
        df["timestamp"]
    )

    # Sort chronologically
    df = df.sort_values(
        ["station_id", "timestamp"]
    ).reset_index(drop=True)

    # Run individual checks
    range_flags = range_check(df)

    step_flags = step_check(df)

    persistence_flags = persistence_check(df)

    missing_flags = missing_check(df)

    duplicate_flags = duplicate_check(df)

    # Combine all flags
    qc = pd.concat(
        [
            range_flags,
            step_flags,
            persistence_flags,
            missing_flags,
            duplicate_flags,
        ],
        axis=1
    )

    # --------------------------------------------------------
    # Overall QC flag
    # --------------------------------------------------------

    flag_columns = [
        column
        for column in qc.columns
        if column.endswith("_flag")
    ]

    qc["qc_flag"] = (
        qc[flag_columns]
        .any(axis=1)
    )

    # --------------------------------------------------------
    # Human-readable reason
    # --------------------------------------------------------

    def get_reason(row):

        reasons = []

        if any(
            row.get(column, False)
            for column in [
                "temperature_c_range_flag",
                "pressure_hpa_range_flag",
                "humidity_pct_range_flag",
            ]
        ):
            reasons.append("range")

        if any(
            row.get(column, False)
            for column in [
                "temperature_c_step_flag",
                "pressure_hpa_step_flag",
                "humidity_pct_step_flag",
            ]
        ):
            reasons.append("step")

        if any(
            row.get(column, False)
            for column in [
                "temperature_c_persistence_flag",
                "pressure_hpa_persistence_flag",
                "humidity_pct_persistence_flag",
            ]
        ):
            reasons.append("persistence")

        if row.get(
            "missing_flag_qc",
            False
        ):
            reasons.append("missing")

        if row.get(
            "duplicate_flag_qc",
            False
        ):
            reasons.append("duplicate")

        if not reasons:
            return "none"

        return "|".join(reasons)

    qc["qc_reason"] = qc.apply(
        get_reason,
        axis=1
    )

    # Combine original data + QC flags
    output = pd.concat(
        [
            df,
            qc
        ],
        axis=1
    )

    return output


# ============================================================
# TEST / EXAMPLE USAGE
# ============================================================

if __name__ == "__main__":
    from pathlib import Path
    _REPO_ROOT = Path(__file__).resolve().parent.parent.parent
    _DATA_DIR = _REPO_ROOT / "data" if (_REPO_ROOT / "data").exists() else Path("data")

    input_file = str(_DATA_DIR / "clean_stations.csv")

    print("Loading dataset...")

    df = pd.read_csv(
        input_file,
        parse_dates=["timestamp"]
    )

    print(
        f"Loaded {len(df)} rows."
    )

    print("Running QC...")

    qc_df = run_qc(df)

    print("\n====================================")
    print("QC RESULTS")
    print("====================================")

    print(
        "Total observations:",
        len(qc_df)
    )

    print(
        "QC flagged observations:",
        qc_df["qc_flag"].sum()
    )

    print("\nQC reasons:")

    print(
        qc_df["qc_reason"]
        .value_counts()
    )

    print("\nSample:")

    print(
        qc_df[
            [
                "station_id",
                "timestamp",
                "temperature_c",
                "pressure_hpa",
                "humidity_pct",
                "qc_flag",
                "qc_reason",
            ]
        ].head(20)
    )

    # Save QC dataset
    output_file = str(_DATA_DIR / "qc_stations.csv")

    qc_df.to_csv(
        output_file,
        index=False
    )

    print(
        f"\nSaved QC dataset to: {output_file}"
    )