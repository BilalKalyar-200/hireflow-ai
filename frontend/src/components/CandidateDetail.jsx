/**
 * FILE 5 of 7 — Candidate detail slide-in drawer (responsive).
 */

import { useEffect, useState } from "react";
import FeedbackForm from "./FeedbackForm";
import ReviewPanel from "./ReviewPanel";
import { formatStageLabel, scoreColor } from "../utils/constants";
import ReactMarkdown from "react-markdown";

/**
 * Hook — true when viewport width is mobile (≤768px).
 * Input: none
 * Output: boolean
 */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= 768
  );

  useEffect(() => {
    /**
     * Update mobile flag on window resize.
     * Input: resize event
     * Output: updates isMobile state
     */
    function handleResize() {
      setIsMobile(window.innerWidth <= 768);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
}

/**
 * SVG circular progress ring for candidate score.
 * Input: score number, color string, size number
 * Output: JSX SVG element
 */
function ScoreRing({ score, color, size = 88 }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const fontSize = size <= 72 ? 14 : 18;

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
        fontSize={fontSize}
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
 * CandidateDetail — slide-in drawer from the right (full width on mobile).
 * Input: open, candidate, onClose, onReview, callbacks
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
  const isMobile = useIsMobile();
  const ringSize = isMobile ? 72 : 88;

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
          <div className="drawer-header-text">
            <h2>{candidate.name || "Candidate"}</h2>
            <p>
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
              <ScoreRing score={score} color={color} size={ringSize} />
              <div className="score-ring-text">
                <div className="score-ring-label" style={{ color }}>
                  {score}/100
                </div>
                <p>Overall match score</p>
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
              <div className="pill-wrap">
                {structured.skills.map((s) => (
                  <span key={s} className="pill-badge">{s}</span>
                ))}
              </div>
            </>
          )}

          {candidate.reasoning && (
            <>
              <div className="section-title">Agent Reasoning</div>
              <blockquote className="quote-block">{candidate.reasoning}</blockquote>
            </>
          )}

          {structured?.work_history?.length > 0 && (
            <>
              <div className="section-title">Work History</div>
              <div className="timeline">
                {structured.work_history.map((job, i) => (
                  <div key={i} className="timeline-item">
                    <strong>{job.role || "Role"}</strong>
                    <div className="timeline-item-meta">
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
                  className="interview-link"
                >
                  Open calendar / Meet link →
                </a>
              ) : (
                <p className="timeline-item-meta interview-unavailable">
                  Interview scheduled — calendar link unavailable (email/calendar not configured).
                </p>
              )}
              <button
                type="button"
                className="btn btn-success btn-block"
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
              <div className="quote-block report-content">
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
