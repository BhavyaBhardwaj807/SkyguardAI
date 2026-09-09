import type { Database } from "../db/database.js";
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const mean = (a: number[]) => a.reduce((s, n) => s + n, 0) / a.length;
const variance = (a: number[]) => {
  const m = mean(a);
  return mean(a.map((n) => (n - m) ** 2));
};
export async function sensorHealth(
  db: Database,
  runId: string,
  stationId: string,
) {
  const run = (
    await db.query("SELECT last_observed_at FROM runs WHERE id=$1", [runId])
  ).rows[0];
  if (!run?.last_observed_at)
    return { status: "insufficient_data", channels: [] };
  const end = new Date(run.last_observed_at).getTime(),
    start = new Date(end - 30 * 86400000);
  const rows = (
    await db.query(
      "SELECT observed_at,raw FROM observations WHERE run_id=$1 AND station_id=$2 AND observed_at>$3 AND observed_at<=$4 ORDER BY observed_at",
      [runId, stationId, start, new Date(end)],
    )
  ).rows;
  const assessments = (
    await db.query(
      "SELECT observed_at,result FROM assessments WHERE run_id=$1 AND station_id=$2 AND observed_at>$3 AND observed_at<=$4",
      [runId, stationId, new Date(end - 7 * 86400000), new Date(end)],
    )
  ).rows;
  return {
    asOf: new Date(end).toISOString(),
    formulaVersion: "handoff-health-v1",
    meaning:
      "Prototype data-quality indicator, not a hardware maintenance prediction",
    channels: (
      [
        ["temperature", "temperatureC", 3],
        ["humidity", "relativeHumidityPct", 15],
        ["pressure", "pressureHpa", 5],
      ] as const
    ).map(([channel, field, driftCap]) => {
      const baseline = rows
        .map((r) => r.raw[field])
        .filter((v): v is number => typeof v === "number");
      const week = rows.filter(
          (r) => new Date(r.observed_at).getTime() > end - 7 * 86400000,
        ),
        values = week
          .map((r) => r.raw[field])
          .filter((v): v is number => typeof v === "number");
      const channelEvidence = assessments.filter(
        (r) => r.result.verdict !== "insufficient_data",
      );
      const coverage = {
        baseline: baseline.length / 720,
        observations: values.length / 168,
        assessments: channelEvidence.length / 168,
      };
      // No assumed normal assessments for historical seed data, or unassessed gaps.
      if (
        coverage.baseline < 0.9 ||
        coverage.observations < 0.5 ||
        coverage.assessments < 0.9 ||
        values.length < 2 ||
        variance(baseline) === 0
      )
        return { channel, score: null, status: "insufficient_data", coverage };
      const day = channelEvidence.filter(
        (r) => new Date(r.observed_at).getTime() > end - 86400000,
      );
      const anomalyRate =
        day.filter(
          (r) =>
            r.result.verdict === "suspected_fault" &&
            r.result.affectedChannels.includes(channel),
        ).length / 24;
      let equal = 0,
        persist = 0;
      for (let i = 1; i < week.length; i++) {
        const a = week[i - 1],
          b = week[i];
        equal =
          b.raw[field] != null &&
          a.raw[field] === b.raw[field] &&
          new Date(b.observed_at).getTime() -
            new Date(a.observed_at).getTime() ===
            3600000
            ? equal + 1
            : 0;
        if (equal >= 5) persist++;
      }
      const inputs = {
        anomalyRate: clamp(anomalyRate),
        persistenceRate: clamp(persist / 168),
        drift: clamp(Math.abs(mean(values) - mean(baseline)) / driftCap),
        varianceChange: clamp(variance(values) / variance(baseline) - 1),
        missingRate: clamp(1 - values.length / 168),
      };
      const score =
        100 -
        30 * inputs.anomalyRate -
        25 * inputs.persistenceRate -
        20 * inputs.drift -
        15 * inputs.varianceChange -
        10 * inputs.missingRate;
      return {
        channel,
        score: Math.round(score * 100) / 100,
        status: "available",
        coverage,
        inputs,
        driftCap,
      };
    }),
  };
}
