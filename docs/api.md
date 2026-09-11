# Backend API

Base for Docker: `http://localhost:8080/api/v1`. Browser requests use relative paths. IDs are strings, event timestamps are UTC ISO strings. PostgreSQL run/job rows retain snake_case fields; observation and assessment payloads use the shared camelCase contract. Use the shared TypeScript assessment types and the endpoint semantics below; the OpenAPI file documents request schemas and routes.

## Start and recover a replay

```bash
curl http://localhost:8080/api/v1/replay/scenarios
curl -X POST http://localhost:8080/api/v1/replay/runs \
  -H 'Content-Type: application/json' -d '{"scenarioId":"spike"}'
# Substitute the returned run ID below.
curl -X POST http://localhost:8080/api/v1/replay/runs/RUN_ID/control \
  -H 'Content-Type: application/json' -d '{"action":"start","speed":1}'
curl -N 'http://localhost:8080/api/v1/events?runId=RUN_ID'
curl 'http://localhost:8080/api/v1/assessments?runId=RUN_ID&verdict=suspected_fault'
curl http://localhost:8080/api/v1/jobs/JOB_ID
curl -X POST http://localhost:8080/api/v1/jobs/JOB_ID/retry \
  -H 'Content-Type: application/json' -d '{}'
```

Use the ingestion receipt or `processing.failed` SSE payload to obtain a job ID. A run is paused after explicit retry; resume it after the job succeeds. `pause` stops new scheduling, not already committed processing. `step` requires a paused run with no outstanding job. A completed run is immutable; create another run.

## Routes

| Method | Route                                    | Purpose                                                       |
| ------ | ---------------------------------------- | ------------------------------------------------------------- |
| GET    | `/healthz` (outside API prefix)          | Process liveness                                              |
| GET    | `/readyz` (outside API prefix)           | Database readiness and Python availability                    |
| GET    | `/replay/scenarios`                      | Available scenario windows and provenance                     |
| POST   | `/replay/runs`                           | `{scenarioId}`; returns a new paused run, status 201          |
| GET    | `/replay/runs`                           | Latest 50 runs                                                |
| GET    | `/replay/runs/:id`                       | State, persisted position, speed and event time               |
| POST   | `/replay/runs/:id/control`               | `{action: start                                               | pause                              | resume | step, speed?: 0.1..20}` |
| POST   | `/observation-batches`                   | Strict batch schema; returns durable receipt/job              |
| GET    | `/jobs/:id`                              | Processing state, attempts and error                          |
| POST   | `/jobs/:id/retry`                        | Retry terminal failure; returns 202                           |
| GET    | `/stations?runId=`                       | Metadata, latest raw reading, assessment and processing state |
| GET    | `/stations/:id`                          | Station metadata                                              |
| GET    | `/stations/:id/history?runId=&from=&to=` | Up to 31 days, ascending event time                           |
| GET    | `/assessments?runId=`                    | All verdicts; optional stationId/verdict filters              |
| GET    | `/assessments/:id`                       | Full evidence and original prediction                         |
| GET    | `/stations/:id/health?runId=`            | Per-channel indicator or insufficient coverage                |
| GET    | `/corrections?runId=`                    | Up to 200 proposals/unavailable records                       |
| POST   | `/corrections/:id/review`                | `{decision: accepted                                          | rejected}`; audited, raw unchanged |
| GET    | `/evaluation`                            | Saved metrics with provenance and zero-sample test handling   |
| GET    | `/events?runId=`                         | SSE notifications; reconnect requires REST resync             |

History and assessment lists accept `limit` (1–200, default 50) and `cursor`; use the returned `nextCursor` verbatim. History sorts by timestamp; assessment pagination sorts by stable ID, not severity or recency. For a chronological chart, use history.

## Direct batch ingestion

```json
{
  "runId": "RUN_ID",
  "batchId": "external_001",
  "observedAt": "2026-09-07T00:00:00Z",
  "expectedStationIds": ["AWS001", "AWS002"],
  "absentStationIds": ["AWS002"],
  "observations": [
    {
      "stationId": "AWS001",
      "temperatureC": 29.1,
      "relativeHumidityPct": 62,
      "pressureHpa": 998
    }
  ]
}
```

Use a paused run for manual ingestion; do not mix external future timestamps with that run's automated replay. Raw-only readings intentionally produce `insufficient_data`. To call the existing ML service, provide every field in `featuresSchema` from the shared contract. Unknown keys, including labels, are rejected. Missing numeric values are null; do not use zero as missing.

First acceptance returns 202; identical retries return 200 with `duplicate: true`. A conflicting payload returns 409. One outstanding batch per run is permitted. Finite implausible physical values are accepted for QC.

Errors use `{error:{code,message,requestId}}`. Malformed JSON is 400, unknown resources 404, conflict/backpressure 409, oversized body 413, schema errors 422. Database readiness is 503; a Python outage appears as degraded readiness and eventually a failed job. Automatic attempts default to three with bounded exponential backoff.

## Events

`connected` carries `{resyncRequired:true}`. Domain events carry event ID, run ID and emitted timestamp; batch/job IDs appear where relevant. Heartbeats are comments every 15 seconds. SSE is notification transport, not a durable event log. Refetch snapshots on every connection, on domain events and periodically while active.

The local Docker demo has no account system. If `MUTATION_TOKEN` is configured, send `Authorization: Bearer ...` for mutations. Never put this token in `NEXT_PUBLIC_*` environment variables.
