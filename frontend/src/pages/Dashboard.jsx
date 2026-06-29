/**
 * HireFlow AI — Main Dashboard Page.
 * Combines all panels: job intake, uploads, pipeline, review, audit log.
 */

import { useCallback, useEffect, useState } from "react";
import AuditLogViewer from "../components/AuditLogViewer";
import CandidateDetail from "../components/CandidateDetail";
import FeedbackForm from "../components/FeedbackForm";
import JobIntakePanel from "../components/JobIntakePanel";
import PipelineView from "../components/PipelineView";
import ResumeUploadZone from "../components/ResumeUploadZone";
import ReviewPanel from "../components/ReviewPanel";
import { useWebSocket } from "../hooks/useWebSocket";
import {
  createJob,
  getAuditLogs,
  getCandidate,
  getPipelineStatus,
  listCandidates,
  reviewCandidate,
  runPipeline,
  uploadResumes,
} from "../services/api";

/**
 * Dashboard — root page state and layout for the recruiter UI.

 * Input: none
 * Output: full dashboard JSX
 */
export default function Dashboard() {
  const [activeJob, setActiveJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [pipelineStatus, setPipelineStatus] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState("pipeline");

  /**
   * Refresh candidate list and audit logs for the active job.

   * Input: none (uses activeJob state)
   * Output: none (updates candidates, auditLogs state)
   */
  const refreshJobData = useCallback(async () => {
    if (!activeJob?.id) return;
    try {
      const candRes = await listCandidates(activeJob.id);
      setCandidates(candRes.candidates || []);
      setAuditLoading(true);
      const auditRes = await getAuditLogs(activeJob.id);
      setAuditLogs(auditRes.logs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setAuditLoading(false);
    }
  }, [activeJob?.id]);

  /**
   * Refresh pipeline status from API.

   * Input: none
   * Output: none (updates pipelineStatus state)
   */
  const refreshPipelineStatus = useCallback(async () => {
    if (!activeJob?.id) return;
    try {
      const status = await getPipelineStatus(activeJob.id);
      setPipelineStatus(status);
      if (status.status === "running") {
        setPipelineRunning(true);
      } else if (
        status.status === "completed" ||
        status.status === "completed_with_errors" ||
        status.status === "idle"
      ) {
        setPipelineRunning(false);
      }
    } catch {
      /* non-fatal */
    }
  }, [activeJob?.id]);

  /**
   * Handle WebSocket pipeline events — refresh data on updates.

   * Input: event object from WebSocket
   * Output: none
   */
  const handleWsEvent = useCallback(
    (event) => {
      if (!activeJob?.id || event.job_id !== activeJob.id) return;
      refreshJobData();
      refreshPipelineStatus();
      if (event.event_type === "pipeline_complete") {
        setPipelineRunning(false);
        setSuccess("Pipeline completed! Review results below.");
      }
    },
    [activeJob?.id, refreshJobData, refreshPipelineStatus]
  );

  const { connected } = useWebSocket(handleWsEvent, Boolean(activeJob?.id));

  useEffect(() => {
    refreshJobData();
    refreshPipelineStatus();
  }, [activeJob?.id, refreshJobData, refreshPipelineStatus]);

  /** Poll every 3s while pipeline runs (fallback if WebSocket drops). */
  useEffect(() => {
    if (!pipelineRunning || !activeJob?.id) return;
    const interval = setInterval(() => {
      refreshJobData();
      refreshPipelineStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, [pipelineRunning, activeJob?.id, refreshJobData, refreshPipelineStatus]);

  /**
   * When user selects a candidate card, load full detail.

   * Input: candidate object from pipeline
   * Output: none (updates selectedCandidate)
   */
  async function handleSelectCandidate(candidate) {
    try {
      const full = await getCandidate(candidate.id);
      setSelectedCandidate(full);
    } catch {
      setSelectedCandidate(candidate);
    }
  }

  /**
   * Start autonomous pipeline — one-click agent run.

   * Input: click Run Pipeline button
   * Output: none (starts background pipeline on backend)
   */
  async function handleRunPipeline() {
    if (!activeJob?.id) return;
    setError(null);
    setSuccess(null);
    setPipelineRunning(true);
    try {
      const result = await runPipeline(activeJob.id);
      setSuccess(result.message || "Pipeline started!");
      await refreshPipelineStatus();
    } catch (err) {
      setError(err.message);
      setPipelineRunning(false);
    }
  }

  /**
   * Handle job created from JobIntakePanel.

   * Input: job object from API
   * Output: none (sets activeJob)
   */
  function handleJobCreated(job) {
    setActiveJob(job);
    setCandidates([]);
    setSelectedCandidate(null);
    setAuditLogs([]);
    setPipelineStatus(null);
    setSuccess(`Job "${job.title}" created. Upload resumes next.`);
  }

  /**
   * Handle resume upload complete.

   * Input: upload response from API
   * Output: none (refreshes candidates)
   */
  async function handleUploadComplete(result) {
    setSuccess(result.message);
    await refreshJobData();
  }

  /**
   * Handle human review approve/reject.

   * Input: candidateId, action, overrideScore, notes
   * Output: API result
   */
  async function handleReview(candidateId, action, overrideScore, notes) {
    const result = await reviewCandidate(
      candidateId,
      action,
      overrideScore,
      notes
    );
    await refreshJobData();
    const updated = await getCandidate(candidateId);
    setSelectedCandidate(updated);
    return result;
  }

  /**
   * Local feedback handler (UI acknowledgment; weights updated via review API).

   * Input: candidateId, rating, notes
   * Output: none
   */
  function handleFeedback(candidateId, rating, notes) {
    console.info("[Feedback]", candidateId, rating, notes);
  }

  return (
  <>
      {error && (
        <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
          {error}
          <button
            type="button"
            className="btn btn-sm btn-outline"
            style={{ marginLeft: "0.5rem" }}
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="alert alert-success" style={{ marginBottom: "1rem" }}>
          {success}
        </div>
      )}

      <div className="dashboard-grid">
        {/* Left column — intake and controls */}
        <div>
          <JobIntakePanel
            onJobCreated={handleJobCreated}
            onCreateJob={createJob}
            disabled={pipelineRunning}
          />

          <div style={{ marginTop: "1rem" }}>
            <ResumeUploadZone
              jobId={activeJob?.id}
              onUpload={uploadResumes}
              onUploadComplete={handleUploadComplete}
              disabled={pipelineRunning}
            />
          </div>

          {activeJob && (
            <div className="card" style={{ marginTop: "1rem" }}>
              <h2 className="card-title">3. Run Agent</h2>
              <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0 0 0.75rem" }}>
                Active job: <strong>{activeJob.title}</strong>
              </p>
              <button
                type="button"
                className="btn btn-success btn-block"
                disabled={pipelineRunning || candidates.length === 0}
                onClick={handleRunPipeline}
              >
                {pipelineRunning
                  ? "⏳ Agent Running..."
                  : "▶ Run Autonomous Pipeline"}
              </button>
              <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.5rem" }}>
                WebSocket: {connected ? "🟢 Live" : "🔴 Disconnected"}
              </p>
            </div>
          )}

          {pipelineStatus && pipelineStatus.status !== "idle" && (
            <div className="card" style={{ marginTop: "1rem" }}>
              <h2 className="card-title">Pipeline Progress</h2>
              <div className="progress-bar-wrap">
                <div className="progress-label">
                  {pipelineStatus.current_step || pipelineStatus.status} —{" "}
                  {pipelineStatus.progress_pct}%
                  ({pipelineStatus.processed_count}/{pipelineStatus.total_count})
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${pipelineStatus.progress_pct}%` }}
                  />
                </div>
              </div>
              {pipelineStatus.plan && (
                <div className="plan-box" style={{ marginTop: "0.75rem" }}>
                  {pipelineStatus.plan}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center — pipeline kanban */}
        <div>
          <div className="tabs">
            <button
              type="button"
              className={`tab ${activeTab === "pipeline" ? "active" : ""}`}
              onClick={() => setActiveTab("pipeline")}
            >
              Pipeline
            </button>
            <button
              type="button"
              className={`tab ${activeTab === "audit" ? "active" : ""}`}
              onClick={() => setActiveTab("audit")}
            >
              Audit Log
            </button>
          </div>

          {activeTab === "pipeline" ? (
            <PipelineView
              candidates={candidates}
              selectedId={selectedCandidate?.id}
              onSelectCandidate={handleSelectCandidate}
            />
          ) : (
            <AuditLogViewer logs={auditLogs} loading={auditLoading} />
          )}
        </div>

        {/* Right column — detail, review, feedback */}
        <div>
          <ReviewPanel
            candidate={selectedCandidate}
            onReview={handleReview}
            onReviewComplete={() => setSuccess("Review action completed.")}
          />
          <div style={{ marginTop: "1rem" }}>
            <CandidateDetail candidate={selectedCandidate} />
          </div>
          <div style={{ marginTop: "1rem" }}>
            <FeedbackForm
              candidate={selectedCandidate}
              onSubmitFeedback={handleFeedback}
            />
          </div>
        </div>
      </div>
    </>
  );
}
