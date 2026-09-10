// Central API client. USE_MOCK=true lets every page render real-shaped
// data before Person 3's backend exists. Flip to false (or set
// VITE_API_BASE_URL) once the real Express API is up — no component
// should need to change.

import {
  mockStations,
  mockAnomalies,
  mockDelay,
  mockTrends,
  mockTemperatureTrend,
  mockSensorHealthBreakdown,
} from "./mockData";

const USE_MOCK = true;
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

async function realFetch(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status} on ${path}`);
  return res.json();
}

export const api = {
  getStations: () =>
    USE_MOCK ? mockDelay(mockStations) : realFetch("/api/stations"),

  getAnomalies: () =>
    USE_MOCK ? mockDelay(mockAnomalies) : realFetch("/api/anomalies"),

  getStationHistory: (stationId) =>
    USE_MOCK ? mockDelay([]) : realFetch(`/api/stations/${stationId}/history`),

  getHealth: (stationId) =>
    USE_MOCK ? mockDelay({ station_id: stationId, health_score: 90 }) : realFetch(`/api/health/${stationId}`),

  getEvaluationMetrics: () =>
    USE_MOCK ? mockDelay(null) : realFetch("/api/evaluation/metrics"),

  getArchitecture: () =>
    USE_MOCK ? mockDelay(null) : realFetch("/api/architecture"),

  // NOTE: these two are NOT in Person 3's documented API contract
  // (Section 8 of the plan). They're mock-only Overview enhancements.
  // Flag to Person 3 before Day 3 if we want them backed for real.
  // Network health and the AI Insight panel are deliberately NOT
  // separate endpoints - they're derived in Overview.jsx directly
  // from getStations()/getAnomalies() so the numbers can never
  // contradict each other.
  getTrends: () => mockDelay(mockTrends),
  getTemperatureTrend: () => mockDelay(mockTemperatureTrend),
  getSensorHealthBreakdown: () => mockDelay(mockSensorHealthBreakdown),

  simulateAnomaly: (stationId) =>
    USE_MOCK
      ? mockDelay({ ok: true })
      : fetch(`${BASE_URL}/api/simulate-anomaly`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ station_id: stationId }),
        }).then((r) => r.json()),
};
