/**
 * HireFlow AI — Human-in-the-Loop Review Panel.
 * Approve, reject, or override scores for borderline candidates.
 */

import { useState } from "react";

/**
 * ReviewPanel — recruiter actions for flagged candidates.

 * Input props:
 *   candidate: candidate object (must be flagged_for_review)
 *   onReview(candidateId, action, overrideScore, notes): async review handler
 *   onReviewComplete(result): callback after successful review
 * Output: JSX approve/reject form or null if not flagged
 */
export default function ReviewPanel({
  candidate,
  onReview,
  onReviewComplete,
}) {
  const [overrideScore, setOverrideScore] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!candidate || !candidate.flagged_for_review) {
    return null;
  }

  /**
   * Submit approve or reject action to the API.

   * Input: action string "approve" or "reject"
   * Output: none (calls onReview and onReviewComplete)
   */
  async function handleAction(action) {
    setLoading(true);
    setError(null);
    try {
      const score =
        overrideScore !== "" ? parseFloat(overrideScore) : null;
      const result = await onReview(
        candidate.id,
        action,
        score,
        notes.trim() || null
      );
      onReviewComplete(result);
      setOverrideScore("");
      setNotes("");
    } catch (err) {
      setError(err.message || "Review action failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ borderColor: "#f59e0b", borderWidth: 2 }}>
      <h2 className="card-title">⚠ Human Review Required</h2>

      <div className="alert alert-info">
        {candidate.review_reason ||
          "This candidate needs your decision before the agent continues."}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="override-score">Override score (optional, 0–100)</label>
        <input
          id="override-score"
          type="number"
          min="0"
          max="100"
          placeholder={candidate.score != null ? String(candidate.score) : "75"}
          value={overrideScore}
          onChange={(e) => setOverrideScore(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="review-notes">Notes (optional)</label>
        <textarea
          id="review-notes"
          rows={2}
          placeholder="Why you approved or rejected..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={loading}
        />
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          type="button"
          className="btn btn-success"
          disabled={loading}
          onClick={() => handleAction("approve")}
        >
          ✓ Approve & Continue
        </button>
        <button
          type="button"
          className="btn btn-danger"
          disabled={loading}
          onClick={() => handleAction("reject")}
        >
          ✕ Reject
        </button>
      </div>
    </div>
  );
}
