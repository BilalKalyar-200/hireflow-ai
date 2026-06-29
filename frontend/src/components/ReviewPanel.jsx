/**
 * FILE 9 of 14 — Human-in-the-Loop Review Panel.
 * Approve/reject with confirmation step for flagged candidates.
 */

import { useState } from "react";

/**
 * ReviewPanel — amber banner with approve/reject and confirmation.
 * Input: candidate, onReview, onReviewComplete
 * Output: JSX review UI or null if not flagged
 */
export default function ReviewPanel({
  candidate,
  onReview,
  onReviewComplete,
  onError,
}) {
  const [overrideScore, setOverrideScore] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  if (!candidate || !candidate.flagged_for_review) return null;

  /**
   * Execute review after user confirms.
   * Input: action "approve" or "reject"
   * Output: calls API via onReview
   */
  async function executeReview(action) {
    setLoading(true);
    try {
      const score = overrideScore !== "" ? parseFloat(overrideScore) : null;
      const result = await onReview(candidate.id, action, score, notes.trim() || null);
      onReviewComplete(result);
      setConfirmAction(null);
      setOverrideScore("");
      setNotes("");
    } catch (err) {
      setConfirmAction(null);
      if (onError) onError(err.message || "Review failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="review-banner">
      <h4>⚠ Human Review Required</h4>
      <p style={{ margin: "0 0 0.75rem", fontSize: "0.85rem" }}>
        {candidate.review_reason ||
          "This candidate needs your decision before the agent continues."}
      </p>

      <div className="form-group" style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="override-score">Override score (optional)</label>
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

      <div className="form-group" style={{ marginBottom: "0.75rem" }}>
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

      {!confirmAction ? (
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            className="btn btn-success btn-sm"
            disabled={loading}
            onClick={() => setConfirmAction("approve")}
          >
            ✓ Approve
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            disabled={loading}
            onClick={() => setConfirmAction("reject")}
          >
            ✕ Reject
          </button>
        </div>
      ) : (
        <div className="confirm-box">
          <p style={{ margin: 0 }}>
            Confirm <strong>{confirmAction}</strong> for{" "}
            <strong>{candidate.name || "this candidate"}</strong>?
          </p>
          <div className="confirm-actions">
            <button
              type="button"
              className={`btn btn-sm ${confirmAction === "approve" ? "btn-success" : "btn-danger"}`}
              disabled={loading}
              onClick={() => executeReview(confirmAction)}
            >
              {loading && <span className="btn-spinner" />}
              Yes, {confirmAction}
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={loading}
              onClick={() => setConfirmAction(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
