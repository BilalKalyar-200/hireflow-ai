/**
 * FILE 8 of 14 — Candidate Detail Drawer.
 * Slide-in panel with score ring, breakdown, review actions, and feedback.
 */

import { useEffect } from "react";
import FeedbackForm from "./FeedbackForm";
import ReviewPanel from "./ReviewPanel";
import { formatStageLabel, scoreColor } from "../utils/constants";
import ReactMarkdown from "react-markdown";
/**
 * SVG circular progress ring for candidate score.
 * Input: score number, color string, size number
 * Output: JSX SVG element
 */
function ScoreRing({ score, color, size = 88 }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <svg
      className="score-ring"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth="6"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="18"
        fontWeight="800"
        fill="var(--color-text)"
      >
        {Math.round(score)}
      </text>
    </svg>
  );
}

/**
 * Horizontal progress bar for one score component.
 * Input: label, value (0-100), color
 * Output: JSX progress row
 */
function BreakdownBar({ label, value, color }) {
  return (
    <div className="progress-row">
      <div className="progress-row-label">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="progress-row-bar">
        <div
          className="progress-row-fill"
          style={{ width: `${Math.min(100, value)}%`, background: color }}
        />
      </div>
    </div>
  );
}

/**
 * CandidateDetail — 480px slide-in drawer from the right.
 * Input: open, candidate, onClose, onReview, onReviewComplete, onSubmitFeedback
 * Output: drawer JSX or null when closed
 */
export default function CandidateDetail({
  open,
  candidate,
  onClose,
  onReview,
  onReviewComplete,
  onSubmitFeedback,
  onReviewError,
}) {
  /** Close drawer on Escape key */
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !candidate) return null;

  const breakdown = candidate.score_breakdown;
  const structured = candidate.structured_data;
  const score = candidate.score ?? 0;
  const color = scoreColor(candidate.score);

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} role="presentation" />
      <aside className="drawer" role="dialog" aria-label="Candidate detail">
        <div className="drawer-header">
          <div>
            <h2 style={{ margin: 0, fontSize: "1.25rem" }}>
              {candidate.name || "Candidate"}
            </h2>
            <p
              style={{
                margin: "0.25rem 0 0",
                color: "var(--color-text-muted)",
                fontSize: "0.85rem",
              }}
            >
              {formatStageLabel(candidate.stage)}
              {candidate.email && ` · ${candidate.email}`}
            </p>
          </div>
          <button
            type="button"
            className="drawer-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="drawer-body">
          {candidate.flagged_for_review && (
            <ReviewPanel
              candidate={candidate}
              onReview={onReview}
              onReviewComplete={onReviewComplete}
              onError={onReviewError}
            />
          )}

          {candidate.score != null && (
            <div className="score-ring-wrap">
              <ScoreRing score={score} color={color} />
              <div>
                <div className="score-ring-label" style={{ color }}>
                  {score}/100
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.85rem",
                    color: "var(--color-text-muted)",
                  }}
                >
                  Overall match score
                </p>
              </div>
            </div>
          )}

          {breakdown && (
            <>
              <div className="section-title">Score Breakdown</div>
              <BreakdownBar
                label="Qwen Qualitative"
                value={breakdown.qwen_qualitative}
                color="#2563EB"
              />
              <BreakdownBar
                label="Semantic Similarity"
                value={breakdown.semantic_similarity}
                color="#7C3AED"
              />
              <BreakdownBar
                label="Skills Match"
                value={breakdown.skills_match_pct}
                color="#16A34A"
              />
              <BreakdownBar
                label="Experience Fit"
                value={breakdown.experience_fit}
                color="#D97706"
              />
            </>
          )}

          {structured?.skills?.length > 0 && (
            <>
              <div className="section-title">Skills</div>
              <div>
                {structured.skills.map((s) => (
                  <span key={s} className="pill-badge">
                    {s}
                  </span>
                ))}
              </div>
            </>
          )}

          {candidate.reasoning && (
            <>
              <div className="section-title">Agent Reasoning</div>
              <blockquote className="quote-block">
                {candidate.reasoning}
              </blockquote>
            </>
          )}

          {structured?.work_history?.length > 0 && (
            <>
              <div className="section-title">Work History</div>
              <div className="timeline">
                {structured.work_history.map((job, i) => (
                  <div key={i} className="timeline-item">
                    <strong>{job.role || "Role"}</strong>
                    <div
                      style={{
                        fontSize: "0.82rem",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {job.company} {job.years ? `· ${job.years} yrs` : ""}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {candidate.stage === "interview_scheduled" && (
            <>
              <div className="section-title">Interview</div>

              {candidate.interview_link ? (
                <a
                  href={candidate.interview_link}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "block", marginBottom: "1rem" }}
                >
                  Open calendar / Meet link →
                </a>
              ) : (
                <p
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--color-text-muted)",
                    marginBottom: "1rem",
                  }}
                >
                  Interview scheduled — calendar link unavailable
                  (email/calendar not configured).
                </p>
              )}

              <button
                type="button"
                className="btn btn-success"
                style={{ width: "100%" }}
                onClick={async () => {
                  await onReview(candidate.id, "hire");
                  onReviewComplete?.();
                  onClose();
                }}
              >
                ✓ Mark as Hired
              </button>
            </>
          )}
          {candidate.report && (
            <>
              <div className="section-title">Evaluation Report</div>
              <div className="quote-block">
                <ReactMarkdown>{candidate.report}</ReactMarkdown>
              </div>
            </>
          )}

          <FeedbackForm
            candidate={candidate}
            onSubmitFeedback={onSubmitFeedback}
          />
        </div>
      </aside>
    </>
  );
}
