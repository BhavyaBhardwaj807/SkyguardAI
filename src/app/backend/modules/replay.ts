import { randomUUID } from "node:crypto";
import type { Database } from "../db/database.js";
import type { Catalog } from "./catalog.js";
import { HttpError, ingestTx } from "./ingestion.js";
import { batchSchema } from "../../../contracts/index.js";
export async function createRun(
  db: Database,
  catalog: Catalog,
  scenarioId: string,
) {
  const scenario = catalog.scenarios.find((s) => s.id === scenarioId);
  if (!scenario)
    throw new HttpError(404, "SCENARIO_NOT_FOUND", "Unknown scenario");
  const id = randomUUID(),
    start = catalog.frames[scenario.start].observedAt;
  await db.transaction(async (q) => {
    await q.query(
      "INSERT INTO runs(id,scenario,dataset_version,position) VALUES($1,$2,$3,$4)",
      [id, scenario.id, catalog.version, scenario.start],
    );
    // Seed raw history only; historical rows never generate alerts. Clean history is explicitly disclosed in the manifest.
    const history = catalog.clean.filter(
      (f) =>
        f.observedAt < start &&
        new Date(f.observedAt).getTime() >=
          new Date(start).getTime() - 30 * 86400000,
    );
    const rows = history.flatMap((f) =>
      f.observations.map((o) => ({
        station_id: o.stationId,
        observed_at: f.observedAt,
        raw: o,
      })),
    );
    await q.query(
      `INSERT INTO observations(run_id,station_id,observed_at,raw,historical)
    SELECT $1,x.station_id,x.observed_at,x.raw,true FROM jsonb_to_recordset($2::jsonb) AS x(station_id text,observed_at timestamptz,raw jsonb)`,
      [id, JSON.stringify(rows)],
    );
  });
  return (await db.query("SELECT * FROM runs WHERE id=$1", [id])).rows[0];
}
export async function schedule(db: Database, catalog: Catalog) {
  const ids = (
    await db.query(
      "SELECT id FROM runs WHERE state IN ('running','stepping') AND next_at<=now() ORDER BY created_at",
    )
  ).rows;
  for (const row of ids)
    await db.transaction(async (q) => {
      const run = (
        await q.query("SELECT * FROM runs WHERE id=$1 FOR UPDATE", [row.id])
      ).rows[0];
      if (!["running", "stepping"].includes(run.state)) return;
      if (
        (
          await q.query(
            "SELECT id FROM jobs WHERE run_id=$1 AND state <> 'completed' LIMIT 1",
            [run.id],
          )
        ).rows.length
      )
        return;
      const scenario = catalog.scenarios.find((s) => s.id === run.scenario);
      if (!scenario || run.dataset_version !== catalog.version) {
        await q.query("UPDATE runs SET state='failed' WHERE id=$1", [run.id]);
        return;
      }
      if (run.position >= scenario.end) {
        await q.query("UPDATE runs SET state='completed' WHERE id=$1", [
          run.id,
        ]);
        return;
      }
      const frame = catalog.frames[run.position],
        expected = catalog.stations.map((s) => s.stationId);
      await ingestTx(
        q,
        batchSchema.parse({
          runId: run.id,
          batchId: `frame_${run.position}`,
          observedAt: frame.observedAt,
          expectedStationIds: expected,
          absentStationIds: expected.filter(
            (s) => !frame.observations.some((o) => o.stationId === s),
          ),
          observations: frame.observations,
        }),
      );
      await q.query(
        "UPDATE runs SET position=position+1,next_at=$2,state=CASE WHEN state='stepping' THEN 'paused' ELSE state END WHERE id=$1",
        [run.id, new Date(Date.now() + 1000 / run.speed)],
      );
    });
}
