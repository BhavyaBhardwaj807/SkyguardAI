// Mock data reflecting the 6 Northern India AWS stations and Isolation Forest v2 contracts.
// Used when standalone or when the backend service is offline.

export const mockStations = [
  {
    stationId: "AWS001",
    station_id: "AWS001",
    name: "Ridgeview North",
    lat: 28.7041,
    lon: 77.1025,
    elevationM: 216,
    status: "normal",
    verdict: "normal",
    health_score: 96,
    healthScore: 96,
    observedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    reading: {
      temperature: 24.1,
      temperatureC: 24.1,
      humidity: 58,
      relativeHumidityPct: 58,
      pressure: 1012.4,
      pressureHpa: 1012.4,
    },
    channels: {
      temperature: { score: 98, status: "healthy", drift: 0.2 },
      humidity: { score: 94, status: "healthy", drift: 0.6 },
      pressure: { score: 97, status: "healthy", drift: 0.1 },
    }
  },
  {
    stationId: "AWS002",
    station_id: "AWS002",
    name: "Ridgeview South",
    lat: 28.6139,
    lon: 77.2090,
    elevationM: 221,
    status: "normal",
    verdict: "normal",
    health_score: 92,
    healthScore: 92,
    observedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    reading: {
      temperature: 25.3,
      temperatureC: 25.3,
      humidity: 61,
      relativeHumidityPct: 61,
      pressure: 1011.8,
      pressureHpa: 1011.8,
    },
    channels: {
      temperature: { score: 95, status: "healthy", drift: 0.4 },
      humidity: { score: 90, status: "healthy", drift: 0.8 },
      pressure: { score: 92, status: "healthy", drift: 0.3 },
    }
  },
  {
    stationId: "AWS003",
    station_id: "AWS003",
    name: "Coastal Flats",
    lat: 28.5355,
    lon: 77.3910,
    elevationM: 198,
    status: "warning",
    verdict: "suspected_drift",
    health_score: 71,
    healthScore: 71,
    observedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    reading: {
      temperature: 26.7,
      temperatureC: 26.7,
      humidity: 79,
      relativeHumidityPct: 79,
      pressure: 1009.1,
      pressureHpa: 1009.1,
    },
    channels: {
      temperature: { score: 88, status: "healthy", drift: 0.5 },
      humidity: { score: 54, status: "degraded", drift: 2.4 },
      pressure: { score: 89, status: "healthy", drift: 0.4 },
    }
  },
  {
    stationId: "AWS004",
    station_id: "AWS004",
    name: "Highland Pass",
    lat: 28.9845,
    lon: 77.7064,
    elevationM: 242,
    status: "normal",
    verdict: "normal",
    health_score: 97,
    healthScore: 97,
    observedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    reading: {
      temperature: 21.4,
      temperatureC: 21.4,
      humidity: 52,
      relativeHumidityPct: 52,
      pressure: 1015.6,
      pressureHpa: 1015.6,
    },
    channels: {
      temperature: { score: 98, status: "healthy", drift: 0.1 },
      humidity: { score: 96, status: "healthy", drift: 0.3 },
      pressure: { score: 98, status: "healthy", drift: 0.2 },
    }
  },
  {
    stationId: "AWS005",
    station_id: "AWS005",
    name: "River Delta",
    lat: 28.4595,
    lon: 77.0266,
    elevationM: 205,
    status: "critical",
    verdict: "suspected_fault",
    health_score: 42,
    healthScore: 42,
    observedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    reading: {
      temperature: 42.7,
      temperatureC: 42.7,
      humidity: 61,
      relativeHumidityPct: 61,
      pressure: 1008.2,
      pressureHpa: 1008.2,
    },
    channels: {
      temperature: { score: 28, status: "fault", drift: 4.8 },
      humidity: { score: 84, status: "healthy", drift: 0.7 },
      pressure: { score: 82, status: "healthy", drift: 0.5 },
    }
  },
  {
    stationId: "AWS006",
    station_id: "AWS006",
    name: "Valley Center",
    lat: 28.6692,
    lon: 77.4538,
    elevationM: 211,
    status: "normal",
    verdict: "normal",
    health_score: 89,
    healthScore: 89,
    observedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    reading: {
      temperature: 25.9,
      temperatureC: 25.9,
      humidity: 60,
      relativeHumidityPct: 60,
      pressure: 1010.9,
      pressureHpa: 1010.9,
    },
    channels: {
      temperature: { score: 91, status: "healthy", drift: 0.4 },
      humidity: { score: 88, status: "healthy", drift: 0.6 },
      pressure: { score: 92, status: "healthy", drift: 0.3 },
    }
  },
];

