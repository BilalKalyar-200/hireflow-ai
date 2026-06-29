/**
 * HireFlow AI — Candidate Detail Panel.
 * Shows score breakdown, Qwen reasoning, and resume highlights.
 */

import { formatStageLabel, scoreColor } from "../utils/constants";

/**
 * CandidateDetail — right panel with full candidate information.

 * Input props:
 *   candidate: candidate object or null
 * Output: JSX detail panel or empty state
 */
export default function CandidateDetail({ candidate }) {
  if (!candidate) {
    return (
      <div className="card">
        <h2 className="card-title">Candidate Detail</h2>
        <div className="empty-state">
          Select a candidate from the pipeline to view scores and reasoning.
        </div>
      </div>
    );
  }

  const breakdown = candidate.score_breakdown;
  const structured = candidate.structured_data;

  return (
    <div className="card">
      <h2 className="card-title">{candidate.name || "Candidate"}</h2>

      <div className="detail-section">
        <h4>Stage</h4>
        <p>{formatStageLabel(candidate.stage)}</p>
      </div>

      {candidate.email && (
        <div className="detail-section">
          <h4>Email</h4>
          <p>{candidate.email}</p>
        </div>
      )}

      {candidate.score != null && (
        <div className="detail-section">
          <h4>Final Score</h4>
          <p>
            <span
              className="score-badge"
              style={{
                background: scoreColor(candidate.score),
                fontSize: "0.9rem",
                padding: "0.25rem 0.6rem",
              }}
            >
              {candidate.score}/100
            </span>
          </p>
        </div>
      )}

      {breakdown && (
        <div className="detail-section">
          <h4>Score Breakdown</h4>
          <div className="score-grid">
            <div className="score-item">
              <strong>{breakdown.qwen_qualitative}</strong>
              Qwen Qualitative
            </div>
            <div className="score-item">
              <strong>{breakdown.semantic_similarity}%</strong>
              Semantic Match
            </div>
            <div className="score-item">
              <strong>{breakdown.skills_match_pct}%</strong>
              Skills Match
            </div>
            <div className="score-item">
              <strong>{breakdown.experience_fit}%</strong>
              Experience Fit
            </div>
          </div>
        </div>
      )}

      {candidate.reasoning && (
        <div className="detail-section">
          <h4>Agent Reasoning</h4>
          <p>{candidate.reasoning}</p>
        </div>
      )}

      {structured?.skills?.length > 0 && (
        <div className="detail-section">
          <h4>Skills</h4>
          <p>{structured.skills.join(", ")}</p>
        </div>
      )}

      {structured?.experience_years != null && (
        <div className="detail-section">
          <h4>Experience</h4>
          <p>{structured.experience_years} years</p>
        </div>
      )}

      {candidate.interview_link && (
        <div className="detail-section">
          <h4>Interview Link</h4>
          <p>
            <a href={candidate.interview_link} target="_blank" rel="noreferrer">
              Open calendar / Meet link
            </a>
          </p>
        </div>
      )}

      {candidate.report && (
        <div className="detail-section">
          <h4>Evaluation Report</h4>
          <pre className="plan-box" style={{ whiteSpace: "pre-wrap" }}>
            {candidate.report}
          </pre>
        </div>
      )}
    </div>
  );
}
