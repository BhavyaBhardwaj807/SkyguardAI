// Socket.IO client wrapper.
// Day 4 work: connect to Person 3's real Socket.IO server and listen
// for "observation" and "anomaly" events (exact event names to be
// confirmed with Person 3 — placeholders below). Until then,
// components can call subscribeToMock() to see the live-update
// behavior with fake data, so the interaction pattern is already
// proven before the real socket exists.

import { io } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";
const USE_MOCK_SOCKET = true;

let socket = null;

export function connectSocket() {
  if (USE_MOCK_SOCKET) return null;
  if (!socket) {
    socket = io(SOCKET_URL, { transports: ["websocket"] });
  }
  return socket;
}

export function onAnomalyEvent(callback) {
  if (USE_MOCK_SOCKET) {
    return null; // real subscription wired on Day 4
  }
  const s = connectSocket();
  s.on("anomaly", callback);
  return () => s.off("anomaly", callback);
}

// Lets the Overview/Map/AnomalyList pages demonstrate + rehearse the
// exact "station turns red live" interaction before Person 3's real
// events exist. Call the returned cleanup function on unmount.
export function subscribeToMockLiveUpdates(onEvent, intervalMs = 15000) {
  const id = setInterval(() => {
    onEvent({
      station_id: "AWS_005",
      timestamp: new Date().toISOString(),
      is_anomaly: true,
      anomaly_score: 0.9 + Math.random() * 0.09,
      confidence: 0.85,
      severity: "critical",
      root_cause: "temperature_sensor_fault",
      explanation:
        "Simulated live anomaly event for rehearsal — replace with real Socket.IO payload on Day 4.",
      corrected_value: null,
      correction_confidence: null,
    });
  }, intervalMs);
  return () => clearInterval(id);
}
