"""
injection_engine.py
====================
SkyGuard AI — Version 2
Person 2 (Data & Feature Engineering Engineer) — Day 2 deliverable

Reads the clean, QC'd baseline produced on Day 1 (data/clean_stations.csv)
and produces a labeled dataset with realistic, reproducible synthetic
anomalies injected, for:
  - training/evaluating Person 1's Isolation Forest model
  - driving Person 3's replay/demo stream later (Day 4)

Design rules followed (per team plan + your requirements):
  * data/clean_stations.csv is NEVER modified.
  * Output is data/injected_stations.csv (labeled, ground-truth included).
  * Ground-truth columns (anomaly_label, anomaly_type, anomaly_id,
    affected_parameter, injection_start, injection_end, scenario_tag)
    are for evaluation ONLY and must never be used as ML features.
  * Fixed, configurable random seed -> fully reproducible runs.
  * One modular inject_* function per anomaly type.
  * Anomalies are realistic: sudden spikes/drops, gradual drift, sensors
    that freeze at a constant value, scattered missing points, blockwise
    communication gaps, physically inconsistent T/P/RH relationships,
    duplicated timestamps, and a genuine multi-station regional event
    that is intentionally labeled NORMAL (not an anomaly) so the
    detector's ability to *not* flag real weather is testable later.

Covers all 14 required scenarios from the V2 execution plan:
  1. temperature spike        8.  frozen pressure
  2. temperature drop         9.  gradual drift
  3. humidity spike           10. missing values (scattered)
  4. pressure spike           11. duplicated readings
  5. pressure drop            12. communication gaps (consecutive block)
  6. frozen temperature       13. multivariate inconsistency
  7. frozen humidity          14. genuine multi-station regional event

Run:
    python injection_engine.py
    python injection_engine.py --seed 7
    python injection_engine.py --input data/clean_stations.csv --output data/injected_stations.csv
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd

# --------------------------------------------------------------------------- #
# Configuration
# --------------------------------------------------------------------------- #

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_DATA_DIR = _REPO_ROOT / "data" if (_REPO_ROOT / "data").exists() else Path("data")

DEFAULT_INPUT_PATH = str(_DATA_DIR / "clean_stations.csv")
DEFAULT_OUTPUT_PATH = str(_DATA_DIR / "injected_stations.csv")
DEFAULT_EVENTS_LOG_PATH = str(_DATA_DIR / "injection_events.csv")
DEFAULT_SEED = 42

# WMO-style plausibility anchors (per-hour step thresholds). Injected
# magnitudes are sized as multiples of these so faults sit "just past
# the plausible boundary," matching how a real sensor fault would look.
TEMP_STEP_THRESHOLD_C = 5.0      # °C per hour
PRESSURE_STEP_THRESHOLD_HPA = 3.0  # hPa per hour
HUMIDITY_STEP_THRESHOLD_PCT = 15.0  # % per hour

ANOMALY_TYPES = {
    "temperature_spike": "temperature_c",
    "temperature_drop": "temperature_c",
    "humidity_spike": "humidity_pct",
    "pressure_spike": "pressure_hpa",
    "pressure_drop": "pressure_hpa",
    "drift": "temperature_c",
    "frozen_temperature": "temperature_c",
    "frozen_pressure": "pressure_hpa",
    "frozen_humidity": "humidity_pct",
    "missing_value": "temperature_c,pressure_hpa,humidity_pct",
    "duplicate": "all",
    "communication_gap": "temperature_c,pressure_hpa,humidity_pct",
    "multivariate_inconsistency": "temperature_c,humidity_pct",
    "regional_event": "temperature_c,pressure_hpa,humidity_pct",
}

SENSOR_COLUMNS = ["temperature_c", "pressure_hpa", "humidity_pct"]


# --------------------------------------------------------------------------- #
# Core engine
# --------------------------------------------------------------------------- #

class AnomalyInjector:
    """
    Stateful injection engine. Operates on one working copy of the
    baseline dataframe, tracks which (station, position) slots are
    already used so injected windows never overlap, and keeps a
    ground-truth event log for verification and downstream evaluation.
    """

    def __init__(self, df: pd.DataFrame, seed: int = DEFAULT_SEED):
        self.rng = np.random.default_rng(seed)
        self.seed = seed

        df = df.sort_values(["station_id", "timestamp"]).reset_index(drop=True)

        # Preserve untouched baseline values before any injection happens.
        for col in SENSOR_COLUMNS:
            df[f"original_{col}"] = df[col]

        # Ground-truth / evaluation-only columns. NEVER feed these to the model.
        df["anomaly_label"] = 0
        df["anomaly_type"] = "normal"
        df["anomaly_id"] = pd.NA
        df["affected_parameter"] = pd.NA
        df["injection_start"] = pd.NaT
        df["injection_end"] = pd.NaT
        df["scenario_tag"] = "baseline"

        self.df = df
        self._id_counter = 0
        self.event_log: list[dict] = []

        # Per-station position index (positions are contiguous per
        # station because of the sort above) and an "occupied" mask
        # used to prevent injected windows from overlapping.
        self.station_index: dict[str, np.ndarray] = {}
        self.occupied: dict[str, np.ndarray] = {}
        for station in df["station_id"].unique():
            idx = df.index[df["station_id"] == station].to_numpy()
            self.station_index[station] = idx
            self.occupied[station] = np.zeros(len(idx), dtype=bool)

        self._validate_hourly_grid()

    # ---- infrastructure -------------------------------------------------- #

    def _validate_hourly_grid(self) -> None:
        """Warn (don't fail) if any station isn't a clean hourly grid."""
        for station, idx in self.station_index.items():
            ts = self.df.loc[idx, "timestamp"]
            diffs = ts.diff().dropna().dt.total_seconds() / 3600.0
            if not diffs.empty and not np.allclose(diffs, 1.0):
                print(
                    f"[warn] {station}: non-uniform hourly spacing detected "
                    f"({(diffs != 1.0).sum()} irregular gaps). "
                    "Position-based windows assume a regular grid."
                )

    def _next_id(self) -> str:
        self._id_counter += 1
        return f"ANOM_{self._id_counter:04d}"

    def _free_window(self, station: str, duration: int, min_gap: int = 2,
                      max_tries: int = 200) -> int | None:
        """Find a random start position (station-local) with `duration`
        free slots and `min_gap` free slots of padding on each side,
        so injected events never touch each other."""
        n = len(self.occupied[station])
        if duration >= n:
            return None
        for _ in range(max_tries):
            start = int(self.rng.integers(0, n - duration))
            lo = max(0, start - min_gap)
            hi = min(n, start + duration + min_gap)
            if not self.occupied[station][lo:hi].any():
                return start
        return None

    def _mark_occupied(self, station: str, start: int, duration: int) -> None:
        self.occupied[station][start:start + duration] = True

    def _global_idx(self, station: str, start: int, duration: int) -> np.ndarray:
        return self.station_index[station][start:start + duration]

    def _log(self, global_idx: np.ndarray, anomaly_type: str,
              affected_parameter: str, station: str, anomaly_id: str,
              label: int = 1, scenario_tag: str | None = None) -> None:
        ts = self.df.loc[global_idx, "timestamp"]
        start_ts, end_ts = ts.min(), ts.max()

        self.df.loc[global_idx, "anomaly_label"] = label
        self.df.loc[global_idx, "anomaly_type"] = anomaly_type
        self.df.loc[global_idx, "anomaly_id"] = anomaly_id
        self.df.loc[global_idx, "affected_parameter"] = affected_parameter
        self.df.loc[global_idx, "injection_start"] = start_ts
        self.df.loc[global_idx, "injection_end"] = end_ts
        if scenario_tag:
            self.df.loc[global_idx, "scenario_tag"] = scenario_tag

        self.event_log.append({
            "anomaly_id": anomaly_id,
            "anomaly_type": anomaly_type,
            "station_id": station,
            "affected_parameter": affected_parameter,
            "injection_start": start_ts,
            "injection_end": end_ts,
            "n_rows": len(global_idx),
            "anomaly_label": label,
        })

    # ---- injection functions --------------------------------------------- #

    def _inject_step_anomaly(self, station: str, column: str, anomaly_type: str,
                              threshold: float, sign: int) -> bool:
        """Shared machinery for every sudden spike/drop scenario: pick a
        short (1-3h) free window, apply a signed offset sized as 1.5-3x
        the channel's WMO-style plausibility threshold, then release --
        creating a sharp step up (or down) followed by a sharp step back,
        which is exactly what a step-check/persistence-check is built to
        catch. One function, reused for every channel, so temperature,
        humidity and pressure spikes/drops all behave identically."""
        duration = int(self.rng.integers(1, 4))
        start = self._free_window(station, duration)
        if start is None:
            return False
        idx = self._global_idx(station, start, duration)
        magnitude = self.rng.uniform(1.5, 3.0) * threshold * sign
        self.df.loc[idx, column] += magnitude
        if column == "humidity_pct":
            self.df.loc[idx, column] = self.df.loc[idx, column].clip(0.0, 100.0)
        self._mark_occupied(station, start, duration)
        self._log(idx, anomaly_type, column, station, self._next_id())
        return True

    def inject_temperature_spike(self, station: str) -> bool:
        """Sudden, short-lived temperature jump. Req #1."""
        return self._inject_step_anomaly(
            station, "temperature_c", "temperature_spike", TEMP_STEP_THRESHOLD_C, +1)

    def inject_temperature_drop(self, station: str) -> bool:
        """Sudden, short-lived temperature crash. Req #2."""
        return self._inject_step_anomaly(
            station, "temperature_c", "temperature_drop", TEMP_STEP_THRESHOLD_C, -1)

    def inject_humidity_spike(self, station: str) -> bool:
        """Sudden, short-lived humidity jump. Req #3."""
        return self._inject_step_anomaly(
            station, "humidity_pct", "humidity_spike", HUMIDITY_STEP_THRESHOLD_PCT, +1)

    def inject_pressure_spike(self, station: str) -> bool:
        """Sudden, short-lived pressure jump. Req #4."""
        return self._inject_step_anomaly(
            station, "pressure_hpa", "pressure_spike", PRESSURE_STEP_THRESHOLD_HPA, +1)

    def inject_pressure_drop(self, station: str) -> bool:
        """Sudden, short-lived pressure crash. Req #5."""
        return self._inject_step_anomaly(
            station, "pressure_hpa", "pressure_drop", PRESSURE_STEP_THRESHOLD_HPA, -1)

    def inject_drift(self, station: str) -> bool:
        """Gradual, accumulating temperature offset over 12-48 hours --
        no single-step violation, only visible as a slow baseline creep."""
        duration = int(self.rng.integers(12, 49))
        start = self._free_window(station, duration)
        if start is None:
            return False
        idx = self._global_idx(station, start, duration)
        total_drift = self.rng.uniform(1.5, 3.0) * TEMP_STEP_THRESHOLD_C
        sign = self.rng.choice([1, -1])
        ramp = np.linspace(0, total_drift, duration) * sign
        self.df.loc[idx, "temperature_c"] += ramp
        self._mark_occupied(station, start, duration)
        self._log(idx, "drift", "temperature_c", station, self._next_id())
        return True

    def inject_frozen(self, station: str, column: str) -> bool:
        """Stuck sensor: repeats the exact same value for 6-24 consecutive
        hours (a persistence-check violation) on one channel only."""
        duration = int(self.rng.integers(6, 25))
        start = self._free_window(station, duration)
        if start is None:
            return False
        idx = self._global_idx(station, start, duration)
        frozen_value = self.df.loc[idx[0], column]
        self.df.loc[idx, column] = frozen_value
        self._mark_occupied(station, start, duration)
        anomaly_type = {
            "temperature_c": "frozen_temperature",
            "pressure_hpa": "frozen_pressure",
            "humidity_pct": "frozen_humidity",
        }[column]
        self._log(idx, anomaly_type, column, station, self._next_id())
        return True

    def inject_missing_values(self, station: str, n_points: int = 3) -> int:
        """Scattered single-hour dropouts (all three channels go NaN at
        an isolated timestamp) -- distinct from a communication gap,
        which is a consecutive block."""
        placed = 0
        for _ in range(n_points):
            start = self._free_window(station, duration=1, min_gap=1)
            if start is None:
                continue
            idx = self._global_idx(station, start, 1)
            self.df.loc[idx, SENSOR_COLUMNS] = np.nan
            self._mark_occupied(station, start, 1)
            self._log(idx, "missing_value", "temperature_c,pressure_hpa,humidity_pct",
                       station, self._next_id())
            placed += 1
        return placed

    def inject_communication_gap(self, station: str) -> bool:
        """Consecutive block (3-8 hours) where the station stops
        reporting entirely -- all channels NaN for the whole block."""
        duration = int(self.rng.integers(3, 9))
        start = self._free_window(station, duration)
        if start is None:
            return False
        idx = self._global_idx(station, start, duration)
        self.df.loc[idx, SENSOR_COLUMNS] = np.nan
        self._mark_occupied(station, start, duration)
        self._log(idx, "communication_gap", "temperature_c,pressure_hpa,humidity_pct",
                   station, self._next_id())
        return True

    def inject_multivariate_inconsistency(self, station: str) -> bool:
        """Breaks the normal inverse temperature/humidity relationship:
        temperature rises AND humidity rises together for several hours,
        with pressure left untouched -- individually each value is
        plausible, but the T-H relationship isn't."""
        duration = int(self.rng.integers(4, 11))
        start = self._free_window(station, duration)
        if start is None:
            return False
        idx = self._global_idx(station, start, duration)
        temp_delta = self.rng.uniform(0.8, 1.4) * TEMP_STEP_THRESHOLD_C
        humidity_delta = self.rng.uniform(0.8, 1.4) * HUMIDITY_STEP_THRESHOLD_PCT
        ramp_t = np.linspace(0, temp_delta, duration)
        ramp_h = np.linspace(0, humidity_delta, duration)
        self.df.loc[idx, "temperature_c"] += ramp_t
        self.df.loc[idx, "humidity_pct"] = (self.df.loc[idx, "humidity_pct"] + ramp_h).clip(0.0, 100.0)
        self._mark_occupied(station, start, duration)
        self._log(idx, "multivariate_inconsistency", "temperature_c,humidity_pct",
                   station, self._next_id())
        return True

    def inject_regional_event(self, stations: list[str], n_stations: int = 4,
                               duration_range=(24, 49)) -> bool:
        """Genuine, physically-consistent regional weather event: a
        gradual, correlated T/P/RH change applied identically to several
        stations at once (e.g. a frontal passage). This is the negative
        test -- it is intentionally labeled anomaly_label=0 /
        anomaly_type='normal', because the whole point is to prove the
        system does NOT flag real weather. `scenario_tag` marks it for
        traceability without leaking into the ML-facing label."""
        if len(stations) < 2:
            return False
        n_stations = min(n_stations, len(stations))
        chosen = list(self.rng.choice(stations, size=n_stations, replace=False))
        duration = int(self.rng.integers(*duration_range))

        # All chosen stations must have a free window; try until one works.
        for _ in range(50):
            starts = {}
            ok = True
            for station in chosen:
                start = self._free_window(station, duration)
                if start is None:
                    ok = False
                    break
                starts[station] = start
            if ok:
                break
        else:
            return False

        event_id = self._next_id()
        temp_delta = self.rng.uniform(3.0, 6.0)
        pressure_delta = self.rng.uniform(-6.0, -3.0)  # front passage: pressure drop
        humidity_delta = self.rng.uniform(-10.0, 10.0)

        for station, start in starts.items():
            idx = self._global_idx(station, start, duration)
            self.df.loc[idx, "temperature_c"] += np.linspace(0, temp_delta, duration)
            self.df.loc[idx, "pressure_hpa"] += np.linspace(0, pressure_delta, duration)
            self.df.loc[idx, "humidity_pct"] = (
                self.df.loc[idx, "humidity_pct"] + np.linspace(0, humidity_delta, duration)
            ).clip(0.0, 100.0)
            self._mark_occupied(station, start, duration)
            # label=0: this is NOT an anomaly, by design.
            self._log(idx, "normal", "temperature_c,pressure_hpa,humidity_pct",
                       station, event_id, label=0, scenario_tag="regional_event")
        return True

    def inject_duplicates(self, station: str, n_duplicates: int = 2) -> int:
        """Duplicates real (already-processed) rows verbatim at the same
        timestamp -- appended as new rows, never overwriting anything.
        Must run LAST, after all window-based injections, since it adds
        rows and would otherwise invalidate position-based indexing."""
        idx_pool = self.station_index[station]
        placed = 0
        new_rows = []
        for _ in range(n_duplicates):
            pos = int(self.rng.integers(0, len(idx_pool)))
            src_idx = idx_pool[pos]
            row = self.df.loc[src_idx].copy()
            anomaly_id = self._next_id()
            row["anomaly_label"] = 1
            row["anomaly_type"] = "duplicate"
            row["anomaly_id"] = anomaly_id
            row["affected_parameter"] = "all"
            row["injection_start"] = row["timestamp"]
            row["injection_end"] = row["timestamp"]
            row["scenario_tag"] = "baseline"
            new_rows.append(row)
            self.event_log.append({
                "anomaly_id": anomaly_id,
                "anomaly_type": "duplicate",
                "station_id": station,
                "affected_parameter": "all",
                "injection_start": row["timestamp"],
                "injection_end": row["timestamp"],
                "n_rows": 1,
                "anomaly_label": 1,
            })
            placed += 1
        if new_rows:
            self.df = pd.concat([self.df, pd.DataFrame(new_rows)], ignore_index=False)
        return placed

    # ---- finalize ---------------------------------------------------------#

    def finalize(self) -> pd.DataFrame:
        df = self.df.sort_values(["station_id", "timestamp"], kind="stable")
        df = df.reset_index(drop=True)
        return df


# --------------------------------------------------------------------------- #
# Orchestration
# --------------------------------------------------------------------------- #

def run_injection_pipeline(input_path: str, output_path: str,
                            events_log_path: str, seed: int) -> tuple[pd.DataFrame, pd.DataFrame]:
    input_file = Path(input_path)
    if not input_file.exists():
        print(f"[error] input file not found: {input_path}")
        sys.exit(1)

    df = pd.read_csv(input_file, parse_dates=["timestamp"])
    injector = AnomalyInjector(df, seed=seed)

    stations = sorted(df["station_id"].unique().tolist())
    if len(stations) == 0:
        print("[error] no stations found in input file")
        sys.exit(1)

    # Pass 1: window-based injections (no row count change). Duplicates
    # are deliberately excluded here and run last.
    for i, station in enumerate(stations):
        injector.inject_temperature_spike(station)
        injector.inject_temperature_drop(station)
        injector.inject_humidity_spike(station)
        injector.inject_pressure_spike(station)
        injector.inject_pressure_drop(station)
        injector.inject_drift(station)

        frozen_column = SENSOR_COLUMNS[i % 3]
        injector.inject_frozen(station, frozen_column)

        injector.inject_missing_values(station, n_points=2)
        injector.inject_communication_gap(station)
        injector.inject_multivariate_inconsistency(station)

    # Regional event: multi-station, correlated, labeled NORMAL.
    injector.inject_regional_event(stations, n_stations=min(4, len(stations)))

    # Pass 2: duplicates last (adds rows).
    for station in stations:
        injector.inject_duplicates(station, n_duplicates=2)

    result_df = injector.finalize()
    events_df = pd.DataFrame(injector.event_log)

    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)
    result_df.to_csv(output_file, index=False)

    events_file = Path(events_log_path)
    events_df.to_csv(events_file, index=False)

    return result_df, events_df


