/**
 * FILE 2 of 7 — Job Intake Panel with success state and create-new flow.
 */

import { useState } from "react";

/**
 * JobIntakePanel — paste JD and create a job posting.
 * Input: onJobCreated, onCreateJob, disabled props
 * Output: JSX form with character count and success message
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
  const [createdJobTitle, setCreatedJobTitle] = useState(null);

  /**
   * Submit job creation form.
   * Input: form submit event
   * Output: calls onCreateJob and shows success with job title
   */
  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (jdText.trim().length < 10) {
      setError("Job description must be at least 10 characters.");
      return;
    }

    setLoading(true);
    try {
      const job = await onCreateJob(jdText.trim(), title.trim() || null);
      setCreatedJobTitle(job.title || "New Position");
      onJobCreated(job);
      setJdText("");
      setTitle("");
    } catch (err) {
      setError(err.message || "Failed to create job.");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Reset form to create another job from scratch.
   * Input: click Create New Job
   * Output: clears form and success state
   */
  function handleCreateNew() {
    setCreatedJobTitle(null);
    setTitle("");
    setJdText("");
    setError(null);
  }

  return (
    <div className="card">
      <h2 className="card-title">
        <span className="step-badge">1</span>
        Job Description
      </h2>

      {error && (
        <div
          className="toast toast-error"
          style={{ marginBottom: "0.75rem", position: "static" }}
        >
          <span className="toast-icon">✕</span>
          {error}
        </div>
      )}

      {createdJobTitle && (
        <div className="job-success-banner">
          <span className="job-success-icon">✓</span>
          <div>
            <strong>Job created successfully</strong>
            <div className="job-success-title">{createdJobTitle}</div>
            <div className="job-success-hint">Upload resumes in step 2, then run the pipeline.</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="job-title">Job title</label>
          <input
            id="job-title"
            type="text"
            placeholder="e.g. Senior Python Developer — Remote, Full-time"
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
              if (createdJobTitle) setCreatedJobTitle(null);
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

        {createdJobTitle && (
          <button
            type="button"
            className="btn btn-outline btn-block"
            style={{ marginTop: "0.5rem" }}
            onClick={handleCreateNew}
            disabled={disabled || loading}
          >
            Create New Job
          </button>
        )}
      </form>
    </div>
  );
}
