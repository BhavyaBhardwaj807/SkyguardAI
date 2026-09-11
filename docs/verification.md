# Verification

Verified in the implementation environment:

- Next.js production build and Express TypeScript build.
- Strict frontend/backend TypeScript checks.
- Sixteen integration tests using PGlite (embedded PostgreSQL), Express HTTP requests and an explicit test predictor.
- SSE response headers, notification after committed assessment, and reconnect resynchronization signal.
- Frontend import boundary check.
- Existing Python files, datasets and model artifacts unchanged from the v2 base.

The suite covers concurrent identical deliveries, conflicting retries, atomic completion, Python outage/retry, interrupted jobs, spent attempt budgets, absent stations, raw-only abstention, input/label validation, backpressure, out-of-order rejection, independent runs, replay stepping, query limits, degraded readiness, mutation guards, CSV timezone/provenance, model-response identity/timeouts, SSE and audited correction rejection.

## Not verified here

Docker is not installed in this environment. `docker compose up --build`, PostgreSQL advisory-lock behavior against a standalone server, real-model prediction inside its container and browser-through-Nginx streaming require the local Docker acceptance run. PGlite tests exercise PostgreSQL SQL/transactions but do not replace that deployment check.

The existing scaler and forest artifacts identify scikit-learn 1.9.0. The available Python environment has 1.8.0 and lacks SHAP/FastAPI, so real inference was not reported as validated. Existing Python requirements are unpinned and were intentionally left untouched.

The three-second p95 target has not been measured against the real model. Test runtime is not a substitute for end-to-end inference latency.

## Local acceptance checklist

1. Start Compose and inspect `docker compose ps` and detection logs for artifact/dependency compatibility.
2. Open localhost:8080 in two tabs; create/start a replay and confirm both receive committed results.
3. Pause and step; verify one new timestamp batch and a persisted cursor.
4. Stop detection, observe visible failure and retained observations, restart detection, retry the job and resume.
5. Restart API while processing; inspect the job and ensure one assessment per station/time.
6. Disconnect a tab and reconnect; confirm its REST snapshot catches up.
7. Inspect evaluation: zero regional samples must say not evaluated.
8. Inspect health/correction availability; short history or distant neighbors must not generate invented values.

No production deployment or public endpoint is created by this branch.
