# Backend Handoff: Sensor Health & Data Correction Logic

Hi Backend Team (Person 3),

As the ML Engineer, I've finalized the core anomaly detection engine. According to our Version 2 Architecture Plan, the **Sensor Health Scoring** and **Data Correction Pipeline** logic should be implemented in the Node.js layer since you have direct access to the historical data in PostgreSQL.

Here are the exact deterministic formulas and logic you need to implement.

---

## 1. Sensor Health Formula (V2 Section 16)

The Sensor Health score is a `0-100` value computed **per channel** (temperature, pressure, humidity) for each station. It evaluates degradation over time rather than instantaneous faults. 

Please run this calculation periodically (e.g., hourly or whenever a new anomaly is flagged) and update the `sensor_health` table.

**The Formula:**
```javascript
health_score = 100 
  - (30 * rolling_24h_anomaly_rate)
  - (25 * persistence_flag_rate_last_7d)
  - (20 * normalized_drift_magnitude_vs_baseline)
  - (15 * normalized_variance_change)
  - (10 * missing_data_rate_last_7d)
```

**Variable Definitions (All normalized to `[0, 1]` before weighting):**
*   `rolling_24h_anomaly_rate`: (Count of anomalous readings for this channel in the last 24h) / (Total expected readings in 24h).
*   `persistence_flag_rate_last_7d`: (Count of readings where `persistence_flag == true` in the last 7 days) / (Total readings in 7 days).
*   `normalized_drift_magnitude_vs_baseline`: Absolute difference between the channel's 7-day rolling mean and its 30-day baseline mean. Cap this at a maximum plausible drift (e.g., `3.0` units) and divide by the cap to get a `0.0 - 1.0` value.
*   `normalized_variance_change`: `(7-day rolling variance) / (30-day baseline variance) - 1.0`. Clamp this value between `0.0` and `1.0`.
*   `missing_data_rate_last_7d`: (Count of missing/null intervals in the last 7 days) / (Total expected intervals in 7 days).

---

## 2. Self-Healing / Correction Logic (V2 Section 17)

When the ML service flags a reading as anomalous, the Node.js backend must propose a corrected value **without ever overwriting the raw data**.

**The Pipeline:**
1.  **Anomaly Detected:** `is_anomaly == true` from our rule set.
2.  **Estimate Corrected Value:** 
    *   *Option A (Short Gap):* If the anomaly is isolated (previous reading was normal), use linear interpolation between the previous known-good reading and the current spatial neighbor average.
    *   *Option B (Spatial):* Take the distance-weighted average of the same channel from the 3 nearest healthy stations.
3.  **Attach Confidence:** 
    *   If using spatial neighbors and they all agree tightly (low variance among neighbors), `confidence` = `0.9`. 
    *   If neighbors disagree or aren't available, `confidence` = `0.4`.
4.  **Evaluate Threshold:**
    *   **If `confidence >= 0.7`**: Write to the `corrections` table with `raw_value`, `corrected_value`, `method` (e.g., "spatial_estimate"), and `confidence`.
    *   **If `confidence < 0.7`**: Do not auto-substitute. Flag the correction as "Uncertain — Human Review Required".

This satisfies the project's strict requirement for an audited, non-destructive self-healing pipeline.

Let me know if you need any help mapping these variables to your PostgreSQL queries!
