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
                      {current || absent
                        ? s.assessment!.verdict
                        : s.processing_status || "Historical context"}
                      {s.assessment && (
                        <details>
                          <summary>
                            Evidence{" "}
                            {current || absent ? "" : "(previous observation)"}
                          </summary>
                          <p>{s.assessment.explanation}</p>
                          <small>
                            Score: {s.assessment.anomalyScore ?? "Unavailable"}
                          </small>
                        </details>
                      )}
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
