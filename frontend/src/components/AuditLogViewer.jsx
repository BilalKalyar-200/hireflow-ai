/**
 * HireFlow AI — Audit Log Viewer.
 * Searchable timeline of every agent decision and reasoning.
 */

import { useMemo, useState } from "react";

/**
 * AuditLogViewer — displays filterable audit log entries.

 * Input props:
 *   logs: array of audit log objects from API
 *   loading: whether logs are being fetched
 * Output: JSX scrollable audit timeline
 */
export default function AuditLogViewer({ logs = [], loading = false }) {
  const [filter, setFilter] = useState("");

  /**
   * Filter logs by action name, tool, or summary text.

   * Input: none (uses filter state and logs prop)
   * Output: filtered array of log objects
   */
  const filtered = useMemo(() => {
    if (!filter.trim()) return logs;
    const q = filter.toLowerCase();
    return logs.filter(
      (log) =>
        log.action?.toLowerCase().includes(q) ||
        log.tool_used?.toLowerCase().includes(q) ||
        log.output_summary?.toLowerCase().includes(q) ||
        log.qwen_reasoning?.toLowerCase().includes(q)
    );
  }, [logs, filter]);

  /**
   * Format ISO timestamp for display.

   * Input: timestamp string from API
   * Output: short local time string
   */
  function formatTime(timestamp) {
    if (!timestamp) return "";
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  }

  return (
    <div className="card">
      <h2 className="card-title">Audit Trail</h2>

      <div className="form-group">
        <input
          type="search"
          placeholder="Search actions, tools, reasoning..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {loading && <p style={{ fontSize: "0.85rem" }}>Loading audit logs...</p>}

      {!loading && filtered.length === 0 && (
        <div className="empty-state" style={{ padding: "1rem" }}>
          No audit entries yet. Run the pipeline to see agent decisions.
        </div>
      )}

      <div className="audit-list">
        {filtered.map((log) => (
          <div key={log.id} className="audit-entry">
            <div className="time">{formatTime(log.timestamp)}</div>
            <div className="action">
              {log.action} · {log.tool_used}
              {log.tokens_used > 0 && ` · ${log.tokens_used} tokens`}
            </div>
            <div>{log.output_summary}</div>
            {log.qwen_reasoning && (
              <div style={{ color: "#64748b", marginTop: "0.25rem" }}>
                {log.qwen_reasoning.slice(0, 200)}
                {log.qwen_reasoning.length > 200 ? "…" : ""}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
