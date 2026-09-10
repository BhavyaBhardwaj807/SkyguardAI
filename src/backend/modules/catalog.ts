import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { parse } from "csv-parse/sync";
import {
  featureNames,
  type Features,
  type Observation,
  type Station,
} from "../../contracts/index.js";
export type Frame = {
  observedAt: string;
  observations: Observation[];
  tags: string[];
};
export type Scenario = {
  id: string;
  label: string;
  start: number;
  end: number;
};
export type Catalog = {
  stations: Station[];
  frames: Frame[];
  clean: Frame[];
  scenarios: Scenario[];
  version: string;
  evaluation: any;
};
const numeric = (v: string) => (v === "" ? null : Number(v));
// The existing acquisition script explicitly requests Asia/Kolkata. Never append Z to naive source times.
export const sourceTime = (v: string) =>
  new Date(v.replace(" ", "T") + "+05:30").toISOString();
export async function loadCatalog(root: string): Promise<Catalog> {
  const raw = await readFile(`${root}/data/features.csv`, "utf8");
  const rows = parse(raw, { columns: true, skip_empty_lines: true }) as Record<
    string,
    string
  >[];
  const cleanRows = parse(
    await readFile(`${root}/data/clean_stations.csv`, "utf8"),
    { columns: true, skip_empty_lines: true },
  ) as Record<string, string>[];
  const stationMap = new Map<string, Station>();
  const build = (input: Record<string, string>[], includeFeatures: boolean) => {
    const frames = new Map<string, Frame>();
    for (const r of input) {
      stationMap.set(r.station_id, {
        stationId: r.station_id,
        name: r.station_name,
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        pressureReference: "surface",
        sourceKind: "modelled",
        sourceTimezone: "Asia/Kolkata",
      });
      const observedAt = sourceTime(r.timestamp);
      let f = frames.get(observedAt);
      if (!f) {
        f = { observedAt, observations: [], tags: [] };
        frames.set(observedAt, f);
      }
      // Preserve the source file unchanged. Canonical replay selects the first source row for duplicate keys.
      if (f.observations.some((o) => o.stationId === r.station_id)) continue;
      const o: Observation = {
        stationId: r.station_id,
        temperatureC: numeric(r.temperature_c),
        pressureHpa: numeric(r.pressure_hpa),
        relativeHumidityPct: numeric(r.humidity_pct),
      };
      if (includeFeatures)
        o.features = {
          ...Object.fromEntries(
            featureNames.map((k) => [k, numeric(r[k] ?? "")]),
          ),
          persistence_flag: r.persistence_flag?.toLowerCase() === "true",
          missing_flag: r.missing_flag?.toLowerCase() === "true",
          duplicate_flag: r.duplicate_flag?.toLowerCase() === "true",
        } as Features;
      f.observations.push(o);
      f.tags.push(r.anomaly_type || "normal", r.scenario_tag || "baseline");
    }
    return [...frames.values()].sort((a, b) =>
      a.observedAt.localeCompare(b.observedAt),
    );
  };
  const frames = build(rows, true),
    clean = build(cleanRows, false);
  const scenarios: Scenario[] = [
    {
      id: "full",
      label: "Full existing feature replay",
      start: 24,
      end: frames.length,
    },
  ];
  for (const [id, pattern] of [
    ["spike", "spike"],
    ["stuck", "stuck"],
    ["drift", "drift"],
    ["missing", "communication_gap"],
    ["regional", "regional_event"],
  ] as const) {
    const i = frames.findIndex(
      (f, j) => j >= 24 && f.tags.some((t) => t.includes(pattern)),
    );
    if (i >= 0)
      scenarios.push({
        id,
        label: `Existing ${id} window (may contain other injections)`,
        start: Math.max(24, i - 2),
        end: Math.min(frames.length, i + 25),
      });
  }
  const metadata = JSON.parse(
    await readFile(`${root}/ml-service/models/metadata.json`, "utf8"),
  );
  const summary = JSON.parse(
    await readFile(`${root}/ml-service/models/evaluation_summary.json`, "utf8"),
  );
  return {
    stations: [...stationMap.values()],
    frames,
    clean,
    scenarios,
    version: createHash("sha256").update(raw).digest("hex"),
    evaluation: {
      modelVersion: metadata.model_version,
      metrics: metadata.metrics,
      multiSeedSummary: summary,
      regionalTest: {
        status:
          metadata.metrics.regional_event_total > 0
            ? "reported"
            : "not_evaluated",
        sampleCount: metadata.metrics.regional_event_total,
        falsePositives: metadata.metrics.regional_event_fps,
      },
      limitations: [
        "Existing offline features include full-dataset residual fitting and original pre-injection values.",
        "Geographically distant modelled locations are not a validated local sensor network.",
        "Saved metrics are historical artifacts, not independently reproduced by this backend.",
      ],
    },
  };
}
