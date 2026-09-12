/**
 * SkyGuard API client — talks directly to the Express backend.
 * All mock fallbacks removed. Response shapes match what application.ts actually returns.
 *
 * Station row shape from GET /stations?runId=:
 *   { metadata:{stationId,name,latitude,longitude,...}, raw:{temperatureC,relativeHumidityPct,pressureHpa},
 *     observed_at, assessment:{verdict,anomalyScore,severity,explanation,affectedChannels,suspectedCategory,...},
 *     processing_status }
 *
 * Assessment shape from GET /assessments?runId=:
 *   { id, runId, stationId, observedAt, verdict, anomalyScore, severity, explanation,
 *     affectedChannels, evidence, suspectedCategory, processingStatus }
 *
 * Correction row shape from GET /corrections?runId=:
 *   { id, assessment_id, run_id, station_id, channel,
 *     result:{rawValue,estimate,method,status,reason,neighbors}, review_state, reviewed_at }
 *
 * Evaluation shape from GET /evaluation (no runId needed):
 *   { modelVersion, metrics:{precision,recall,f1,pr_auc,roc_auc,false_alarm_rate},
 *     multiSeedSummary, regionalTest, limitations }
 *
 * History shape from GET /stations/:id/history?runId=&from=&to=:
 *   { data:[{observed_at, raw:{temperatureC,relativeHumidityPct,pressureHpa}, historical, assessment}], nextCursor }
 */

const BASE_URL = "";

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}/api/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `HTTP ${res.status} on ${path}`);
  }
  return res.json();
}

// ─── Run helpers ──────────────────────────────────────────────────────────────

/**
 * Return the most recent run, or null if none exist yet.
 */
export async function getLatestRun() {
  const res = await apiFetch("/replay/runs");
  return res.data?.[0] ?? null;
}

/**
 * Return the most recent run ID as a string, or null.
 */
export async function getLatestRunId() {
  const run = await getLatestRun();
  return run?.id ?? null;
}

/**
 * Convenience: ensure a run exists. Creates a "spike" run if none found.
 * Returns the run object.
 */
export async function ensureRun(scenarioId = "spike") {
  const existing = await getLatestRun();
  if (existing) return existing;
  return apiFetch("/replay/runs", {
    method: "POST",
    body: JSON.stringify({ scenarioId }),
  });
}

// ─── Scenarios & Runs ─────────────────────────────────────────────────────────

