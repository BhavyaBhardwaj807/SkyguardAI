import { randomUUID } from "node:crypto";
import {
  predictionSchema,
  type Assessment,
  type Observation,
  type Prediction,
  type Evidence,
} from "../../contracts/index.js";
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
  const severity = evidence.some((e) => e.code === "range")
    ? "high"
    : evidence.some((e) =>
          ["step", "missing_channel", "persistence"].includes(e.code),
        )
      ? "medium"
      : verdict === "normal"
        ? "none"
        : "unknown";
  return {
    ...base,
    verdict,
    anomalyScore: p.anomaly_score,
    severity,
    evidenceStrength: corroborated ? "moderate" : "limited",
    suspectedCategory:
      evidence[0]?.code ?? (verdict === "normal" ? null : "unusual_pattern"),
    affectedChannels: affected,
    evidence,
    modelVersion: p.model_version,
    prediction: p,
    explanation: evidence.length
      ? evidence.map((e) => e.detail).join(" ") +
        " Findings are indicative, not a confirmed sensor diagnosis."
      : verdict === "normal"
        ? "Score is below the existing 0.50 demo threshold; this is not proof of sensor health."
        : "Unusual model score without sufficient independent channel evidence. Review required.",
  };
}
