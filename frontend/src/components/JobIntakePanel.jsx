/**
 * FILE 5 of 14 — Job Intake Panel.
 * Form for pasting a job description and optional title.
 */

import { useState } from "react";

/**
 * JobIntakePanel — lets recruiter paste JD and create a job posting.
 * Input: onJobCreated, onCreateJob, disabled props
 * Output: JSX form with character count and success checkmark
 */
export default function JobIntakePanel({
  onJobCreated,
  onCreateJob,
  disabled = false,
}) {
  const [title, setTitle] = useState("");
  const [jdText, setJdText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(false);

  /**
   * Submit job creation form.
   * Input: form submit event
   * Output: calls onCreateJob and shows success checkmark
   */
  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setCreated(false);

    if (jdText.trim().length < 10) {
      setError("Job description must be at least 10 characters.");
      return;
    }

    setLoading(true);
    try {
      const job = await onCreateJob(jdText.trim(), title.trim() || null);
      onJobCreated(job);
      setCreated(true);
      setJdText("");
      setTitle("");
    } catch (err) {
      setError(err.message || "Failed to create job.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2 className="card-title">
        <span className="step-badge">1</span>
        Job Description
      </h2>

      {error && (
        <div className="toast toast-error" style={{ marginBottom: "0.75rem", position: "static" }}>
          <span className="toast-icon">✕</span>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="job-title">Job title</label>
          <input
            id="job-title"
            type="text"
            placeholder="e.g. Senior Python Developer - Remote, Full-time"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={disabled || loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="jd-text">Paste full job description</label>
          <textarea
            id="jd-text"
            placeholder="Include required skills, years of experience, responsibilities, and education requirements. The agent uses this to score every resume automatically."
            value={jdText}
            onChange={(e) => {
              setJdText(e.target.value);
              setCreated(false);
            }}
            disabled={disabled || loading}
            required
          />
          <div className="char-count">{jdText.length} characters</div>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={disabled || loading}
        >
          {loading && <span className="btn-spinner" />}
          {loading ? "Creating..." : "Create Job Posting"}
        </button>

        {created && (
          <div className="job-success">
            <span>✓</span> Job created successfully — upload resumes next
          </div>
        )}
      </form>
    </div>
  );
}