export const api = {
  getScenarios: async () => {
    const res = await apiFetch("/replay/scenarios");
    return res.data ?? [];
  },

  getRuns: async () => {
    const res = await apiFetch("/replay/runs");
    return res.data ?? [];
  },

  getLatestRun,

  createRun: async (scenarioId) =>
    apiFetch("/replay/runs", {
      method: "POST",
      body: JSON.stringify({ scenarioId }),
    }),

  controlRun: async (runId, action, speed) => {
    const body = { action };
    if (speed !== undefined) body.speed = speed;
    return apiFetch(`/replay/runs/${runId}/control`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  // ─── Stations ──────────────────────────────────────────────────────────────

  /**
   * Returns normalised station objects ready for UI consumption.
   * Flattens the DB row shape into a flat object the components expect.
   */
  getStations: async (runId) => {
    const id = runId ?? (await getLatestRunId());
    if (!id) return [];
    const res = await apiFetch(`/stations?runId=${id}`);
    return (res.data ?? []).map(normaliseStation);
  },

  /** Returns a single station metadata object (no reading/assessment). */
  getStationById: async (stationId) => {
    const raw = await apiFetch(`/stations/${stationId}`);
    // Shape: { stationId, name, latitude, longitude, ... }
    return raw;
  },

  /**
   * Returns history rows transformed for Recharts:
   * [{ time: "HH:MM", temperatureC, relativeHumidityPct, pressureHpa, verdict, observed_at }]
   * Covers the last 48 hours relative to the run's last observed time (or now).
   */
  getStationHistory: async (stationId, runId) => {
    const id = runId ?? (await getLatestRunId());
    if (!id) return [];

    // Determine time window from the run's last_observed_at, fallback to now
    let anchor;
    try {
      const run = await apiFetch(`/replay/runs/${id}`);
      anchor = run.last_observed_at ? new Date(run.last_observed_at) : new Date();
    } catch {
      anchor = new Date();
    }

    const to = anchor.toISOString();
    const from = new Date(anchor.getTime() - 48 * 60 * 60 * 1000).toISOString();

    const res = await apiFetch(
      `/stations/${stationId}/history?runId=${id}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=200`
    );

    return (res.data ?? []).map((row) => ({
      time: new Date(row.observed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
      observed_at: row.observed_at,
      temperatureC: row.raw?.temperatureC ?? null,
      relativeHumidityPct: row.raw?.relativeHumidityPct ?? null,
      pressureHpa: row.raw?.pressureHpa ?? null,
      verdict: row.assessment?.verdict ?? (row.historical ? "historical" : null),
      anomalyScore: row.assessment?.anomalyScore ?? null,
    }));
  },

  // ─── Assessments ───────────────────────────────────────────────────────────

  getAssessments: async (runId, verdict, stationId) => {
    const id = runId ?? (await getLatestRunId());
    if (!id) return [];
    const params = new URLSearchParams({ runId: id });
    if (verdict && verdict !== "all") params.append("verdict", verdict);
    if (stationId) params.append("stationId", stationId);
    const res = await apiFetch(`/assessments?${params}`);
    return res.data ?? [];
  },

  getAssessmentById: async (assessmentId) => apiFetch(`/assessments/${assessmentId}`),

  // ─── Health ────────────────────────────────────────────────────────────────

  /**
   * Returns { asOf, channels: [{ channel, score, status, coverage }] }
   */
  getStationHealth: async (stationId, runId) => {
    const id = runId ?? (await getLatestRunId());
    if (!id) return null;
    return apiFetch(`/stations/${stationId}/health?runId=${id}`);
  },

  // ─── Corrections ───────────────────────────────────────────────────────────

  /**
   * Returns raw DB correction rows:
   * { id, station_id, channel, result:{rawValue,estimate,method,status,reason}, review_state }
   */
  getCorrections: async (runId) => {
    const id = runId ?? (await getLatestRunId());
    if (!id) return [];
    const res = await apiFetch(`/corrections?runId=${id}`);
    return res.data ?? [];
  },

  reviewCorrection: async (correctionId, decision) =>
    apiFetch(`/corrections/${correctionId}/review`, {
      method: "POST",
      body: JSON.stringify({ decision }),
    }),

  // ─── Evaluation ────────────────────────────────────────────────────────────

  /** No runId needed. Returns { modelVersion, metrics, multiSeedSummary, regionalTest, limitations } */
  getEvaluationMetrics: async () => apiFetch("/evaluation"),

  // ─── Jobs ──────────────────────────────────────────────────────────────────

  getJob: async (jobId) => apiFetch(`/jobs/${jobId}`),

  retryJob: async (jobId) =>
    apiFetch(`/jobs/${jobId}/retry`, { method: "POST", body: JSON.stringify({}) }),
};

// ─── Shape normaliser ─────────────────────────────────────────────────────────

/**
 * Converts a raw DB station row (with nested metadata/raw/assessment)
 * into a flat object that every UI component can consume uniformly.
 */
export function normaliseStation(row) {
  const m = row.metadata ?? {};
  const r = row.raw ?? {};
  const a = row.assessment ?? null;

  return {
    // Identity
    stationId: m.stationId,
    name: m.name,
    // Real field names from the backend contract
    latitude: m.latitude,
    longitude: m.longitude,
    // Latest reading
    temperatureC: r.temperatureC ?? null,
    relativeHumidityPct: r.relativeHumidityPct ?? null,
    pressureHpa: r.pressureHpa ?? null,
    observed_at: row.observed_at ?? null,
    // Assessment summary
    verdict: a?.verdict ?? "insufficient_data",
    anomalyScore: a?.anomalyScore ?? null,
    severity: a?.severity ?? "unknown",
    explanation: a?.explanation ?? null,
    affectedChannels: a?.affectedChannels ?? [],
    suspectedCategory: a?.suspectedCategory ?? null,
    // Job state
    processing_status: row.processing_status ?? null,
    // Keep the full assessment object for detail pages
    assessment: a,
  };
}
