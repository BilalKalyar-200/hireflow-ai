/**
 * FILE 12 of 14 — Main Dashboard Page.
 * 2-column layout: sidebar + main Kanban/audit with drawer and toasts.
 */

import { useCallback, useEffect, useState } from "react";
import AuditLogViewer from "../components/AuditLogViewer";
import CandidateDetail from "../components/CandidateDetail";
import JobIntakePanel from "../components/JobIntakePanel";
import PipelineView from "../components/PipelineView";
import ResumeUploadZone from "../components/ResumeUploadZone";
import { useWebSocket } from "../hooks/useWebSocket";
import {
  createJob,
  getAuditLogs,
  getCandidate,
  getPipelineStatus,
  listCandidates,
  listJobs,
  reviewCandidate,
  runPipeline,
  uploadResumes,
} from "../services/api";

/** Pipeline statuses that should keep candidate list polling active */
const POLLING_STATUSES = new Set([
  "running",
  "completed",
  "completed_with_errors",
]);

/**
 * ToastContainer — renders stacked toast notifications top-right.
 * Input: toasts array, onDismiss function
 * Output: JSX toast stack
 */
function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast-${t.type}`}
          onClick={() => onDismiss(t.id)}
        >
          <span className="toast-icon">
            {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"}
          </span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Dashboard — root page with sidebar, Kanban, audit panel, drawer, toasts.
 * Input: none
 * Output: full redesigned dashboard JSX
 */
export default function Dashboard() {
  const [activeJob, setActiveJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [activeTab, setActiveTab] = useState("pipeline");
  const [toasts, setToasts] = useState([]);

  /**
   * Add a toast notification that auto-dismisses after 4 seconds.
   * Input: message string, type success|error|info
   * Output: none
   */
  const addToast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  /**
   * Dismiss one toast by id.
   * Input: toast id
   * Output: none
   */
  function dismissToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  /**
   * Fetch latest candidates from GET /candidates for the active job.
   * Input: none
   * Output: updates candidates state
   */
  const refreshCandidates = useCallback(async () => {
    if (!activeJob?.id) return;
    try {
      const candRes = await listCandidates(activeJob.id);
      setCandidates(candRes.candidates || []);
    } catch (err) {
      addToast(err.message, "error");
    }
  }, [activeJob?.id, addToast]);

  /**
   * Refresh candidates and audit logs for active job.
   * Input: none
   * Output: updates candidates and auditLogs state
   */
  const refreshJobData = useCallback(async () => {
    if (!activeJob?.id) return;
    try {
      await refreshCandidates();
    } catch (err) {
      addToast(err.message, "error");
    }
  }, [activeJob?.id, addToast, refreshCandidates]);

  const refreshAuditLogs = useCallback(async () => {
    if (!activeJob?.id) return;
    try {
      setAuditLoading(true);
      const auditRes = await getAuditLogs(activeJob.id);
      setAuditLogs(auditRes.logs || []);
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setAuditLoading(false);
    }
  }, [activeJob?.id, addToast]);

  /**
   * Refresh pipeline status from API.
   * Input: none
   * Output: updates pipelineStatus and pipelineRunning
   */
  const refreshPipelineStatus = useCallback(async () => {
    if (!activeJob?.id) return null;
    try {
      const status = await getPipelineStatus(activeJob.id);
      setPipelineStatus(status);
      if (status.status === "running") {
        setPipelineRunning(true);
      } else if (status.status === "idle") {
        setPipelineRunning(false);
      } else if (
        status.status === "completed" ||
        status.status === "completed_with_errors"
      ) {
        setPipelineRunning(false);
      }
      return status;
    } catch {
      return null;
    }
  }, [activeJob?.id]);

  /**
   * Handle WebSocket pipeline events.
   * Input: event object from WebSocket
   * Output: refreshes data on matching job events
   */
  const handleWsEvent = useCallback(
    (event) => {
      if (!activeJob?.id || event.job_id !== activeJob.id) return;
      refreshCandidates();
      refreshPipelineStatus();
      if (event.event_type === "pipeline_complete") {
        setPipelineRunning(false);
        refreshCandidates();
        addToast("Pipeline completed! Review results in the board.", "success");
      }
    },
    [activeJob?.id, refreshCandidates, refreshPipelineStatus, addToast],
  );

  const { connected } = useWebSocket(handleWsEvent, Boolean(activeJob?.id));

  /** On first load, restore the most recent job so candidates appear without recreating the job */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await listJobs();
        if (cancelled || !res.jobs?.length) return;
        setActiveJob(res.jobs[0]);
      } catch {
        /* no jobs yet — user will create one */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** When active job changes, load candidates, audit logs, and pipeline status immediately */
  useEffect(() => {
    if (!activeJob?.id) return;
    refreshJobData();
    refreshPipelineStatus();
  }, [activeJob?.id, refreshJobData, refreshPipelineStatus]);

  /**
   * Poll GET /candidates every 3s while pipeline is running or completed
   * so the Kanban board updates even if WebSocket misses events.
   */
  useEffect(() => {
    if (!activeJob?.id) return;

    const status = pipelineStatus?.status;
    const shouldPoll =
      pipelineRunning || (status && POLLING_STATUSES.has(status));

    if (!shouldPoll) return;

    refreshCandidates();

    const interval = setInterval(async () => {
      await refreshCandidates();
      const latestStatus = await refreshPipelineStatus();
      if (
        latestStatus &&
        (latestStatus.status === "completed" ||
          latestStatus.status === "completed_with_errors")
      ) {
        await refreshCandidates();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [
    activeJob?.id,
    pipelineRunning,
    pipelineStatus?.status,
    refreshCandidates,
    refreshPipelineStatus,
  ]);

  /**
   * Open candidate detail drawer with full API data.
   * Input: candidate object from Kanban card
   * Output: sets selectedCandidate and opens drawer
   */
  async function handleSelectCandidate(candidate) {
    try {
      const full = await getCandidate(candidate.id);
      setSelectedCandidate(full);
    } catch {
      setSelectedCandidate(candidate);
    }
    setDrawerOpen(true);
  }

  /**
   * Start autonomous pipeline.
   * Input: Run Pipeline button click
   * Output: triggers backend pipeline
   */
  async function handleRunPipeline() {
    if (!activeJob?.id) return;
    setPipelineRunning(true);
    try {
      const result = await runPipeline(activeJob.id);
      addToast(result.message || "Pipeline started!", "success");
      await refreshPipelineStatus();
      await refreshCandidates();
    } catch (err) {
      addToast(err.message, "error");
      setPipelineRunning(false);
    }
  }

  /**
   * Handle job created from sidebar form.
   * Input: job object from API
   * Output: sets active job and shows toast
   */
  function handleJobCreated(job) {
    setActiveJob(job);
    setCandidates([]);
    setSelectedCandidate(null);
    setDrawerOpen(false);
    setAuditLogs([]);
    setPipelineStatus(null);
    addToast(`Job "${job.title}" created — upload resumes next.`, "success");
  }

  /**
   * Handle resume upload complete.
   * Input: upload API response
   * Output: refreshes candidates list
   */
  async function handleUploadComplete(result) {
    addToast(result.message, "success");
    await refreshJobData();
  }

  /**
   * Handle human review approve/reject from drawer.
   * Input: candidateId, action, overrideScore, notes
   * Output: API result; throws on error for ReviewPanel
   */
  async function handleReview(candidateId, action, overrideScore, notes) {
    const result = await reviewCandidate(
      candidateId,
      action,
      overrideScore,
      notes,
    );
    await refreshJobData();
    const updated = await getCandidate(candidateId);
    setSelectedCandidate(updated);
    addToast(`Candidate ${action}d successfully.`, "success");
    return result;
  }

  /**
   * Local feedback log (UI acknowledgment).
   * Input: candidateId, rating, notes
   * Output: none
   */
  function handleFeedback(candidateId, rating, notes) {
    console.info("[Feedback]", candidateId, rating, notes);
    addToast("Feedback recorded — thank you!", "info");
  }

  const progressPct = pipelineStatus?.progress_pct ?? 0;

  return (
    <>
      {pipelineRunning && (
        <div className="top-progress">
          <div
            className="top-progress-bar"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="dashboard-layout">
        {/* ── Sidebar: job + upload + run ── */}
        <aside className="sidebar">
          <div className="sidebar-inner">
            <JobIntakePanel
              onJobCreated={handleJobCreated}
              onCreateJob={createJob}
              disabled={pipelineRunning}
            />

            <ResumeUploadZone
              jobId={activeJob?.id}
              onUpload={uploadResumes}
              onUploadComplete={handleUploadComplete}
              disabled={pipelineRunning}
            />

            {activeJob && (
              <div className="card">
                <h2 className="card-title">
                  <span className="step-badge">3</span>
                  Run Agent
                </h2>
                <p
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--color-text-muted)",
                    margin: "0 0 0.75rem",
                  }}
                >
                  Active job: <strong>{activeJob.title}</strong>
                  <br />
                  {candidates.length} candidate(s) ready
                </p>
                <button
                  type="button"
                  className="btn btn-success btn-block"
                  disabled={pipelineRunning || candidates.length === 0}
                  onClick={handleRunPipeline}
                >
                  {pipelineRunning && <span className="btn-spinner" />}
                  {pipelineRunning
                    ? "Agent Running..."
                    : "▶ Run Autonomous Pipeline"}
                </button>
                <div className="ws-status">
                  <span className={`ws-dot ${connected ? "live" : ""}`} />
                  WebSocket {connected ? "Live" : "Disconnected"}
                </div>
                {pipelineStatus?.plan && pipelineRunning && (
                  <div
                    className="plan-box"
                    style={{
                      marginTop: "0.75rem",
                      fontSize: "0.78rem",
                      whiteSpace: "pre-wrap",
                      maxHeight: 120,
                      overflow: "auto",
                      padding: "0.65rem",
                      background: "var(--color-column-bg)",
                      borderRadius: 8,
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    {pipelineStatus.plan.slice(0, 300)}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* ── Main: Kanban + audit below ── */}
        <main className="main-content">
          <div className="main-tabs">
            <button
              type="button"
              className={`tab ${activeTab === "pipeline" ? "active" : ""}`}
              onClick={() => setActiveTab("pipeline")}
            >
              📊 Pipeline
            </button>
            <button
              type="button"
              className={`tab ${activeTab === "audit" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("audit");
                refreshAuditLogs();
              }}
            >
              📋 Audit Log
            </button>
          </div>

          {activeTab === "pipeline" && (
            <PipelineView
              candidates={candidates}
              selectedId={selectedCandidate?.id}
              onSelectCandidate={handleSelectCandidate}
              pipelineRunning={pipelineRunning}
            />
          )}

          {activeTab === "audit" && (
            <AuditLogViewer logs={auditLogs} loading={auditLoading} />
          )}
        </main>
      </div>

      <CandidateDetail
        open={drawerOpen}
        candidate={selectedCandidate}
        onClose={() => setDrawerOpen(false)}
        onReview={handleReview}
        onReviewComplete={() => addToast("Review action completed.", "success")}
        onReviewError={(msg) => addToast(msg, "error")}
        onSubmitFeedback={handleFeedback}
      />
    </>
  );
}
