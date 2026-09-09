import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import request from "supertest";
import { readFile } from "node:fs/promises";
import { application } from "../../src/app/backend/application.js";
import type { Database, Queryable } from "../../src/app/backend/db/database.js";
import { ingest } from "../../src/app/backend/modules/ingestion.js";
import {
  assess,
  predictionClient,
} from "../../src/app/backend/modules/detection.js";
import { processOne, recover } from "../../src/app/backend/worker.js";
import { schedule, createRun } from "../../src/app/backend/modules/replay.js";
import {
  loadCatalog,
  sourceTime,
  type Catalog,
} from "../../src/app/backend/modules/catalog.js";
import { Events } from "../../src/app/backend/events.js";
import { featureNames, type Observation } from "../../src/contracts/index.js";
import { createServer } from "node:http";
const pg = new PGlite();
let tail = Promise.resolve();
const db: Database = {
  query: async (s, v) => {
    const r = await pg.query(s, v);
    return { rows: r.rows as any[] };
  },
  close: () => pg.close(),
  async transaction(fn) {
    const previous = tail;
    let release!: () => void;
    tail = new Promise((r) => {
      release = r;
    });
    await previous;
    try {
      return await pg.transaction(async (tx) =>
        fn({
          query: async (s, v) => {
            const r = await tx.query(s, v);
            return { rows: r.rows as any[] };
          },
        }),
      );
    } finally {
      release();
    }
  },
};
const events = new Events();
const observation: Observation = {
  stationId: "AWS001",
  temperatureC: 25,
  relativeHumidityPct: 60,
  pressureHpa: 1000,
  features: {
    ...Object.fromEntries(featureNames.map((k) => [k, 1])),
    persistence_flag: false,
    missing_flag: false,
    duplicate_flag: false,
  } as any,
};
const prediction = async (o: Observation, t: string) => ({
  station_id: o.stationId,
  timestamp: t,
  anomaly_score: 0.1,
  raw_isolation_score: 0.1,
  feature_contributions: { temp_rate: 0.2 },
  model_version: "test-model",
});
const station = {
  stationId: "AWS001",
  name: "Fixture",
  latitude: 28,
  longitude: 77,
  pressureReference: "surface",
  sourceKind: "modelled",
  sourceTimezone: "Asia/Kolkata",
} as const;
const catalog: Catalog = {
  stations: [station],
  version: "test",
  frames: [
    {
      observedAt: "2026-07-10T00:00:00.000Z",
      observations: [observation],
      tags: [],
    },
  ],
  clean: [],
  scenarios: [{ id: "full", label: "test", start: 0, end: 1 }],
  evaluation: { regionalTest: { status: "not_evaluated" } },
};
const app = application({
  db,
  catalog,
  events,
  origin: "http://localhost:3000",
  detectionHealth: async () => false,
});
const batch = (extra: Record<string, unknown> = {}) => ({
  runId: "run1",
  batchId: "batch1",
  observedAt: "2026-07-10T00:00:00Z",
  expectedStationIds: ["AWS001"],
  absentStationIds: [],
  observations: [observation],
  ...extra,
});
before(async () => {
  await pg.exec(await readFile("src/app/backend/db/schema.sql", "utf8"));
});
beforeEach(async () => {
  await pg.exec(
    "TRUNCATE audit_events,corrections,assessments,jobs,observations,batches,runs,stations RESTART IDENTITY CASCADE",
  );
  await db.query("INSERT INTO stations VALUES($1,$2)", [
    station.stationId,
    JSON.stringify(station),
  ]);
  await db.query(
    "INSERT INTO runs(id,scenario,dataset_version) VALUES($1,$2,$3)",
    ["run1", "full", "test"],
  );
});
after(async () => {
  events.close();
  await db.close();
});
test("Concurrent identical retries produce one durable batch/job; conflicting payload cannot overwrite raw", async () => {
  const [a, b] = await Promise.all([ingest(db, batch()), ingest(db, batch())]);
  assert.equal(a.jobId, b.jobId);
  assert.equal(b.duplicate, true);
  await assert.rejects(
    () =>
      ingest(
        db,
        batch({ observations: [{ ...observation, temperatureC: 99 }] }),
      ),
    { code: "BATCH_CONFLICT" },
  );
  assert.equal((await db.query("SELECT * FROM batches")).rows.length, 1);
  assert.equal(
    (await db.query("SELECT raw FROM observations")).rows[0].raw.temperatureC,
    25,
  );
});
test("Prediction completion is atomic and does not generate duplicate assessments", async () => {
  await ingest(db, batch());
  await processOne(db, catalog, prediction, events);
  await processOne(db, catalog, prediction, events);
  assert.equal((await db.query("SELECT * FROM assessments")).rows.length, 1);
  assert.equal(
    (await db.query("SELECT state FROM jobs")).rows[0].state,
    "completed",
  );
});
test("Detection outage preserves raw, pauses run after bounded failure, supports explicit retry", async () => {
  const receipt = await ingest(db, batch());
  await processOne(
    db,
    catalog,
    async () => {
      throw new Error("offline");
    },
    events,
    1,
  );
  assert.equal(
    (await db.query("SELECT state FROM runs")).rows[0].state,
    "failed",
  );
  assert.equal((await db.query("SELECT * FROM observations")).rows.length, 1);
  assert.equal((await db.query("SELECT * FROM assessments")).rows.length, 0);
  await request(app)
    .post(`/api/v1/jobs/${receipt.jobId}/retry`)
    .send({})
    .expect(202);
  await processOne(db, catalog, prediction, events);
  assert.equal(
    (await db.query("SELECT state FROM jobs")).rows[0].state,
    "completed",
  );
  assert.equal((await db.query("SELECT * FROM audit_events")).rows.length, 1);
});
test("Interrupted processing is reclaimed and evaluated once after restart", async () => {
  await ingest(db, batch());
  await db.query("UPDATE jobs SET state='processing',attempts=1");
  await recover(db);
  await processOne(db, catalog, prediction, events);
  assert.equal((await db.query("SELECT * FROM assessments")).rows.length, 1);
});
test("Missing slots and raw-only readings do not call model or fabricate values", async () => {
  let calls = 0;
  await ingest(db, batch({ observations: [], absentStationIds: ["AWS001"] }));
  await processOne(
    db,
    catalog,
    async (o, t) => {
      calls++;
      return prediction(o, t);
    },
    events,
  );
  assert.equal(calls, 0);
  assert.equal((await db.query("SELECT * FROM observations")).rows.length, 0);
  assert.equal(
    (await db.query("SELECT result FROM assessments")).rows[0].result.verdict,
    "insufficient_data",
  );
  const result = await assess(
    "run1",
    "2026-07-10T00:00:00.000Z",
    { ...observation, features: undefined },
    "AWS001",
    prediction,
  );
  assert.equal(result.anomalyScore, null);
});
test("Input validation rejects inconsistent batches, unknown stations, and hidden label fields", async () => {
  await request(app)
    .post("/api/v1/observation-batches")
    .send(batch({ absentStationIds: ["AWS001"] }))
    .expect(422);
  await request(app)
    .post("/api/v1/observation-batches")
    .send(batch({ injectedType: "spike" }))
    .expect(422);
  await request(app)
    .post("/api/v1/observation-batches")
    .send(
      batch({
        expectedStationIds: ["unknown"],
        observations: [],
        absentStationIds: ["unknown"],
      }),
    )
    .expect(422);
  assert.equal((await db.query("SELECT * FROM batches")).rows.length, 0);
});
test("Backpressure and chronological ordering prevent inconsistent replay", async () => {
  await ingest(db, batch());
  await assert.rejects(
    () =>
      ingest(
        db,
        batch({ batchId: "batch2", observedAt: "2026-07-10T01:00:00Z" }),
      ),
    { code: "BACKPRESSURE" },
  );
  await processOne(db, catalog, prediction, events);
  await assert.rejects(
    () =>
      ingest(
        db,
        batch({ batchId: "late", observedAt: "2026-07-09T23:00:00Z" }),
      ),
    { code: "OUT_OF_ORDER" },
  );
});
test("Run reset preserves old observations and allows same event time independently", async () => {
  await ingest(db, batch());
  const r = await createRun(db, catalog, "full");
  await ingest(db, batch({ runId: r.id }));
  assert.equal((await db.query("SELECT * FROM observations")).rows.length, 2);
});
test("Step schedules exactly one batch, persists position and pauses", async () => {
  await request(app)
    .post("/api/v1/replay/runs/run1/control")
    .send({ action: "step" })
    .expect(200);
  await schedule(db, catalog);
  await schedule(db, catalog);
  assert.equal((await db.query("SELECT * FROM batches")).rows.length, 1);
  const r = (await db.query("SELECT * FROM runs")).rows[0];
  assert.equal(r.state, "paused");
  assert.equal(r.position, 1);
});
test("Queries expose degraded readiness, unknown IDs, bounded ranges and empty health honestly", async () => {
  const r = await request(app).get("/readyz").expect(200);
  assert.equal(r.body.status, "degraded");
  await request(app).get("/api/v1/jobs/unknown").expect(404);
  await request(app)
    .get(
      "/api/v1/stations/AWS001/history?runId=run1&from=2026-01-01T00:00:00Z&to=2026-07-01T00:00:00Z",
    )
    .expect(422);
  const h = await request(app)
    .get("/api/v1/stations/AWS001/health?runId=run1")
    .expect(200);
  assert.equal(h.body.status, "insufficient_data");
});
test("Cross-origin mutations and configured token failures are rejected", async () => {
  await request(app)
    .post("/api/v1/replay/runs")
    .set("Origin", "https://other.example")
    .send({ scenarioId: "full" })
    .expect(403);
  const protectedApp = application({
    db,
    catalog,
    events,
    origin: "http://localhost:3000",
    mutationToken: "test",
    detectionHealth: async () => true,
  });
  await request(protectedApp)
    .post("/api/v1/replay/runs")
    .send({ scenarioId: "full" })
    .expect(401);
});
test("Catalog retains provenance, converts timezone and labels empty regional evaluation", async () => {
  assert.equal(sourceTime("2026-07-09 00:00:00"), "2026-07-08T18:30:00.000Z");
  const c = await loadCatalog(process.cwd());
  assert.equal(c.stations.length, 6);
  assert.equal(c.frames.length, 1440);
  assert.equal(c.evaluation.regionalTest.status, "not_evaluated");
  assert.ok(c.scenarios.some((s) => s.id === "spike"));
  assert.ok(
    !JSON.stringify(c.frames[30].observations).includes("anomaly_label"),
  );
});
test("HTTP model adapter rejects wrong identities and limits hanging calls", async () => {
  const server = createServer((_req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        station_id: "wrong",
        timestamp: "2026-07-10T00:00:00Z",
        anomaly_score: 0.4,
        raw_isolation_score: 0.1,
        feature_contributions: {},
        model_version: "test",
      }),
    );
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const address = server.address() as { port: number };
  try {
    await assert.rejects(
      () =>
        predictionClient(`http://127.0.0.1:${address.port}`, 1000)(
          observation,
          "2026-07-10T00:00:00.000Z",
        ),
      /identity mismatch/,
    );
  } finally {
    server.close();
  }
  const slow = createServer(() => {});
  await new Promise<void>((r) => slow.listen(0, "127.0.0.1", r));
  try {
    await assert.rejects(() =>
      predictionClient(
        `http://127.0.0.1:${(slow.address() as { port: number }).port}`,
        50,
      )(observation, "2026-07-10T00:00:00.000Z"),
    );
  } finally {
    slow.closeAllConnections();
    slow.close();
  }
});
test("SSE clients receive post-commit updates and reconnect with explicit resync", async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.on("listening", r));
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/v1/events?runId=run1`;
  const abort = new AbortController();
  const response = await fetch(url, { signal: abort.signal });
  assert.match(response.headers.get("content-type")!, /text\/event-stream/);
  const reader = response.body!.getReader();
  const decode = new TextDecoder();
  assert.match(decode.decode((await reader.read()).value), /resyncRequired/);
  await ingest(db, batch());
  await processOne(db, catalog, prediction, events);
  assert.match(decode.decode((await reader.read()).value), /batch.processed/);
  assert.equal((await db.query("SELECT * FROM assessments")).rows.length, 1);
  abort.abort();
  await reader.cancel().catch(() => {});
  const second = new AbortController();
  const r2 = await fetch(url, { signal: second.signal });
  const rd = r2.body!.getReader();
  assert.match(decode.decode((await rd.read()).value), /resyncRequired/);
  second.abort();
  await rd.cancel().catch(() => {});
  events.close();
  server.closeAllConnections();
  await new Promise<void>((r) => server.close(() => r()));
});
test("Correction review is audited and never overwrites observations", async () => {
  await ingest(
    db,
    batch({ observations: [{ ...observation, temperatureC: 90 }] }),
  );
  await processOne(
    db,
    catalog,
    async (o, t) => ({ ...(await prediction(o, t)), anomaly_score: 0.95 }),
    events,
  );
  const row = (await db.query("SELECT * FROM corrections")).rows[0];
  assert.equal(row.result.status, "unavailable");
  await request(app)
    .post(`/api/v1/corrections/${row.id}/review`)
    .send({ decision: "accepted" })
    .expect(409);
  await request(app)
    .post(`/api/v1/corrections/${row.id}/review`)
    .send({ decision: "rejected" })
    .expect(200);
  await request(app)
    .post(`/api/v1/corrections/${row.id}/review`)
    .send({ decision: "rejected" })
    .expect(409);
  assert.equal(
    (await db.query("SELECT raw FROM observations")).rows[0].raw.temperatureC,
    90,
  );
  assert.equal(
    (await db.query("SELECT kind FROM audit_events")).rows[0].kind,
    "correction.review",
  );
});
test("Restart cannot exceed a spent automatic attempt budget", async () => {
  await ingest(db, batch());
  await db.query("UPDATE jobs SET state='processing',attempts=3");
  await recover(db, 3);
  assert.equal(
    (await db.query("SELECT state FROM jobs")).rows[0].state,
    "failed",
  );
  assert.equal(
    (await db.query("SELECT state FROM runs")).rows[0].state,
    "failed",
  );
});
