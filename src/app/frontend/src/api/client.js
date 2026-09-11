// Central API client supporting both live Express backend (/api/v1) and graceful fallback.
// Follows real OpenAPI routes documented in docs/api.md.

import {
  mockStations,
  mockAnomalies,
  mockDelay,
  mock24hHistory,
  mockScenarios,
  mockReplayRun,
  mockEvaluation,
} from "./mockData";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

async function safeFetch(path, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}/api/v1${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return null; // Fallback signal
  }
}

export const api = {
  // Replay runs & control
  getScenarios: async () => {
    const res = await safeFetch("/replay/scenarios");
    if (res && res.data) return res.data;
    return mockDelay(mockScenarios);
  },

  getLatestRun: async () => {
    const res = await safeFetch("/replay/runs");
    if (res && res.data && res.data[0]) return res.data[0];
    return mockDelay(mockReplayRun);
  },

  controlRun: async (runId, action, speed = 1) => {
    const res = await safeFetch(`/replay/runs/${runId}/control`, {
      method: "POST",
      body: JSON.stringify({ action, speed }),
    });
    if (res) return res;
    return mockDelay({ ...mockReplayRun, state: action === "pause" ? "paused" : "running" });
  },

  // Stations & Observations
  getStations: async (runId) => {
    const query = runId ? `?runId=${runId}` : "";
    const res = await safeFetch(`/stations${query}`);
    if (res && res.data) return res.data;
    return mockDelay(mockStations);
  },

  getStationById: async (stationId) => {
    const res = await safeFetch(`/stations/${stationId}`);
    if (res && res.data) return res.data;
    const match = mockStations.find((s) => s.stationId === stationId || s.station_id === stationId);
    return mockDelay(match || mockStations[0]);
  },

  getStationHistory: async (stationId, runId) => {
    const query = runId ? `?runId=${runId}` : "";
    const res = await safeFetch(`/stations/${stationId}/history${query}`);
    if (res && res.data) return res.data;
    return mockDelay(mock24hHistory);
  },

  // Assessments & Anomalies
  getAssessments: async (runId, verdict) => {
    const params = new URLSearchParams();
    if (runId) params.append("runId", runId);
    if (verdict && verdict !== "all") params.append("verdict", verdict);
    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await safeFetch(`/assessments${query}`);
    if (res && res.data) return res.data;
    return mockDelay(mockAnomalies);
  },

  // Health breakdown
  getStationHealth: async (stationId, runId) => {
    const query = runId ? `?runId=${runId}` : "";
    const res = await safeFetch(`/stations/${stationId}/health${query}`);
    if (res && res.data) return res.data;
    const match = mockStations.find((s) => s.stationId === stationId || s.station_id === stationId);
    return mockDelay(match ? match.channels : mockStations[0].channels);
  },

  // Corrections & Auditing
  getCorrections: async (runId) => {
    const query = runId ? `?runId=${runId}` : "";
    const res = await safeFetch(`/corrections${query}`);
    if (res && res.data) return res.data;
    return mockDelay(
      mockAnomalies
        .filter((a) => a.correctionProposal)
        .map((a) => ({
          id: `corr-${a.id}`,
          anomalyId: a.id,
          stationId: a.stationId,
          timestamp: a.timestamp,
          rawValue: a.rawValue,
          correctedValue: a.correctionProposal.proposedValue,
          method: a.correctionProposal.method,
          confidence: a.correctionProposal.confidence,
          status: a.correctionProposal.reviewStatus,
          notes: a.correctionProposal.notes,
        }))
    );
  },

  reviewCorrection: async (correctionId, decision) => {
    const res = await safeFetch(`/corrections/${correctionId}/review`, {
      method: "POST",
      body: JSON.stringify({ decision }),
    });
    if (res) return res;
    return mockDelay({ id: correctionId, status: decision, reviewedAt: new Date().toISOString() });
  },

  // Model Evaluation
  getEvaluationMetrics: async () => {
    const res = await safeFetch("/evaluation");
    if (res && res.data) return res.data;
    return mockDelay(mockEvaluation);
  },
};
