import express from "express";
import cors from "cors";
import helmet from "helmet";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Database } from "./db/database.js";
import type { Catalog } from "./modules/catalog.js";
import { id, instant } from "../../contracts/index.js";
import { HttpError, ingest } from "./modules/ingestion.js";
import { createRun } from "./modules/replay.js";
import { sensorHealth } from "./modules/health.js";
import { Events } from "./events.js";
export type AppOptions = {
  db: Database;
  catalog: Catalog;
  events: Events;
  origin: string;
  mutationToken?: string;
  detectionHealth: () => Promise<boolean>;
  log?: (data: Record<string, unknown>) => void;
};
export function application({
  db,
  catalog,
  events,
  origin,
  mutationToken,
  detectionHealth,
  log = () => {},
}: AppOptions) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin }));
  app.use((req, res, next) => {
    res.locals.requestId = randomUUID();
    res.setHeader("x-request-id", res.locals.requestId);
    const start = Date.now();
    res.on("finish", () =>
      log({
        requestId: res.locals.requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - start,
      }),
    );
    next();
  });
  app.use(express.json({ limit: "256kb", strict: true }));
  app.use((req, _res, next) => {
    if (["POST", "PATCH", "DELETE", "PUT"].includes(req.method)) {
      if (req.headers.origin && req.headers.origin !== origin)
        return next(
          new HttpError(
            403,
            "ORIGIN_REJECTED",
            "Mutation origin is not allowed",
          ),
        );
      if (
        mutationToken &&
        req.headers.authorization !== `Bearer ${mutationToken}`
      )
        return next(
          new HttpError(
            401,
            "UNAUTHORIZED",
            "A valid mutation token is required",
          ),
        );
    }
    next();
  });
  const runId = (req: express.Request) => id.parse(req.query.runId);
  async function requireRun(run: string) {
    if (!(await db.query("SELECT id FROM runs WHERE id=$1", [run])).rows.length)
      throw new HttpError(404, "RUN_NOT_FOUND", "Unknown run");
  }
  async function requireStation(station: string) {
    if (!catalog.stations.some((s) => s.stationId === station))
      throw new HttpError(404, "STATION_NOT_FOUND", "Unknown station");
  }
  const limit = (v: unknown) =>
    z.coerce.number().int().min(1).max(200).default(50).parse(v);
  app.get("/healthz", (_req, res) => res.json({ status: "alive" }));
  app.get("/readyz", async (_req, res) => {
    try {
      await db.query("SELECT 1");
    } catch {
      res
        .status(503)
        .json({
          status: "unavailable",
          database: "unavailable",
          ingestion: "unavailable",
        });
      return;
    }
    const detection = await detectionHealth().catch(() => false);
    res.json({
      status: detection ? "ready" : "degraded",
      database: "ready",
      detection: detection ? "ready" : "unavailable",
      ingestion: "available",
    });
  });
  app.get("/api/v1/replay/scenarios", (_req, res) =>
    res.json({
      data: catalog.scenarios,
      datasetVersion: catalog.version,
      mode: "precomputed_feature_replay",
      sourceTimezone: "Asia/Kolkata",
      pressureReference: "surface",
      bootstrap: "Up to 30 days of clean source history; not assessed",
      limitations: catalog.evaluation.limitations,
    }),
  );
  app.post("/api/v1/replay/runs", async (req, res) => {
    const body = z.object({ scenarioId: id }).strict().parse(req.body);
    const run = await createRun(db, catalog, body.scenarioId);
    res.status(201).json(run);
  });
  app.get("/api/v1/replay/runs", async (_req, res) =>
    res.json({
      data: (
        await db.query("SELECT * FROM runs ORDER BY created_at DESC LIMIT 50")
      ).rows,
    }),
  );
  app.get("/api/v1/replay/runs/:id", async (req, res) => {
    const run = id.parse(req.params.id);
    await requireRun(run);
    res.json((await db.query("SELECT * FROM runs WHERE id=$1", [run])).rows[0]);
  });
  app.post("/api/v1/replay/runs/:id/control", async (req, res) => {
    const run = id.parse(req.params.id),
      b = z
        .object({
          action: z.enum(["start", "pause", "resume", "step"]),
          speed: z.number().min(0.1).max(20).optional(),
        })
        .strict()
        .parse(req.body);
    const result = await db.transaction(async (q) => {
      const r = (
        await q.query("SELECT * FROM runs WHERE id=$1 FOR UPDATE", [run])
      ).rows[0];
      if (!r) throw new HttpError(404, "RUN_NOT_FOUND", "Unknown run");
      if (["failed", "completed"].includes(r.state))
        throw new HttpError(
          409,
          "INVALID_TRANSITION",
          "Retry failed job first or create a new run",
        );
      if (b.action === "step" && r.state !== "paused")
        throw new HttpError(409, "INVALID_TRANSITION", "Pause before stepping");
      if (
        b.action === "step" &&
        (
          await q.query(
            "SELECT id FROM jobs WHERE run_id=$1 AND state<>'completed' LIMIT 1",
            [run],
          )
        ).rows.length
      )
        throw new HttpError(
          409,
          "BACKPRESSURE",
          "A batch is still outstanding",
        );
      return (
        await q.query(
          "UPDATE runs SET state=$2,speed=$3,next_at=now() WHERE id=$1 RETURNING *",
          [
            run,
            b.action === "pause"
              ? "paused"
              : b.action === "step"
                ? "stepping"
                : "running",
            b.speed ?? r.speed,
          ],
        )
      ).rows[0];
    });
    events.emit("run.updated", run);
    res.json(result);
  });
  app.post("/api/v1/observation-batches", async (req, res) => {
    const r = await ingest(db, req.body);
    res.status(r.duplicate ? 200 : 202).json(r);
  });
  app.get("/api/v1/jobs/:id", async (req, res) => {
    const r = (
      await db.query("SELECT * FROM jobs WHERE id=$1", [
        id.parse(req.params.id),
      ])
    ).rows[0];
    if (!r) throw new HttpError(404, "JOB_NOT_FOUND", "Unknown job");
    res.json(r);
  });
  app.post("/api/v1/jobs/:id/retry", async (req, res) => {
    const jobId = id.parse(req.params.id);
    const j = await db.transaction(async (q) => {
      const j = (
        await q.query("SELECT * FROM jobs WHERE id=$1 FOR UPDATE", [jobId])
      ).rows[0];
      if (!j) throw new HttpError(404, "JOB_NOT_FOUND", "Unknown job");
      if (j.state !== "failed")
        throw new HttpError(
          409,
          "INVALID_TRANSITION",
          "Only failed jobs can be retried",
        );
      await q.query(
        "INSERT INTO audit_events(run_id,kind,details) VALUES($1,'job.retry',$2)",
        [
          j.run_id,
          JSON.stringify({
            jobId,
            previousAttempts: j.attempts,
            error: j.error,
          }),
        ],
      );
      await q.query(
        "UPDATE jobs SET state='pending',attempts=0,error=NULL,next_at=now() WHERE id=$1",
        [jobId],
      );
      await q.query("UPDATE runs SET state='paused' WHERE id=$1", [j.run_id]);
      return j;
    });
    events.emit("run.updated", j.run_id);
    res.status(202).json({ jobId, state: "pending" });
  });
  app.get("/api/v1/stations", async (req, res) => {
    const run = runId(req);
    await requireRun(run);
    const result = await db.query(
      `SELECT s.metadata,o.raw,o.observed_at,a.result AS assessment,j.state AS processing_status FROM stations s
 LEFT JOIN LATERAL(SELECT raw,observed_at,batch_id FROM observations WHERE run_id=$1 AND station_id=s.id ORDER BY observed_at DESC LIMIT 1)o ON true
 LEFT JOIN LATERAL(SELECT result FROM assessments WHERE run_id=$1 AND station_id=s.id ORDER BY observed_at DESC LIMIT 1)a ON true
 LEFT JOIN jobs j ON j.batch_id=o.batch_id ORDER BY s.id`,
      [run],
    );
    res.json({ data: result.rows });
  });
  app.get("/api/v1/stations/:id", async (req, res) => {
    const station = id.parse(req.params.id);
    await requireStation(station);
    res.json(catalog.stations.find((s) => s.stationId === station));
  });
  app.get("/api/v1/stations/:id/history", async (req, res) => {
    const run = runId(req),
      station = id.parse(req.params.id);
    await requireRun(run);
    await requireStation(station);
    const from = instant.parse(req.query.from),
      to = instant.parse(req.query.to);
    if (
      new Date(to).getTime() - new Date(from).getTime() > 31 * 86400000 ||
      from > to
    )
      throw new HttpError(
        422,
        "INVALID_RANGE",
        "History range must be ordered and at most 31 days",
      );
    const cursor = req.query.cursor ? instant.parse(req.query.cursor) : from,
      n = limit(req.query.limit);
    const rows = (
      await db.query(
        `SELECT o.observed_at,o.raw,o.historical,a.result AS assessment FROM observations o LEFT JOIN assessments a ON a.run_id=o.run_id AND a.station_id=o.station_id AND a.observed_at=o.observed_at WHERE o.run_id=$1 AND o.station_id=$2 AND o.observed_at>=$3 AND o.observed_at<=$4 AND ($5::timestamptz IS NULL OR o.observed_at>$5) ORDER BY o.observed_at LIMIT $6`,
        [run, station, from, to, req.query.cursor ? cursor : null, n + 1],
      )
    ).rows;
    res.json({
      data: rows.slice(0, n),
      nextCursor:
        rows.length > n
          ? new Date(rows[n - 1].observed_at).toISOString()
          : null,
    });
  });
  app.get("/api/v1/assessments", async (req, res) => {
    const run = runId(req);
    await requireRun(run);
    const n = limit(req.query.limit),
      station = req.query.stationId ? id.parse(req.query.stationId) : null,
      verdict = req.query.verdict
        ? z
            .enum([
              "normal",
              "suspected_fault",
              "uncertain",
              "insufficient_data",
            ])
            .parse(req.query.verdict)
        : null;
    const cursor = req.query.cursor ? id.parse(req.query.cursor) : null;
    const rows = (
      await db.query(
        "SELECT id,result FROM assessments WHERE run_id=$1 AND ($2::text IS NULL OR station_id=$2) AND ($3::text IS NULL OR verdict=$3) AND ($4::text IS NULL OR id>$4) ORDER BY id LIMIT $5",
        [run, station, verdict, cursor, n + 1],
      )
    ).rows;
    res.json({
      data: rows.slice(0, n).map((r) => r.result),
      nextCursor: rows.length > n ? rows[n - 1].id : null,
    });
  });
  app.get("/api/v1/assessments/:id", async (req, res) => {
    const r = (
      await db.query("SELECT result FROM assessments WHERE id=$1", [
        id.parse(req.params.id),
      ])
    ).rows[0];
    if (!r)
      throw new HttpError(404, "ASSESSMENT_NOT_FOUND", "Unknown assessment");
    res.json(r.result);
  });
  app.get("/api/v1/stations/:id/health", async (req, res) => {
    const run = runId(req),
      station = id.parse(req.params.id);
    await requireRun(run);
    await requireStation(station);
    res.json(await sensorHealth(db, run, station));
  });
  app.get("/api/v1/corrections", async (req, res) => {
    const run = runId(req);
    await requireRun(run);
    res.json({
      data: (
        await db.query(
          "SELECT * FROM corrections WHERE run_id=$1 ORDER BY id LIMIT 200",
          [run],
        )
      ).rows,
    });
  });
  app.post("/api/v1/corrections/:id/review", async (req, res) => {
    const correction = id.parse(req.params.id),
      b = z
        .object({ decision: z.enum(["accepted", "rejected"]) })
        .strict()
        .parse(req.body);
    const result = await db.transaction(async (q) => {
      const r = (
        await q.query("SELECT * FROM corrections WHERE id=$1 FOR UPDATE", [
          correction,
        ])
      ).rows[0];
      if (!r)
        throw new HttpError(404, "CORRECTION_NOT_FOUND", "Unknown correction");
      if (
        r.review_state !== "proposed" ||
        (b.decision === "accepted" && r.result.estimate === null)
      )
        throw new HttpError(
          409,
          "INVALID_REVIEW",
          "Proposal is already reviewed or has no usable estimate",
        );
      await q.query(
        "UPDATE corrections SET review_state=$2,reviewed_at=now() WHERE id=$1",
        [correction, b.decision],
      );
      await q.query(
        "INSERT INTO audit_events(run_id,kind,details) VALUES($1,'correction.review',$2)",
        [
          r.run_id,
          JSON.stringify({
            correctionId: correction,
            decision: b.decision,
            requestId: res.locals.requestId,
          }),
        ],
      );
      return { id: correction, reviewState: b.decision, rawUnchanged: true };
    });
    res.json(result);
  });
  app.get("/api/v1/evaluation", (_req, res) => res.json(catalog.evaluation));
  app.get("/api/v1/events", async (req, res) => {
    const run = runId(req);
    await requireRun(run);
    events.subscribe(res, run);
  });
  app.use((_req, _res, next) =>
    next(new HttpError(404, "NOT_FOUND", "Endpoint not found")),
  );
  app.use(
    (
      err: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (res.headersSent) {
        res.end();
        return;
      }
      const status =
        err instanceof z.ZodError
          ? 422
          : err instanceof HttpError
            ? err.status
            : err.type === "entity.too.large"
              ? 413
              : err.type === "entity.parse.failed"
                ? 400
                : 500;
      log({ requestId: res.locals.requestId, error: err.message, status });
      res
        .status(status)
        .json({
          error: {
            code:
              err instanceof HttpError
                ? err.code
                : status === 422
                  ? "VALIDATION_ERROR"
                  : status === 500
                    ? "INTERNAL_ERROR"
                    : "BAD_REQUEST",
            message: status === 500 ? "Unexpected server error" : err.message,
            requestId: res.locals.requestId,
          },
        });
    },
  );
  return app;
}
