# Backend handoff and architecture decisions

## Ownership

Backend owns ingestion integrity, PostgreSQL, replay orchestration, workflow recovery, APIs, SSE, explicit evidence policy, health aggregation and correction proposal storage/review. The Next.js screen is an integration surface, not the finished dashboard.

Python source, trained artifacts and CSV files remain unchanged. No code was taken from the `data` branch. The base is `feature/ml-isolation-forest-v2` at `19490d313476eeb44e895f67a74e41f5130b129d`.

## Existing ML contract is authoritative for this integration

`POST /predict` receives station ID, UTC timestamp, raw measurements and an allowlisted existing feature row. Runtime parsing rejects extra fields. Ground-truth labels, scenario tags, `original_*` values and injection descriptions never cross the HTTP model boundary. Scenario selection may inspect labels to locate a demonstration window, but labels do not drive backend verdicts.

This does not remove the leakage already baked into offline features. `features.py` fits residual relationships over the full dataset using pre-injection originals. A raw-only submission is retained and assessed as `insufficient_data`. Rows containing null engineered features also abstain rather than adopting Python's silent zero fallback. No new scientific features are implemented in JS, and no fake predictor is enabled by an environment flag.

The worker does not query raw history for the existing prediction endpoint because that endpoint does not accept it. History is stored for reads and health calculations. Migrating to `/v1/assess-batch` requires a future ML-owned change; it must not be described as already implemented.

## Replay provenance

- Existing acquisition explicitly requests Asia/Kolkata. Import converts its naive timestamps with +05:30 to UTC.
- Pressure is surface pressure, not sea-level pressure.
- Locations are labelled modelled; the data is not treated as physical AWS sensor measurements.
- Dataset version is the SHA-256 of the feature CSV.
- Duplicate source station/time rows select the first reading deterministically. Original files remain untouched; the existing `duplicate_flag` is retained separately from HTTP retry semantics.
- Scenario windows are selected from existing injections and may include other injected events. No new anomaly injection engine was invented in the backend.
- Up to 30 preceding days of clean raw history seed a run. Seed rows never receive retrospective 'normal' assessments or emit alerts.

## Verdict policy: backend-evidence-v1

The unchanged model score is stored verbatim. `0.50` matches the existing demo script and is labelled a prototype threshold. Above threshold plus range/step/missing/persistence evidence gives `suspected_fault`; a score without corroboration gives `uncertain`. Conflicting low-score QC evidence is also `uncertain`. Missing features give `insufficient_data`.

Range and hourly difference thresholds are explicit prototype settings copied from the existing QC configuration, not asserted universal WMO limits. Aggregate persistence/duplicate flags do not identify an affected channel. SHAP/mixed contributions are preserved under `prediction`, not promoted to causal explanations or calibrated percentages. Severity comes from physical evidence, not merely anomaly score. No `weather_change_candidate` verdict is fabricated from a low score.

## Health and corrections

`handoff-health-v1` implements the supplied 30/25/20/15/10 weighting with event-time windows. It requires 90% 30-day baseline coverage, 90% seven-day assessment coverage and at least half of expected recent observations. Historical seed rows are not assumed normal. Zero baseline variance abstains. Drift caps are explicit prototype choices: 3 °C, 15 humidity percentage points, 5 hPa. The overlapping 30-day baseline follows the handoff and is not a predictive-maintenance model.

Corrections require three normal same-batch neighbors within 100 km. Inverse-distance averaging creates a human-review proposal, never an automatic substitution. Surface-pressure correction abstains because elevation metadata is absent. The existing cluster will generally produce an unavailable record, which cannot be accepted. Reviewed proposals receive an audit entry; raw values stay unchanged. Review is for a local single-operator demo, not an authenticated multi-user audit product.

## Deployment and consistency

- Plain `pg` and SQL migrations keep transactions and constraints explicit; no ORM is necessary for this small schema.
- Separate web/API containers use one npm lockfile. The root is the web package, backend is the npm workspace.
- Express owns one worker loop. A dedicated PostgreSQL advisory lock prevents a second API/worker instance. Loss of the lock connection exits the process.
- At most one outstanding batch per run; replay applies backpressure. A paused run does not cancel a committed batch.
- A retry after terminal failure gets a new bounded attempt budget and an audit entry. Startup recovery never exceeds an already spent automatic budget.
- Snapshot reads plus SSE invalidation are the consistency contract. SSE does not provide durable Last-Event-ID replay. A 2-second frontend reconciliation runs independently of notifications.
- Default Docker exposure is loopback only. No login system is included. Non-demo mode requires a mutation token. CORS is not authentication; internet deployment needs a separate access-control plan.
- PostgreSQL readiness failure returns 503; Python outage returns 200 with `degraded`, allowing inspection/recovery.

## Frontend team

Consume only `/api/v1/*`; one EventSource per tab. Refresh on `connected`, `batch.processed`, `processing.failed` and `run.updated`. Refetch periodically to cover a DB-commit/process-crash notification gap. Compare observation and assessment timestamps so an older verdict cannot color a new reading. Treat historical rows, missing observations and processing status independently. Read the scenario manifest and evaluation limitations instead of displaying unsupported accuracy claims.

## ML/data team follow-up

Provide a causal raw/context endpoint, versioned feature/policy schema, per-channel findings, missingness rules, suitable spatial cluster/elevation metadata, and a reproducible dependency lock. Re-evaluate after repairing offline leakage. Ensure regional events actually occur in the final held-out split and report sample counts. These are future integration requirements, not changes made in this branch.
