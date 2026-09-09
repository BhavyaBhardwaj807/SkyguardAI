import { z } from "zod";
export const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
export const instant = z.iso
  .datetime({ offset: true })
  .transform((v) => new Date(v).toISOString());
const number = z.number().finite();
export const featureNames = [
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
] as const;
export const featuresSchema = z
  .object(
    Object.fromEntries(
      featureNames.map((k) => [k, number.nullable()]),
    ) as Record<(typeof featureNames)[number], z.ZodNullable<z.ZodNumber>>,
  )
  .extend({
    persistence_flag: z.boolean(),
    missing_flag: z.boolean(),
    duplicate_flag: z.boolean(),
  })
  .strict();
export const observationSchema = z
  .object({
    stationId: id,
    temperatureC: number.nullable(),
    relativeHumidityPct: number.nullable(),
    pressureHpa: number.nullable(),
    features: featuresSchema.optional(),
  })
  .strict();
export const batchSchema = z
  .object({
    runId: id,
    batchId: id,
    observedAt: instant,
    expectedStationIds: z.array(id).min(1).max(20),
    absentStationIds: z.array(id).max(20),
    observations: z.array(observationSchema).max(20),
  })
  .strict()
  .superRefine((b, c) => {
    const expected = new Set(b.expectedStationIds),
      present = b.observations.map((o) => o.stationId),
      all = [...present, ...b.absentStationIds];
    if (
      expected.size !== b.expectedStationIds.length ||
      new Set(all).size !== all.length ||
      all.length !== expected.size ||
      all.some((s) => !expected.has(s))
    )
      c.addIssue({
        code: "custom",
        message:
          "Observed and absent stations must partition the unique expected stations",
      });
  });
export type Batch = z.infer<typeof batchSchema>;
export type Observation = z.infer<typeof observationSchema>;
export type Features = z.infer<typeof featuresSchema>;
export type Station = {
  stationId: string;
  name: string;
  latitude: number;
  longitude: number;
  pressureReference: "surface";
  sourceKind: "modelled";
  sourceTimezone: string;
};
export const predictionSchema = z.object({
  station_id: id,
  timestamp: z.string(),
  anomaly_score: number.min(0).max(1),
  raw_isolation_score: number,
  feature_contributions: z.record(z.string(), number.nonnegative()),
  model_version: z.string().min(1).max(200),
});
export type Prediction = z.infer<typeof predictionSchema>;
export type Evidence = {
  code: string;
  channel?: string;
  value?: number;
  unit?: string;
  detail: string;
};
export type Assessment = {
  id: string;
  runId: string;
  stationId: string;
  observedAt: string;
  verdict: "normal" | "suspected_fault" | "uncertain" | "insufficient_data";
  anomalyScore: number | null;
  severity: "none" | "low" | "medium" | "high" | "unknown";
  evidenceStrength: "limited" | "moderate";
  suspectedCategory: string | null;
  affectedChannels: string[];
  evidence: Evidence[];
  explanation: string;
  modelVersion: string | null;
  policyVersion: string;
  featureVersion: string;
  processingStatus: "completed";
  prediction?: Prediction;
};
