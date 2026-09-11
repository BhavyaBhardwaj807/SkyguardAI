import { randomUUID } from "node:crypto";
import {
  predictionSchema,
  type Assessment,
  type Observation,
  type Prediction,
  type Evidence,
} from "../../../contracts/index.js";
export type Predictor = (o: Observation, time: string) => Promise<Prediction>;
export function predictionClient(base: string, timeout: number): Predictor {
  return async (o, time) => {
    const res = await fetch(`${base}/predict`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(timeout),
      body: JSON.stringify({
        station_id: o.stationId,
        timestamp: time,
        raw: {
          temperature: o.temperatureC,
          humidity: o.relativeHumidityPct,
          pressure: o.pressureHpa,
        },
        features: o.features,
      }),
    });
    if (!res.ok) throw new Error(`Detection returned HTTP ${res.status}`);
    const text = await res.text();
    if (text.length > 131072)
      throw new Error("Detection response exceeds limit");
    const p = predictionSchema.parse(JSON.parse(text));
    if (
      p.station_id !== o.stationId ||
      new Date(p.timestamp).toISOString() !== time
    )
      throw new Error("Detection response identity mismatch");
    return p;
  };
}
export const policyVersion = "backend-evidence-v1";
export async function assess(
  runId: string,
  time: string,
  o: Observation | undefined,
  stationId: string,
  predict: Predictor,
): Promise<Assessment> {
  const base: Assessment = {
    id: randomUUID(),
    runId,
    stationId,
    observedAt: time,
    processingStatus: "completed",
    verdict: "insufficient_data",
    anomalyScore: null,
    severity: "unknown",
    evidenceStrength: "limited",
    suspectedCategory: null,
    affectedChannels: [],
    evidence: [],
    explanation:
      "No complete engineered feature row is available. Raw data is retained; the unchanged ML service requires features.",
    modelVersion: null,
    policyVersion,
    featureVersion: "existing-csv-v2",
  };
  if (!o) {
    return {
      ...base,
      suspectedCategory: "missing_observation",
      evidence: [
        {
          code: "missing_slot",
          detail: "Expected station is absent from this event-time batch.",
        },
      ],
      explanation:
        "Expected observation is absent. This does not confirm a hardware fault.",
    };
  }
  const evidence: Evidence[] = [];
  const channels = [
    ["temperature", o.temperatureC, -80, 60, "degC"],
    ["humidity", o.relativeHumidityPct, 0, 100, "percent"],
    ["pressure", o.pressureHpa, 800, 1100, "hPa"],
  ] as const;
  for (const [channel, value, min, max, unit] of channels) {
    if (value === null)
      evidence.push({
        code: "missing_channel",
        channel,
        detail: `${channel} is unavailable.`,
      });
    else if (value < min || value > max)
      evidence.push({
        code: "range",
        channel,
        value,
        unit,
        detail: `Outside prototype range ${min} to ${max} ${unit}.`,
      });
  }
  for (const [channel, key, threshold, unit] of [
    ["temperature", "temp_rate", 8, "degC"],
    ["humidity", "humidity_rate", 25, "percentage points"],
    ["pressure", "pressure_rate", 8, "hPa"],
  ] as const) {
    const value = o.features?.[key];
    if (value != null && Math.abs(value) > threshold)
      evidence.push({
        code: "step",
        channel,
        value,
        unit,
        detail: `Difference exceeds prototype ${threshold} ${unit} per hourly sample.`,
      });
  }
  if (!o.features || Object.values(o.features).some((v) => v === null))
    return {
      ...base,
      evidence,
      affectedChannels: [
        ...new Set(evidence.flatMap((e) => (e.channel ? [e.channel] : []))),
      ],
    };
  const p = await predict(o, time);
  if (o.features.persistence_flag)
    evidence.push({
      code: "persistence",
      detail:
        "Existing feature row flags persistence; its aggregate flag does not identify a channel.",
    });
  if (o.features.duplicate_flag)
    evidence.push({
      code: "source_duplicate",
      detail:
        "Source dataset contains a duplicate station/time row; this is not an HTTP retry.",
    });
  const affected = [
    ...new Set(evidence.flatMap((e) => (e.channel ? [e.channel] : []))),
  ];
  const corroborated = evidence.some((e) =>
    ["range", "step", "missing_channel", "persistence"].includes(e.code),
  );
  const verdict =
    p.anomaly_score > 0.5
      ? corroborated
        ? "suspected_fault"
        : "uncertain"
      : corroborated
        ? "uncertain"
        : "normal";

  const rootCause = determineRootCauseAndExplanation(
    verdict,
    p.anomaly_score,
    evidence,
    affected,
    p,
    o,
  );

  return {
    ...base,
    verdict,
    anomalyScore: p.anomaly_score,
    severity: rootCause.severity,
    evidenceStrength: corroborated ? "moderate" : "limited",
    suspectedCategory: rootCause.category,
    affectedChannels: affected,
    evidence,
    modelVersion: p.model_version,
    prediction: p,
    explanation: rootCause.explanation,
  };
}

