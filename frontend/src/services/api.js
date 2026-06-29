/**
 * HireFlow AI — REST API Client.
 * Fetch wrapper for all backend FastAPI endpoints.
 */

/** Base URL for API calls — from .env or localhost default */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * Perform a JSON fetch request with error handling.

 * Input:
 *   path: API path (e.g. "/jobs")
 *   options: optional fetch options (method, body, headers)
 * Output:
 *   parsed JSON response body
 * Throws: Error with message from API or network failure
 */
async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const headers = { ...options.headers };

  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const err = await response.json();
      detail = err.detail || JSON.stringify(err);
    } catch {
      /* use default detail */
    }
    throw new Error(detail);
  }

  return response.json();
}

/**
 * Check API health and token usage.

 * Input: none
 * Output: health JSON from GET /health
 */
export async function getHealth() {
  return request("/health");
}

/**
 * Create a new job with a job description.

 * Input: jdText (string), optional title (string)
 * Output: job object with id, title, jd_text, status
 */
export async function createJob(jdText, title = null) {
  return request("/jobs", {
    method: "POST",
    body: JSON.stringify({ jd_text: jdText, title }),
  });
}

/**
 * List all jobs.

 * Input: none
 * Output: { jobs: [], count: number }
 */
export async function listJobs() {
  return request("/jobs");
}

/**
 * Get one job by id.

 * Input: jobId string
 * Output: job object
 */
export async function getJob(jobId) {
  return request(`/jobs/${jobId}`);
}

/**
 * Upload resume PDF files for a job.

 * Input: jobId string, files FileList or array of File objects
 * Output: { job_id, candidate_ids, uploaded_count, message }
 */
export async function uploadResumes(jobId, files) {
  const formData = new FormData();
  formData.append("job_id", jobId);
  for (const file of files) {
    formData.append("files", file);
  }
  return request("/candidates/upload", {
    method: "POST",
    body: formData,
  });
}

/**
 * List candidates for a job.

 * Input: jobId string
 * Output: { candidates: [], count: number }
 */
export async function listCandidates(jobId) {
  return request(`/candidates?job_id=${encodeURIComponent(jobId)}`);
}

/**
 * Get one candidate by id.

 * Input: candidateId string
 * Output: candidate object with score, stage, reasoning
 */
export async function getCandidate(candidateId) {
  return request(`/candidates/${candidateId}`);
}

/**
 * Approve or reject a flagged candidate (human-in-the-loop).

 * Input:
 *   candidateId string
 *   action: "approve" or "reject"
 *   overrideScore: optional number 0-100
 *   notes: optional string
 * Output: { status, stage, message }
 */
export async function reviewCandidate(
  candidateId,
  action,
  overrideScore = null,
  notes = null
) {
  const body = { action };
  if (overrideScore != null) body.override_score = overrideScore;
  if (notes) body.notes = notes;
  return request(`/candidates/${candidateId}/review`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Start the autonomous hiring pipeline for a job.

 * Input: jobId string, forceRestart boolean
 * Output: { status, job_id, message }
 */
export async function runPipeline(jobId, forceRestart = false) {
  return request(`/pipeline/run/${jobId}`, {
    method: "POST",
    body: JSON.stringify({ force_restart: forceRestart }),
  });
}

/**
 * Get pipeline run status for a job.

 * Input: jobId string
 * Output: pipeline status object with progress_pct, plan, errors
 */
export async function getPipelineStatus(jobId) {
  return request(`/pipeline/status/${jobId}`);
}

/**
 * Get audit logs for a job.

 * Input: jobId string, optional limit number
 * Output: { logs: [], count: number }
 */
export async function getAuditLogs(jobId, limit = 200) {
  return request(
    `/audit/job/${jobId}?limit=${encodeURIComponent(limit)}`
  );
}
