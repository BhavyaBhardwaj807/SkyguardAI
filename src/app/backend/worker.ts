import type { Database } from "./db/database.js";
import type { Catalog } from "./modules/catalog.js";
import { assess, type Predictor } from "./modules/detection.js";
import type { Batch, Assessment } from "../../contracts/index.js";
import { proposeCorrections } from "./modules/corrections.js";
import { Events } from "./events.js";
export async function recover(db: Database, maxAttempts = 3) {
  await db.transaction(async (q) => {
    await q.query(
      "UPDATE jobs SET state='failed',error='Attempt budget exhausted during interrupted processing' WHERE state='processing' AND attempts >= $1",
      [maxAttempts],
    );
    await q.query(
      "UPDATE runs SET state='failed' WHERE id IN (SELECT run_id FROM jobs WHERE state='failed')",
    );
    await q.query(
      "UPDATE jobs SET state='pending',started_at=NULL,next_at=now() WHERE state='processing'",
    );
  });
}
export async function processOne(
  db: Database,
  catalog: Catalog,
  predict: Predictor,
  events: Events,
  maxAttempts = 3,
) {
  const job = await db.transaction(async (q) => {
    const j = (
      await q.query(
        "SELECT j.* FROM jobs j JOIN batches b ON b.id=j.batch_id WHERE j.state='pending' AND j.next_at<=now() ORDER BY b.observed_at,j.id LIMIT 1 FOR UPDATE OF j SKIP LOCKED",
      )
    ).rows[0];
    if (j)
      await q.query(
        "UPDATE jobs SET state='processing',attempts=attempts+1,started_at=now() WHERE id=$1",
        [j.id],
      );
    return j;
  });
  if (!job) return false;
  try {
    const batch = (
      await db.query("SELECT payload FROM batches WHERE id=$1", [job.batch_id])
    ).rows[0].payload as Batch;
    const results: Assessment[] = [];
    for (const id of batch.expectedStationIds)
      results.push(
        await assess(
          batch.runId,
          batch.observedAt,
          batch.observations.find((o) => o.stationId === id),
          id,
          predict,
        ),
      );
    await db.transaction(async (q) => {
      for (const a of results)
        await q.query(
          "INSERT INTO assessments(id,run_id,station_id,observed_at,batch_id,verdict,result) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(run_id,station_id,observed_at) DO NOTHING",
          [
            a.id,
            a.runId,
            a.stationId,
            a.observedAt,
            job.batch_id,
            a.verdict,
            JSON.stringify(a),
          ],
        );
      await proposeCorrections(
        q,
        results,
        batch.observations,
        catalog.stations,
      );
      await q.query(
        "UPDATE jobs SET state='completed',finished_at=now(),error=NULL WHERE id=$1",
        [job.id],
      );
    });
    events.emit("batch.processed", job.run_id, {
      batchId: job.batch_id,
      jobId: job.id,
    });
  } catch (e) {
    const final = job.attempts + 1 >= maxAttempts;
    const error = e instanceof Error ? e.message : "Processing failed";
    await db.transaction(async (q) => {
      await q.query(
        "UPDATE jobs SET state=$2,error=$3,next_at=$4 WHERE id=$1",
        [
          job.id,
          final ? "failed" : "pending",
          error.slice(0, 2000),
          new Date(Date.now() + 1000 * 2 ** job.attempts),
        ],
      );
      if (final)
        await q.query("UPDATE runs SET state='failed' WHERE id=$1", [
          job.run_id,
        ]);
    });
    events.emit("processing.failed", job.run_id, { jobId: job.id, final });
  }
  return true;
}
