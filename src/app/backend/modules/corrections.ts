import { randomUUID } from "node:crypto";
import type {
  Assessment,
  Observation,
  Station,
} from "../../../contracts/index.js";
import type { Queryable } from "../db/database.js";
export function distance(a: Station, b: Station) {
  const rad = Math.PI / 180,
    dlat = (b.latitude - a.latitude) * rad,
    dlon = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(a.latitude * rad) *
      Math.cos(b.latitude * rad) *
      Math.sin(dlon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
export async function proposeCorrections(
  q: Queryable,
  results: Assessment[],
  observations: Observation[],
  stations: Station[],
) {
  for (const a of results.filter((a) => a.verdict === "suspected_fault"))
    for (const channel of a.affectedChannels) {
      const field =
        channel === "temperature"
          ? "temperatureC"
          : channel === "pressure"
            ? "pressureHpa"
            : "relativeHumidityPct";
      const station = stations.find((s) => s.stationId === a.stationId)!;
      const neighbors = results
        .filter((r) => r.stationId !== a.stationId && r.verdict === "normal")
        .map((r) => {
          const s = stations.find((s) => s.stationId === r.stationId)!;
          const o = observations.find((o) => o.stationId === r.stationId)!;
          return {
            stationId: r.stationId,
            distance: distance(station, s),
            value: o?.[field],
          };
        })
        .filter((n) => n.distance > 0 && n.distance <= 100 && n.value != null)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3);
      // Surface pressure is elevation dependent; the existing metadata lacks elevation. Do not estimate it.
      const available = channel !== "pressure" && neighbors.length >= 3;
      const estimate = available
        ? neighbors.reduce((s, n) => s + n.value! / n.distance, 0) /
          neighbors.reduce((s, n) => s + 1 / n.distance, 0)
        : null;
      const result = {
        channel,
        rawValue:
          observations.find((o) => o.stationId === a.stationId)?.[field] ??
          null,
        estimate,
        method: "inverse_distance_current_batch_v1",
        status: available ? "review_required" : "unavailable",
        evidenceStrength: "limited",
        neighbors: available ? neighbors : [],
        reason: available
          ? "Prototype spatial estimate requires human review."
          : channel === "pressure"
            ? "Surface-pressure correction requires elevation-aware comparison."
            : "Fewer than three usable normal neighbors within 100 km.",
        policyVersion: "correction-v1",
      };
      await q.query(
        "INSERT INTO corrections(id,assessment_id,run_id,station_id,channel,result) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING",
        [
          randomUUID(),
          a.id,
          a.runId,
          a.stationId,
          channel,
          JSON.stringify(result),
        ],
      );
    }
}
