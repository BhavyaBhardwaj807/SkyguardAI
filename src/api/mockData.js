// Mock data shaped EXACTLY to the contract in Section 8 of the
// distribution plan (Node -> React, Layer 2) plus the station list
// shape implied by GET /api/stations. When Person 3's real endpoints
// are live, only api/client.js needs to change — components should
// never know the difference.

export const mockStations = [
  { station_id: "AWS_001", name: "Ridgeview North", lat: 28.7041, lon: 77.1025, status: "normal", health_score: 96, reading: { temperature: 24.1, humidity: 58, pressure: 1012.4 } },
  { station_id: "AWS_002", name: "Ridgeview South", lat: 28.6139, lon: 77.209, status: "normal", health_score: 91, reading: { temperature: 25.3, humidity: 61, pressure: 1011.8 } },
  { station_id: "AWS_003", name: "Coastal Flats", lat: 28.5355, lon: 77.391, status: "warning", health_score: 74, reading: { temperature: 26.7, humidity: 79, pressure: 1009.1 } },
  { station_id: "AWS_004", name: "Highland Pass", lat: 28.9845, lon: 77.7064, status: "normal", health_score: 98, reading: { temperature: 21.4, humidity: 52, pressure: 1015.6 } },
  { station_id: "AWS_005", name: "River Delta", lat: 28.4595, lon: 77.0266, status: "critical", health_score: 41, reading: { temperature: 42.7, humidity: 61, pressure: 1008.2 } },
  { station_id: "AWS_006", name: "Valley Center", lat: 28.6692, lon: 77.4538, status: "normal", health_score: 88, reading: { temperature: 25.9, humidity: 60, pressure: 1010.9 } },
  { station_id: "AWS_007", name: "Summit East", lat: 28.7501, lon: 77.117, status: "normal", health_score: 93, reading: { temperature: 22.6, humidity: 55, pressure: 1013.7 } },
];

export const mockAnomalies = [
  {
    station_id: "AWS_005",
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    is_anomaly: true,
    anomaly_score: 0.94,
    confidence: 0.88,
    severity: "critical",
    root_cause: "temperature_sensor_fault",
    explanation:
      "Temperature increased 17.8\u00b0C in 5 minutes, is 5.2\u03c3 above the station's baseline, and differs substantially from nearby stations. Pressure and humidity did not show an accompanying regional change.",
    corrected_value: 32.4,
    correction_confidence: 0.71,
    deviation_from_baseline: 17.8,
  },
  {
    station_id: "AWS_003",
    timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    is_anomaly: true,
    anomaly_score: 0.61,
    confidence: 0.7,
    severity: "warning",
    root_cause: "possible_drift",
    explanation:
      "Humidity reading has drifted steadily upward over 6 hours without a matching pressure trend, consistent with sensor drift rather than a genuine weather change.",
    corrected_value: null,
    correction_confidence: null,
    deviation_from_baseline: 6.2,
  },
];

export function mockDelay(data, ms = 350) {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

// Small trend histories for KPI sparklines - shape only, real values come
// from Person 3's history endpoint once wired.
export const mockTrends = {
  stationsOnline: [7, 7, 6, 7, 7, 7, 7],
  activeAnomalies: [0, 0, 1, 1, 1, 2, 2],
  criticalStations: [0, 0, 0, 0, 1, 1, 1],
};

export const mockTemperatureTrend = [
  { t: "12AM", v: 18 }, { t: "2AM", v: 17 }, { t: "4AM", v: 16 },
  { t: "6AM", v: 17 }, { t: "8AM", v: 21 }, { t: "10AM", v: 25 },
  { t: "12PM", v: 29 }, { t: "2PM", v: 31 },
  { t: "4PM", v: 33, anomaly: true, station_id: "AWS_005", deviation: 8.4, probability: 0.94 },
  { t: "6PM", v: 32 }, { t: "8PM", v: 27 }, { t: "NOW", v: 32 },
];

export const mockSensorHealthBreakdown = [
  { label: "Temperature", percent: 91 },
  { label: "Pressure", percent: 87 },
  { label: "Humidity", percent: 72 },
];
