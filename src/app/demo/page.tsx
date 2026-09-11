"use client";
import { useCallback, useEffect, useState } from "react";
type Run = {
  id: string;
  state: string;
  position: number;
  scenario: string;
  last_observed_at: string | null;
};
type StationRow = {
  metadata: { stationId: string; name: string };
  raw: {
    temperatureC: number | null;
    relativeHumidityPct: number | null;
    pressureHpa: number | null;
  } | null;
  observed_at: string | null;
  assessment: {
    verdict: string;
    observedAt: string;
    explanation: string;
    anomalyScore: number | null;
    severity?: string;
    suspectedCategory?: string | null;
    affectedChannels?: string[];
  } | null;
  processing_status: string | null;
};
async function api(path: string, body?: unknown) {
  const r = await fetch("/api/v1" + path, {
    ...(body
      ? {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
    cache: "no-store",
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message || "Request failed");
  return data;
}
export default function Demo() {
  const [scenarios, setScenarios] = useState<{ id: string; label: string }[]>(
      [],
    ),
    [scenario, setScenario] = useState("spike"),
    [run, setRun] = useState<Run | null>(null),
    [stations, setStations] = useState<StationRow[]>([]),
    [connection, setConnection] = useState("Not connected"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api("/replay/scenarios")
      .then((d) => {
        setScenarios(d.data);
        if (!d.data.some((s: { id: string }) => s.id === "spike"))
          setScenario(d.data[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);
  const refresh = useCallback(async () => {
    if (!run?.id) return;
    const [r, s] = await Promise.all([
      api(`/replay/runs/${run.id}`),
      api(`/stations?runId=${run.id}`),
    ]);
    setRun(r);
    setStations(s.data);
  }, [run?.id]);
  useEffect(() => {
    if (!run?.id) return;
    let active = true;
    const sync = () =>
      refresh().catch((e) => {
        if (active) setError(e.message);
      });
    void sync();
    const source = new EventSource(`/api/v1/events?runId=${run.id}`);
    source.addEventListener("connected", () => {
      setConnection("Live");
      void sync();
    });
    for (const event of ["batch.processed", "processing.failed", "run.updated"])
      source.addEventListener(event, () => void sync());
    source.onerror = () =>
      setConnection("Reconnecting; refreshing every 2 seconds");
    const timer = setInterval(sync, 2000);
    return () => {
      active = false;
      clearInterval(timer);
      source.close();
    };
  }, [run?.id, refresh]);
  async function act(action: string) {
    setBusy(true);
    setError("");
    try {
      if (action === "create") {
        const r = await api("/replay/runs", { scenarioId: scenario });
        setStations([]);
        setRun(r);
      } else if (run) {
        setRun(await api(`/replay/runs/${run.id}/control`, { action }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main>
      <header>
        <p className="eyebrow">SKYGUARD AI / LOCAL DEMO</p>
        <h1>Weather data quality</h1>
        <p>
          Inspect replayed observations and the evidence returned by the
          backend.
        </p>
      </header>
      <aside>
        Existing feature replay · Six modelled locations · Surface pressure
        <br />
        Uses the unchanged Python model. Historical feature limitations remain;
        this is not validated live sensor detection.
      </aside>
      <section className="controls">
        <label>
          Scenario
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={busy || !scenarios.length}
          onClick={() => act("create")}
        >
          New run
        </button>
        {["start", "pause", "step"].map((a) => (
          <button
            key={a}
            disabled={
              busy || !run || ["failed", "completed"].includes(run.state)
            }
            onClick={() => act(a)}
          >
            {a}
          </button>
        ))}
      </section>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <section className="status">
        <span>Run: {run?.state || "Not created"}</span>
        <span>{connection}</span>
        <span>
          Event time:{" "}
          {run?.last_observed_at
            ? new Date(run.last_observed_at).toISOString()
            : "Awaiting data"}
        </span>
      </section>
      {run?.state === "failed" && (
        <p className="error">
          Processing failed. Raw observations are retained. Inspect the job
          through the API and retry it before resuming.
        </p>
      )}
      {!run ? (
        <p className="empty">
          Create a run, then start or step through the observations.
        </p>
      ) : (
        <div className="table">
          <table>
            <thead>
              <tr>
                <th>Location</th>
                <th>Temperature °C</th>
                <th>Humidity %</th>
                <th>Pressure hPa</th>
                <th>Assessment</th>
              </tr>
            </thead>
            <tbody>
              {stations.map((s) => {
                const current =
                  s.assessment && s.assessment.observedAt === s.observed_at;
                const absent =
                  s.assessment &&
                  (!s.observed_at || s.assessment.observedAt > s.observed_at);
                return (
                  <tr key={s.metadata.stationId}>
                    <td>
                      {s.metadata.name}
                      <small>{s.metadata.stationId}</small>
                    </td>
                    <td>
                      {absent ? "Missing" : (s.raw?.temperatureC ?? "Missing")}
                    </td>
                    <td>
                      {absent
                        ? "Missing"
                        : (s.raw?.relativeHumidityPct ?? "Missing")}
                    </td>
                    <td>
                      {absent ? "Missing" : (s.raw?.pressureHpa ?? "Missing")}
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: 4,
                              fontSize: 12,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              background:
                                s.assessment?.verdict === "normal"
                                  ? "rgba(16, 185, 129, 0.15)"
                                  : s.assessment?.verdict === "suspected_fault"
                                    ? "rgba(239, 68, 68, 0.2)"
                                    : "rgba(245, 158, 11, 0.2)",
                              color:
                                s.assessment?.verdict === "normal"
                                  ? "#10b981"
                                  : s.assessment?.verdict === "suspected_fault"
                                    ? "#ef4444"
                                    : "#f59e0b",
                            }}
                          >
                            {current || absent
                              ? s.assessment!.verdict.replace(/_/g, " ")
                              : s.processing_status || "Historical context"}
                          </span>
                          {s.assessment?.severity &&
                            s.assessment.severity !== "none" && (
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  textTransform: "uppercase",
                                  color: "#94a3b8",
                                }}
                              >
                                {s.assessment.severity} severity
                              </span>
                            )}
                        </div>
                        {s.assessment?.suspectedCategory && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "#cbd5e1",
                            }}
                          >
                            Root cause:{" "}
                            <strong>
                              {s.assessment.suspectedCategory.replace(
                                /_/g,
                                " ",
                              )}
                            </strong>
                          </div>
                        )}
                        {s.assessment && (
                          <details style={{ marginTop: 2 }}>
                            <summary
                              style={{
                                cursor: "pointer",
                                fontSize: 12,
                                color: "#38bdf8",
                              }}
                            >
                              Evidence{" "}
                              {current || absent
                                ? ""
                                : "(previous observation)"}
                            </summary>
                            <div
                              style={{
                                padding: "6px 0",
                                fontSize: 12,
                                color: "#94a3b8",
                                display: "flex",
                                flexDirection: "column",
                                gap: 4,
                              }}
                            >
                              <p style={{ margin: 0 }}>
                                {s.assessment.explanation}
                              </p>
                              <div
                                style={{
                                  display: "flex",
                                  gap: 12,
                                  marginTop: 4,
                                  fontSize: 11,
                                }}
                              >
                                <span>
                                  Anomaly Score:{" "}
                                  <strong>
                                    {s.assessment.anomalyScore != null
                                      ? s.assessment.anomalyScore.toFixed(3)
                                      : "Unavailable"}
                                  </strong>
                                </span>
                                {s.assessment.affectedChannels &&
                                  s.assessment.affectedChannels.length > 0 && (
                                    <span>
                                      Channels:{" "}
                                      <strong>
                                        {s.assessment.affectedChannels.join(
                                          ", ",
                                        )}
                                      </strong>
                                    </span>
                                  )}
                              </div>
                            </div>
                          </details>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <footer>
        Raw observations are preserved. Unknown and failed states are never
        displayed as healthy.
      </footer>
    </main>
  );
}
