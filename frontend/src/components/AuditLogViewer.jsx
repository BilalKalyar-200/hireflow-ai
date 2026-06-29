/**
 * FILE 11 of 14 — Audit Log Viewer.
 * Timeline with filters, expandable reasoning, and relative timestamps.
 */

import { useMemo, useState } from "react";
import { AUDIT_FILTERS, relativeTime } from "../utils/constants";

/**
 * Single audit log timeline item with expandable reasoning.
 * Input: log object
 * Output: JSX timeline row
 */
function AuditItem({ log }) {
  const [expanded, setExpanded] = useState(false);
  const hasReasoning = Boolean(log.qwen_reasoning?.trim());

  return (
    <div className="audit-item">
      <div className="audit-dot" style={{ background: log.status === "success" ? "#2563EB" : "#DC2626" }} />
      <div className="audit-content">
        <div className="audit-action">{log.action}</div>
        <div style={{ fontSize: "0.82rem", marginTop: "0.15rem" }}>{log.output_summary}</div>
        <div className="audit-meta">
          <span className="tool-badge">{log.tool_used}</span>
          {log.tokens_used > 0 && (
            <span className="token-pill">{log.tokens_used} tokens</span>
          )}
          <span className="audit-time">{relativeTime(log.timestamp)}</span>
        </div>
        {hasReasoning && (
          <>
            <button
              type="button"
              className="audit-expand"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Hide reasoning ▲" : "Show Qwen reasoning ▼"}
            </button>
            {expanded && (
              <div className="audit-reasoning">{log.qwen_reasoning}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * AuditLogViewer — full-width audit panel with filter buttons.
 * Input: logs array, loading boolean
 * Output: JSX audit timeline
 */
export default function AuditLogViewer({ logs = [], loading = false }) {
  const [activeFilter, setActiveFilter] = useState("all");

  /**
   * Filter logs by selected category button.
   * Input: uses activeFilter state
   * Output: filtered log array
   */
  const filtered = useMemo(() => {
    const filterDef = AUDIT_FILTERS.find((f) => f.id === activeFilter);
    if (!filterDef) return logs;
    return logs.filter(filterDef.match);
  }, [logs, activeFilter]);

  return (
    <div className="audit-panel">
      <h2 className="card-title" style={{ marginBottom: "0.75rem" }}>
        📋 Audit Trail
      </h2>

      <div className="audit-filters">
        {AUDIT_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`filter-btn ${activeFilter === f.id ? "active" : ""}`}
            onClick={() => setActiveFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="empty-state" style={{ padding: "1rem" }}>
          <span className="btn-spinner" style={{ borderColor: "var(--color-border)", borderTopColor: "var(--color-primary)" }} />
          {" "}Loading audit logs...
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="empty-state">
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔍</div>
          <p>No audit entries yet. Run the pipeline to see every agent decision logged here.</p>
        </div>
      )}

      <div className="audit-timeline">
        {filtered.map((log) => (
          <AuditItem key={log.id} log={log} />
        ))}
      </div>
    </div>
  );
}
