import { createHash, randomUUID } from "node:crypto";
import { batchSchema, type Batch } from "../../../contracts/index.js";
import type { Database, Queryable } from "../db/database.js";
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
function canonical(v: any): string {
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  if (v !== null && typeof v === "object")
    return (
      "{" +
      Object.keys(v)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + canonical(v[k]))
        .join(",") +
      "}"
    );
  return JSON.stringify(v);
}
export async function ingest(db: Database, input: unknown) {
  const b = batchSchema.parse(input);
  return db.transaction((q) => ingestTx(q, b));
}
export async function ingestTx(q: Queryable, b: Batch) {
  const run = (
    await q.query("SELECT * FROM runs WHERE id=$1 FOR UPDATE", [b.runId])
  ).rows[0];
  if (!run) throw new HttpError(404, "RUN_NOT_FOUND", "Unknown run");
  const normalized = {
    ...b,
    expectedStationIds: [...b.expectedStationIds].sort(),
    absentStationIds: [...b.absentStationIds].sort(),
    observations: [...b.observations].sort((a, b) =>
      a.stationId.localeCompare(b.stationId),
    ),
  };
  const hash = createHash("sha256").update(canonical(normalized)).digest("hex");
  const existing = (
    await q.query(
      "SELECT b.*,j.id AS job_id,j.state FROM batches b JOIN jobs j ON j.batch_id=b.id WHERE b.run_id=$1 AND b.external_id=$2",
      [b.runId, b.batchId],
    )
  ).rows[0];
  if (existing) {
    if (existing.content_hash !== hash)
      throw new HttpError(
        409,
        "BATCH_CONFLICT",
        "Batch ID already has different content",
      );
    return {
      batchId: existing.id,
      jobId: existing.job_id,
      state: existing.state,
      duplicate: true,
    };
  }
  if (run.state === "completed" || run.state === "failed")
    throw new HttpError(409, "RUN_NOT_ACCEPTING", "Run is completed or failed");
  if (
    run.last_observed_at &&
    new Date(b.observedAt) <= new Date(run.last_observed_at)
  )
    throw new HttpError(
      409,
      "OUT_OF_ORDER",
      "Replay event time must increase; create a new run for revised data",
    );
  const active = (
    await q.query(
      "SELECT id FROM jobs WHERE run_id=$1 AND state IN ('pending','processing','failed') LIMIT 1",
      [b.runId],
    )
  ).rows;
  if (active.length)
    throw new HttpError(
      409,
      "BACKPRESSURE",
      "Finish or retry the previous batch first",
    );
  const known = (
    await q.query("SELECT id FROM stations WHERE id=ANY($1::text[])", [
      b.expectedStationIds,
    ])
  ).rows;
  if (known.length !== b.expectedStationIds.length)
    throw new HttpError(
      422,
      "UNKNOWN_STATION",
      "Batch contains unknown station IDs",
    );
  const batchId = randomUUID(),
    jobId = randomUUID();
  await q.query(
    "INSERT INTO batches(id,run_id,external_id,observed_at,content_hash,payload) VALUES($1,$2,$3,$4,$5,$6)",
    [batchId, b.runId, b.batchId, b.observedAt, hash, JSON.stringify(b)],
  );
  for (const o of b.observations)
    await q.query(
      "INSERT INTO observations(run_id,station_id,batch_id,observed_at,raw) VALUES($1,$2,$3,$4,$5)",
      [b.runId, o.stationId, batchId, b.observedAt, JSON.stringify(o)],
    );
  await q.query("INSERT INTO jobs(id,batch_id,run_id) VALUES($1,$2,$3)", [
    jobId,
    batchId,
    b.runId,
  ]);
  await q.query("UPDATE runs SET last_observed_at=$2 WHERE id=$1", [
    b.runId,
    b.observedAt,
  ]);
  return { batchId, jobId, state: "pending", duplicate: false };
}
