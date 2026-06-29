/**
 * FILE 10 of 14 — Recruiter Feedback Form.
 * Thumbs up/down on agent scoring accuracy.
 */

import { useState } from "react";

/**
 * FeedbackForm — recruiter feedback on score accuracy.
 * Input: candidate, onSubmitFeedback
 * Output: JSX feedback buttons inside drawer
 */
export default function FeedbackForm({ candidate, onSubmitFeedback }) {
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!candidate) return null;

  /**
   * Submit positive feedback.
   * Input: click thumbs up
   * Output: calls onSubmitFeedback callback
   */
  function handlePositive() {
    if (onSubmitFeedback) onSubmitFeedback(candidate.id, "positive", notes);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  }

  /**
   * Submit negative feedback.
   * Input: click thumbs down
   * Output: calls onSubmitFeedback callback
   */
  function handleNegative() {
    if (onSubmitFeedback) onSubmitFeedback(candidate.id, "negative", notes);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  }

  return (
    <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--color-border)" }}>
      <div className="section-title">Recruiter Feedback</div>
      <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", margin: "0 0 0.75rem" }}>
        Was the agent&apos;s score accurate? Feedback helps improve future scoring.
      </p>

      {submitted && (
        <div className="job-success" style={{ marginBottom: "0.75rem" }}>
          <span>✓</span> Feedback recorded — thank you!
        </div>
      )}

      <div className="form-group">
        <textarea
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
