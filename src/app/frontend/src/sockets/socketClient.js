// Real-time event client for SkyGuard AI backend.
// The backend exposes SSE (Server-Sent Events) at /api/v1/events?runId=<id>
// rather than Socket.IO. This module bridges that to component-friendly callbacks.
//
// Usage:
//   subscribeToEvents(runId, onEvent) → returns cleanup function
//   subscribeToMockLiveUpdates(onEvent, intervalMs) → demo mode with fake data

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

/**
 * Subscribe to live backend SSE events for a given replay run.
 * @param {string} runId - The replay run ID
 * @param {(event: {type: string, data: object}) => void} onEvent
 * @returns {() => void} cleanup function
 */
export function subscribeToEvents(runId, onEvent) {
  if (!runId) return () => {};

  let es;
  try {
    const url = `${BASE_URL}/api/v1/events?runId=${encodeURIComponent(runId)}`;
    es = new EventSource(url);

    es.addEventListener("run.updated", (e) => {
      try {
        onEvent({ type: "run.updated", data: JSON.parse(e.data) });
      } catch {}
    });
    es.addEventListener("assessment.created", (e) => {
      try {
        onEvent({ type: "assessment.created", data: JSON.parse(e.data) });
      } catch {}
    });
    es.addEventListener("connected", (e) => {
      try {
        onEvent({ type: "connected", data: JSON.parse(e.data) });
      } catch {}
    });
    es.onerror = () => {
      // Connection lost — components should reconcile via REST
    };
  } catch {
    // SSE not supported or server offline — components fall back to mock
    return () => {};
  }

  return () => {
    if (es) es.close();
  };
}

/**
 * Demo/rehearsal mode: simulates live anomaly events without a backend.
 * @param {(data: object) => void} onEvent
 * @param {number} intervalMs
 * @returns {() => void} cleanup function
 */
export function subscribeToMockLiveUpdates(onEvent, intervalMs = 15000) {
  const id = setInterval(() => {
    onEvent({
      type: "assessment.created",
      data: {
        station_id: "AWS005",
        timestamp: new Date().toISOString(),
        verdict: "suspected_fault",
        anomaly_score: 0.9 + Math.random() * 0.09,
        severity: "high",
        suspected_category: "temperature_sensor_fault",
        explanation:
          "Simulated live anomaly event for rehearsal. Replace with real SSE payload once backend is running.",
        affected_channels: ["temperature"],
      },
    });
  }, intervalMs);
  return () => clearInterval(id);
}

/** Legacy compat alias */
export const onAnomalyEvent = subscribeToMockLiveUpdates;
