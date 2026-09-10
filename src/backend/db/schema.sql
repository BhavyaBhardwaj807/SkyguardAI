CREATE TABLE IF NOT EXISTS schema_migrations(version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS stations(id text PRIMARY KEY, metadata jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS runs(
 id text PRIMARY KEY, scenario text NOT NULL, dataset_version text NOT NULL,
 state text NOT NULL DEFAULT 'paused' CHECK(state IN ('paused','running','stepping','failed','completed')),
 position integer NOT NULL DEFAULT 0, speed double precision NOT NULL DEFAULT 1 CHECK(speed BETWEEN 0.1 AND 20),
 last_observed_at timestamptz, next_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS batches(
 id text PRIMARY KEY, run_id text NOT NULL REFERENCES runs(id), external_id text NOT NULL,
 observed_at timestamptz NOT NULL, content_hash text NOT NULL, payload jsonb NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now(), UNIQUE(run_id,external_id), UNIQUE(run_id,observed_at)
);
CREATE TABLE IF NOT EXISTS observations(
 id bigserial PRIMARY KEY, run_id text NOT NULL REFERENCES runs(id), station_id text NOT NULL REFERENCES stations(id),
 batch_id text REFERENCES batches(id), observed_at timestamptz NOT NULL, raw jsonb NOT NULL,
 historical boolean NOT NULL DEFAULT false, UNIQUE(run_id,station_id,observed_at)
);
CREATE INDEX IF NOT EXISTS observations_history ON observations(run_id,station_id,observed_at);
CREATE TABLE IF NOT EXISTS jobs(
 id text PRIMARY KEY, batch_id text NOT NULL UNIQUE REFERENCES batches(id), run_id text NOT NULL REFERENCES runs(id),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','processing','completed','failed')),
 attempts integer NOT NULL DEFAULT 0, started_at timestamptz, finished_at timestamptz,
 next_at timestamptz NOT NULL DEFAULT now(), error text
);
CREATE INDEX IF NOT EXISTS jobs_pending ON jobs(state,next_at);
CREATE TABLE IF NOT EXISTS assessments(
 id text PRIMARY KEY, run_id text NOT NULL REFERENCES runs(id), station_id text NOT NULL REFERENCES stations(id),
 observed_at timestamptz NOT NULL, batch_id text NOT NULL REFERENCES batches(id), verdict text NOT NULL, result jsonb NOT NULL,
 UNIQUE(run_id,station_id,observed_at)
);
CREATE INDEX IF NOT EXISTS assessments_feed ON assessments(run_id,observed_at,id);
CREATE TABLE IF NOT EXISTS corrections(
 id text PRIMARY KEY, assessment_id text NOT NULL REFERENCES assessments(id), run_id text NOT NULL REFERENCES runs(id),
 station_id text NOT NULL REFERENCES stations(id), channel text NOT NULL, result jsonb NOT NULL,
 review_state text NOT NULL DEFAULT 'proposed' CHECK(review_state IN ('proposed','accepted','rejected')),
 reviewed_at timestamptz, UNIQUE(assessment_id,channel)
);
CREATE TABLE IF NOT EXISTS audit_events(id bigserial PRIMARY KEY, run_id text REFERENCES runs(id), kind text NOT NULL, details jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
INSERT INTO schema_migrations(version) VALUES(1) ON CONFLICT DO NOTHING;
