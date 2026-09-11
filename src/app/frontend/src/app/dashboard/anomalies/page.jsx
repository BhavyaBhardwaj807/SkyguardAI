"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import StatusBadge from "../../../components/StatusBadge";
import {
  IconFilter,
  IconSearch,
  IconCheck,
  IconClose,
  IconArrowRight,
  IconRefresh,
} from "../../../components/Icons";
import { api } from "../../../api/client";

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState([]);
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStation, setFilterStation] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [reviewedEvents, setReviewedEvents] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.getAssessments().then((data) => {
      if (mounted) {
        setAnomalies(data || []);
        if (data && data.length > 0) {
          setSelectedAnomaly(data[0]);
        }
        setIsLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleDecision = async (anomalyId, decision) => {
    setReviewedEvents((prev) => ({ ...prev, [anomalyId]: decision }));
    await api.reviewCorrection(anomalyId, decision);
  };

  const filtered = anomalies.filter((a) => {
    if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
    if (filterStation !== "all" && a.stationId !== filterStation) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.stationId?.toLowerCase().includes(q) ||
        a.stationName?.toLowerCase().includes(q) ||
        a.explanation?.toLowerCase().includes(q) ||
        a.id?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "16px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 700,
              margin: 0,
              color: "var(--text)",
              letterSpacing: "-0.01em",
            }}
          >
            Data Quality Incidents
          </h1>
          <p
            style={{
              fontSize: "15px",
              color: "var(--text-muted)",
              margin: "6px 0 0 0",
              lineHeight: 1.5,
            }}
          >
            Review automated quality checks, flagged readings, and non-destructive substitute proposals.
          </p>
        </div>

        <button
          onClick={() => {
            setIsLoading(true);
            api.getAssessments().then((d) => {
              setAnomalies(d || []);
              setIsLoading(false);
            });
          }}
          className="btn"
          disabled={isLoading}
        >
          <IconRefresh size={14} />
          <span>{isLoading ? "Syncing..." : "Refresh"}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <IconFilter size={15} color="var(--text-muted)" />
          <span style={{ fontSize: "14px", color: "var(--text)", fontWeight: 500 }}>
            Filter:
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label htmlFor="severity-select" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            Severity
          </label>
          <select
            id="severity-select"
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="input"
            style={{ padding: "6px 10px", fontSize: "13.5px" }}
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical (Faults)</option>
            <option value="warning">Warning (Sensor Drift)</option>
            <option value="normal">Conforming / Resolved</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label htmlFor="station-select" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            Station
          </label>
          <select
            id="station-select"
            value={filterStation}
            onChange={(e) => setFilterStation(e.target.value)}
            className="input"
            style={{ padding: "6px 10px", fontSize: "13.5px" }}
          >
            <option value="all">All Stations</option>
            <option value="AWS001">AWS001 (Ridgeview North)</option>
            <option value="AWS002">AWS002 (Ridgeview South)</option>
            <option value="AWS003">AWS003 (Coastal Flats)</option>
            <option value="AWS004">AWS004 (Highland Pass)</option>
            <option value="AWS005">AWS005 (River Delta)</option>
            <option value="AWS006">AWS006 (Valley Center)</option>
          </select>
        </div>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "var(--bg)",
            padding: "4px 12px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
          }}
        >
          <IconSearch size={14} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search station, channel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text)",
              fontSize: "14px",
              width: "200px",
            }}
          />
        </div>
      </div>

      {/* Main Two-Column Incident Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: "20px",
          alignItems: "start",
        }}
      >
        {/* Incident Worklist Table */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div
            style={{
              padding: "12px 18px",
              borderBottom: "1px solid var(--border)",
              background: "var(--surface)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>
              Incidents ({filtered.length})
            </span>
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              Click row to inspect evidence
            </span>
          </div>

          <div className="table-container" style={{ border: "none" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Station</th>
                  <th>Channel</th>
                  <th>Observed</th>
                  <th>Verdict</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "14px" }}>
                      No matching incidents found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((a) => {
                    const isSelected = selectedAnomaly?.id === a.id;
                    const review = reviewedEvents[a.id];

                    return (
                      <tr
                        key={a.id}
                        onClick={() => setSelectedAnomaly(a)}
                        style={{
                          cursor: "pointer",
                          background: isSelected ? "var(--surface-hover)" : undefined,
                        }}
                      >
                        <td>
                          <div style={{ fontWeight: 600, fontSize: "14.5px", color: "var(--text)" }}>
                            {a.stationName}
                          </div>
                          <div className="data-mono" style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
                            {a.stationId} &middot; {a.id}
                          </div>
                        </td>
                        <td style={{ textTransform: "capitalize", fontSize: "14px" }}>
                          {a.channel?.replace("_", " ")}
                        </td>
                        <td className="data-mono" style={{ fontSize: "14px" }}>
                          <span
                            style={{
                              color:
                                a.severity === "critical"
                                  ? "var(--status-critical)"
                                  : a.severity === "warning"
                                  ? "var(--status-warning)"
                                  : "var(--text)",
                              fontWeight: 600,
                            }}
                          >
                            {a.rawValue}
                          </span>
                        </td>
                        <td>
                          <StatusBadge verdict={a.verdict} />
                        </td>
                        <td>
                          {review ? (
                            <span
                              className={`badge ${
                                review === "accepted" ? "badge-normal" : "badge-critical"
                              }`}
                              style={{ fontSize: "12px" }}
                            >
                              {review.toUpperCase()}
                            </span>
                          ) : (
                            <span className="badge badge-neutral" style={{ fontSize: "12px" }}>
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Incident Inspection Drawer */}
        {selectedAnomaly ? (
          <div
            className="card"
            style={{
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                borderBottom: "1px solid var(--border)",
                paddingBottom: "14px",
              }}
            >
              <div>
                <span className="data-mono" style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
                  Incident ID: {selectedAnomaly.id}
                </span>
                <h2 style={{ margin: "4px 0 0 0", fontSize: "18px", fontWeight: 600, color: "var(--text)" }}>
                  {selectedAnomaly.stationName} ({selectedAnomaly.stationId})
                </h2>
              </div>
              <StatusBadge verdict={selectedAnomaly.verdict} />
            </div>

            {/* Explanation */}
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
                Diagnostic Reason
              </div>
              <p
                style={{
                  fontSize: "14.5px",
                  lineHeight: 1.6,
                  color: "var(--text)",
                  margin: 0,
                  background: "var(--bg)",
                  padding: "14px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                }}
              >
                {selectedAnomaly.explanation}
              </p>
            </div>

            {/* Comparison Values */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              <div style={{ background: "var(--bg)", padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                <div style={{ color: "var(--text-muted)", fontSize: "12.5px" }}>Observed Reading</div>
                <div className="data-mono" style={{ fontSize: "18px", fontWeight: 700, color: "var(--status-critical)", marginTop: "2px" }}>
                  {selectedAnomaly.rawValue}
                </div>
              </div>

              <div style={{ background: "var(--bg)", padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                <div style={{ color: "var(--text-muted)", fontSize: "12.5px" }}>Expected Baseline</div>
                <div className="data-mono" style={{ fontSize: "18px", fontWeight: 600, color: "var(--text)", marginTop: "2px" }}>
                  {selectedAnomaly.expectedBaseline}
                </div>
              </div>

              <div style={{ background: "var(--bg)", padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                <div style={{ color: "var(--text-muted)", fontSize: "12.5px" }}>Regional Consensus</div>
                <div className="data-mono" style={{ fontSize: "18px", fontWeight: 600, color: "var(--text)", marginTop: "2px" }}>
                  {selectedAnomaly.spatialConsensus}
                </div>
              </div>

              <div style={{ background: "var(--bg)", padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                <div style={{ color: "var(--text-muted)", fontSize: "12.5px" }}>Model Anomaly Score</div>
                <div className="data-mono" style={{ fontSize: "18px", fontWeight: 700, color: "var(--accent)", marginTop: "2px" }}>
                  {selectedAnomaly.anomalyScore}
                </div>
              </div>
            </div>

            {/* Correction Proposal */}
            {selectedAnomaly.correctionProposal ? (
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: "14px 16px",
                  background: "var(--bg)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--accent)" }}>
                    Non-Destructive Correction Proposal
                  </span>
                  <span className="data-mono" style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
                    Confidence: {Math.round(selectedAnomaly.correctionProposal.confidence * 100)}%
                  </span>
                </div>

                <div style={{ fontSize: "14px", color: "var(--text)", lineHeight: 1.5 }}>
                  Suggested Substitute:{" "}
                  <strong className="data-mono" style={{ color: "var(--accent)", fontSize: "15px" }}>
                    {selectedAnomaly.correctionProposal.proposedValue ?? "Unavailable"}
                  </strong>{" "}
                  &middot; Method: {selectedAnomaly.correctionProposal.method?.replace("_", " ")}
                </div>

                <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "6px" }}>
                  {selectedAnomaly.correctionProposal.notes}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: "13.5px", color: "var(--text-muted)", padding: "8px 0" }}>
                No automatic substitute proposed for this observation.
              </div>
            )}

            {/* Actions */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
              <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "10px" }}>
                Operator Review Decision (Raw readings are always preserved)
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => handleDecision(selectedAnomaly.id, "accepted")}
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: "center", padding: "10px 14px" }}
                >
                  <IconCheck size={15} />
                  <span>Accept Substitute</span>
                </button>
                <button
                  onClick={() => handleDecision(selectedAnomaly.id, "rejected")}
                  className="btn"
                  style={{ flex: 1, justifyContent: "center", padding: "10px 14px" }}
                >
                  <IconClose size={15} />
                  <span>Confirm Fault</span>
                </button>
              </div>

              <div style={{ marginTop: "14px", textAlign: "right" }}>
                <Link
                  href={`/dashboard/stations/${selectedAnomaly.stationId}`}
                  style={{
                    color: "var(--accent)",
                    textDecoration: "none",
                    fontSize: "13.5px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>Open Station Telemetry</span>
                  <IconArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "14px" }}>
            Select an incident row from the list to view diagnostic evidence.
          </div>
        )}
      </div>
    </div>
  );
}
