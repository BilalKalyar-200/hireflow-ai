/**
 * HireFlow AI — Feedback Form.
 * Recruiter feedback on scores to improve future scoring weights.
 */

import { useState } from "react";

/**
 * FeedbackForm — thumbs feedback tied to selected candidate.

 * Input props:
 *   candidate: selected candidate object or null
 *   onSubmitFeedback(candidateId, rating, notes): callback (optional local feedback)
 * Output: JSX feedback form or empty state
 */
export default function FeedbackForm({ candidate, onSubmitFeedback }) {
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!candidate) {
    return (
      <div className="card">
        <h2 className="card-title">Recruiter Feedback</h2>
        <div className="empty-state" style={{ padding: "1rem" }}>
          Select a candidate to leave score feedback.
        </div>
      </div>
    );
  }

  /**
   * Record positive feedback (score was accurate).

   * Input: click on thumbs up
   * Output: none (calls onSubmitFeedback)
   */
  function handlePositive() {
    if (onSubmitFeedback) {
      onSubmitFeedback(candidate.id, "positive", notes);
    }
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  }

  /**
   * Record negative feedback (score was wrong).

   * Input: click on thumbs down
   * Output: none (calls onSubmitFeedback)
   */
  function handleNegative() {
    if (onSubmitFeedback) {
      onSubmitFeedback(candidate.id, "negative", notes);
    }
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  }

  return (
    <div className="card">
      <h2 className="card-title">Recruiter Feedback</h2>
      <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0 0 0.75rem" }}>
        Was the agent&apos;s score for <strong>{candidate.name}</strong> accurate?
        Feedback adjusts future scoring weights.
      </p>

      {submitted && (
        <div className="alert alert-success">Thank you — feedback recorded.</div>
      )}

      <div className="form-group">
        <label htmlFor="feedback-notes">Comments</label>
        <textarea
          id="feedback-notes"
          rows={2}
          placeholder="Optional comments on the scoring..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button type="button" className="btn btn-success btn-sm" onClick={handlePositive}>
          👍 Accurate
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={handleNegative}>
          👎 Inaccurate
        </button>
      </div>
    </div>
  );
}