export const mockAnomalies = [
  {
    id: "AN-2026-0901",
    stationId: "AWS005",
    station_id: "AWS005",
    stationName: "River Delta",
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    channel: "temperature",
    verdict: "suspected_fault",
    severity: "critical",
    anomalyScore: 0.94,
    anomaly_score: 0.94,
    confidence: 0.88,
    rawValue: 42.7,
    expectedBaseline: 24.9,
    deviation: "+17.8°C",
    spatialConsensus: 25.4,
    rootCause: "temperature_sensor_spike",
    root_cause: "temperature_sensor_fault",
    explanation: "Temperature increased +17.8°C in 5 minutes (5.2σ above baseline). Nearest healthy neighbors (AWS002, AWS001) measured 25.3°C and 24.1°C without accompanying regional barometric pressure decline.",
    correctionProposal: {
      proposedValue: 25.4,
      method: "spatial_distance_weighted",
      confidence: 0.71,
      reviewStatus: "pending_review",
      notes: "Nearest stations exceed 25 km threshold; review recommended before substituting in downstream products."
    }
  },
  {
    id: "AN-2026-0894",
    stationId: "AWS003",
    station_id: "AWS003",
    stationName: "Coastal Flats",
    timestamp: new Date(Date.now() - 38 * 60 * 1000).toISOString(),
    channel: "relative_humidity",
    verdict: "suspected_drift",
    severity: "warning",
    anomalyScore: 0.61,
    anomaly_score: 0.61,
    confidence: 0.70,
    rawValue: 79.0,
    expectedBaseline: 62.0,
    deviation: "+17.0%",
    spatialConsensus: 60.5,
    rootCause: "hygrometer_drift",
    root_cause: "possible_drift",
    explanation: "Relative humidity has drifted upward by 2.4% per hour across a 6-hour window while barometric pressure and ambient temperature remained steady, characteristic of capacitive sensor saturation.",
    correctionProposal: {
      proposedValue: null,
      method: "spatial_estimate_unavailable",
      confidence: 0.42,
      reviewStatus: "manual_inspection_required",
      notes: "Neighbor consensus variance too high (>18%) to synthesize an automated substitute."
    }
  },
  {
    id: "AN-2026-0881",
    stationId: "AWS002",
    station_id: "AWS002",
    stationName: "Ridgeview South",
    timestamp: new Date(Date.now() - 145 * 60 * 1000).toISOString(),
    channel: "pressure",
    verdict: "resolved",
    severity: "normal",
    anomalyScore: 0.22,
    anomaly_score: 0.22,
    confidence: 0.94,
    rawValue: 1011.8,
    expectedBaseline: 1011.5,
    deviation: "+0.3 hPa",
    spatialConsensus: 1012.0,
    rootCause: "transient_comm_dropout",
    root_cause: "transient_dropout",
    explanation: "Temporary 1-interval transmission hiatus resolved on next polling frame; sensor readings conform to regional isobar pattern.",
    correctionProposal: null
  }
];