def print_summary(df: pd.DataFrame, events_df: pd.DataFrame,
                   output_path: str, events_log_path: str, seed: int) -> None:
    total_rows = len(df)
    anomalous = df[df["anomaly_label"] == 1]
    normal = df[df["anomaly_label"] == 0]

    print("\n" + "=" * 60)
    print("SkyGuard AI — injection_engine.py summary")
    print("=" * 60)
    print(f"Seed used:              {seed}")
    print(f"Output file:            {output_path}")
    print(f"Event log file:         {events_log_path}")
    print(f"Total rows:             {total_rows}")
    print(f"Number of anomalous rows: {len(anomalous)}")
    print(f"Number of normal rows:    {len(normal)}")

    print("\nAnomalies by type (row counts):")
    type_counts = df.loc[df["anomaly_type"] != "normal", "anomaly_type"].value_counts()
    if type_counts.empty:
        print("  (none)")
    else:
        for t, c in type_counts.items():
            print(f"  {t:<28} {c}")

    regional_rows = df[df["scenario_tag"] == "regional_event"]
    print(f"\nGenuine regional event rows (label=0, tracked separately): {len(regional_rows)}")
    if not regional_rows.empty:
        print(f"  Stations involved: {sorted(regional_rows['station_id'].unique().tolist())}")

    print("\nAffected stations (any injected event, including regional):")
    involved_ids = pd.concat([
        df.loc[df["anomaly_label"] == 1, "station_id"],
        regional_rows["station_id"],
    ]).unique()
    print(f"  {sorted(involved_ids.tolist())}")

    print("\nAffected parameters:")
    params = set()
    for val in df.loc[df["affected_parameter"].notna(), "affected_parameter"]:
        params.update(str(val).split(","))
    print(f"  {sorted(params)}")

    print(f"\nTotal injected events (unique anomaly_id, includes regional as 1 shared id): "
          f"{events_df['anomaly_id'].nunique()}")
    print("=" * 60 + "\n")


def main():
    parser = argparse.ArgumentParser(description="SkyGuard AI synthetic anomaly injection engine")
    parser.add_argument("--input", default=DEFAULT_INPUT_PATH, help="Path to clean_stations.csv")
    parser.add_argument("--output", default=DEFAULT_OUTPUT_PATH, help="Path to write injected_stations.csv")
    parser.add_argument("--events-log", default=DEFAULT_EVENTS_LOG_PATH,
                         help="Path to write the ground-truth event log")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED, help="Random seed (reproducibility)")
    args = parser.parse_args()

    df, events_df = run_injection_pipeline(args.input, args.output, args.events_log, args.seed)
    print_summary(df, events_df, args.output, args.events_log, args.seed)


if __name__ == "__main__":
    main()
