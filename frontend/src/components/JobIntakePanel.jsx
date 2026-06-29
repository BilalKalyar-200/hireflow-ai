/**
 * HireFlow AI — Job Intake Panel.
 * Form for pasting a job description and optional title.
 */

import { useState } from "react";

/**
 * JobIntakePanel — lets recruiter paste or type a job description.

 * Input props:
 *   onJobCreated(job): callback when job is successfully created
 *   onCreateJob(jdText, title): async function that creates job via API
 *   disabled: whether form is disabled during loading
 * Output: JSX form UI
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

  /**
   * Handle form submit — validate and create job.

   * Input: form submit event
   * Output: none (calls onCreateJob and onJobCreated)
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
      onJobCreated(job);
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
      <h2 className="card-title">1. Job Description</h2>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="job-title">Job title (optional)</label>
          <input
            id="job-title"
            type="text"
            placeholder="e.g. Senior Python Developer"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={disabled || loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="jd-text">Paste job description</label>
          <textarea
            id="jd-text"
            placeholder="Paste the full job description here — requirements, skills, experience..."
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            disabled={disabled || loading}
            required
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={disabled || loading}
        >
          {loading ? "Creating..." : "Create Job Posting"}
        </button>
      </form>
    </div>
  );
}