// 24-hour diurnal curve matching northern India temperate/subtropical conditions
export const mock24hHistory = [
  { time: "00:00", AWS001: 20.2, AWS002: 21.0, AWS003: 21.5, AWS004: 18.4, AWS005: 20.5, AWS006: 21.2, baseline: 20.5 },
  { time: "02:00", AWS001: 19.5, AWS002: 20.1, AWS003: 20.8, AWS004: 17.6, AWS005: 19.8, AWS006: 20.4, baseline: 19.7 },
  { time: "04:00", AWS001: 18.8, AWS002: 19.4, AWS003: 20.1, AWS004: 16.9, AWS005: 19.0, AWS006: 19.8, baseline: 19.0 },
  { time: "06:00", AWS001: 19.2, AWS002: 19.9, AWS003: 20.5, AWS004: 17.5, AWS005: 19.4, AWS006: 20.1, baseline: 19.4 },
  { time: "08:00", AWS001: 21.8, AWS002: 22.6, AWS003: 23.4, AWS004: 20.0, AWS005: 22.1, AWS006: 23.0, baseline: 22.2 },
  { time: "10:00", AWS001: 25.4, AWS002: 26.2, AWS003: 27.1, AWS004: 23.5, AWS005: 25.8, AWS006: 26.7, baseline: 25.8 },
  { time: "12:00", AWS001: 28.6, AWS002: 29.5, AWS003: 30.2, AWS004: 26.8, AWS005: 29.0, AWS006: 29.8, baseline: 29.0 },
  { time: "14:00", AWS001: 30.5, AWS002: 31.4, AWS003: 32.0, AWS004: 28.5, AWS005: 31.1, AWS006: 31.8, baseline: 30.9 },
  { time: "15:00", AWS001: 30.1, AWS002: 31.0, AWS003: 31.6, AWS004: 28.0, AWS005: 42.7, AWS006: 31.2, baseline: 30.4, anomaly: true },
  { time: "16:00", AWS001: 29.2, AWS002: 30.1, AWS003: 30.8, AWS004: 27.2, AWS005: 41.5, AWS006: 30.4, baseline: 29.5, anomaly: true },
  { time: "18:00", AWS001: 27.0, AWS002: 28.0, AWS003: 28.8, AWS004: 25.0, AWS005: 38.2, AWS006: 28.3, baseline: 27.6, anomaly: true },
  { time: "20:00", AWS001: 25.2, AWS002: 26.1, AWS003: 27.0, AWS004: 23.2, AWS005: 34.0, AWS006: 26.4, baseline: 25.7 },
  { time: "NOW",   AWS001: 24.1, AWS002: 25.3, AWS003: 26.7, AWS004: 21.4, AWS005: 42.7, AWS006: 25.9, baseline: 24.9, anomaly: true },
];

export const mockScenarios = [
  { id: "spike", label: "Single-station temperature sensor spike (AWS005)", description: "Sudden +17.8°C shift isolated to one thermistor. Tests spatial consensus rejection." },
  { id: "drift", label: "Multi-hour capacitive humidity drift (AWS003)", description: "Slow upward sensor drift over 6 hours without pressure correlation." },
  { id: "gap", label: "Intermittent telemetry transmission dropout", description: "Missing data packets with audited retention of prior known-good reading." },
  { id: "extreme_weather", label: "Regional convective squall (conforming)", description: "Correlated pressure drop and gust front detected across 4 stations simultaneously." }
];

export const mockReplayRun = {
  id: "run-20260911-001",
  state: "running",
  scenario: "spike",
  speed: 1.0,
  position: 182,
  totalObservations: 240,
  lastObservedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  connectionState: "connected"
};

export const mockEvaluation = {
  modelName: "Isolation Forest v2 (Spatial Altitude-Adjusted)",
  trainedArtifact: "ml-isolation-forest-v2.pkl",
  framework: "scikit-learn 1.9.0",
  evaluationDate: "2026-09-08",
  datasetSamples: 14400,
  zeroSampleRegionalAlarm: "0 regional false alarms across 30-day baseline test",
  metrics: {
    precision: 0.942,
    recall: 0.918,
    f1Score: 0.930,
    falsePositiveRate: 0.008,
    inferenceLatencyMs: 4.2
  },
  limitations: [
    "Spatial consensus radius is constrained to 100 km. Distant stations (>100 km) cannot serve as reference neighbors.",
    "Regional convective storms require synchronized pressure drops across ≥3 stations to avoid being classified as localized faults.",
    "Offline feature leakage precautions apply: live causal inference only evaluates preceding observations."
  ]
};

export function mockDelay(data, ms = 200) {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}