function determineRootCauseAndExplanation(
  verdict: string,
  anomalyScore: number,
  evidence: Evidence[],
  affectedChannels: string[],
  prediction: Prediction,
  o: Observation,
): {
  category: string | null;
  explanation: string;
  severity: "none" | "low" | "medium" | "high" | "unknown";
} {
  if (verdict === "normal") {
    return {
      category: null,
      severity: "none",
      explanation: `Observation is statistically and physically consistent across channels (anomaly score: ${anomalyScore.toFixed(3)} <= 0.50 threshold). No sensor fault suspected.`,
    };
  }

  // 1. Hardware / communication dropouts
  if (
    evidence.some(
      (e) => e.code === "missing_channel" || e.code === "missing_slot",
    ) ||
    o.features?.missing_flag
  ) {
    return {
      category: "communication_failure",
      severity: "high",
      explanation:
        "Data dropout detected: one or more channels failed to report telemetry. Hardware or telemetry transmission failure suspected. Raw state preserved.",
    };
  }

  // 2. Frozen sensor persistence
  if (
    evidence.some((e) => e.code === "persistence") ||
    o.features?.persistence_flag
  ) {
    const ch =
      affectedChannels.length > 0
        ? `${affectedChannels.join(", ")} channel`
        : "sensor channel";
    return {
      category: "frozen_sensor",
      severity: "medium",
      explanation: `Sensor freeze detected: ${ch} repeated identical values across consecutive hourly samples (persistence check violation). Sensor stuck or ADC locked.`,
    };
  }

  // 3. Out-of-range sensor readings
  if (evidence.some((e) => e.code === "range")) {
    const ch = affectedChannels[0] ?? "sensor";
    return {
      category: `${ch}_sensor_fault`,
      severity: "high",
      explanation: `Physical range violation on ${ch}: reading lies outside plausible atmospheric bounds. Hardware malfunction or electrical spike suspected.`,
    };
  }

  // 4. Sudden rate jumps (step check)
  if (evidence.some((e) => e.code === "step")) {
    const ch = affectedChannels[0] ?? "sensor";
    return {
      category: `${ch}_sensor_fault`,
      severity: "medium",
      explanation: `Sudden rate jump on ${ch}: value changed beyond physical step thresholds in a single hourly interval without peer corroboration. Isolated channel fault suspected.`,
    };
  }

  // 5. Uncertain / Ambiguous verdict handling (prevent premature hardware fault attribution)
  if (verdict === "uncertain") {
    const spTemp = o.features?.spatial_temp_deviation;
    const spPres = o.features?.spatial_pressure_deviation;
    const isPeerSupported =
      spTemp !== null &&
      spTemp !== undefined &&
      Math.abs(spTemp) < 5.0 &&
      spPres !== null &&
      spPres !== undefined &&
      Math.abs(spPres) < 3.5;

    if (isPeerSupported) {
      return {
        category: "likely_meteorological_event",
        severity: "low",
        explanation: `Statistically unusual atmospheric shift detected (anomaly score: ${anomalyScore.toFixed(3)}), but peer stations corroborate similar conditions without isolated sensor breakaway. Likely genuine regional weather event.`,
      };
    }

    return {
      category: "transient_anomaly",
      severity: "low",
      explanation: `Subtle statistical or physical deviation observed (anomaly score: ${anomalyScore.toFixed(3)}), but corroborating physical or spatial evidence remains limited. Flagged for operational monitoring without raising high-severity alarm.`,
    };
  }

  // 6. SHAP & multi-channel feature contributions for confirmed faults
  const topFeatures = Object.entries(prediction.feature_contributions || {}).sort(
    (a, b) => b[1] - a[1],
  );
  const topFeat = topFeatures[0]?.[0] ?? "";

  if (topFeat.includes("residual") || topFeat === "multivariate_physical_residual") {
    return {
      category: "calibration_drift",
      severity: "medium",
      explanation:
        "Physical relationship contradiction: temperature and humidity/pressure residuals diverge significantly from historical atmospheric baseline. Gradual sensor calibration drift suspected.",
    };
  }

  if (topFeat.startsWith("temp") || topFeat === "spatial_temp_deviation") {
    return {
      category: "temperature_sensor_fault",
      severity: "medium",
      explanation:
        "Isolated temperature channel anomaly: thermal rate and spatial deviation diverge from local peer stations while humidity and pressure remain stable.",
    };
  }

  if (
    topFeat.startsWith("pressure") ||
    topFeat === "spatial_pressure_deviation" ||
    topFeat === "sustained_pressure_offset"
  ) {
    const isSustained =
      topFeat === "sustained_pressure_offset" ||
      !evidence.some((e) => e.code === "step");
    return {
      category: "pressure_sensor_fault",
      severity: "medium",
      explanation: isSustained
        ? "Sustained barometric displacement: pressure remains substantially displaced from the station's expected temporal baseline while neighboring stations remain stable. Isolated pressure sensor plateau fault suspected."
        : "Isolated barometric sensor anomaly: pressure rate diverges from local peer stations while thermal channels remain stable.",
    };
  }

  if (topFeat.startsWith("humidity") || topFeat === "spatial_humidity_deviation") {
    return {
      category: "humidity_sensor_fault",
      severity: "medium",
      explanation:
        "Isolated hygrometric sensor anomaly: relative humidity diverges sharply from local atmospheric baseline.",
    };
  }

  return {
    category: "transient_anomaly",
    severity: "low",
    explanation: `Unusual multi-channel pattern detected (anomaly score: ${anomalyScore.toFixed(3)}). Corroborating evidence is limited; review required.`,
  };
}
