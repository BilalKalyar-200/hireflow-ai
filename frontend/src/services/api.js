/**
 * FILE 2 of 14 — HireFlow AI REST API Client.
 * Fetch wrapper for all backend FastAPI endpoints.
 */

/** Base URL for API calls — from .env or localhost default */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * Perform a JSON fetch request with error handling.
 * Input: path string, optional fetch options
 * Output: parsed JSON response body
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

/** Input: none | Output: health JSON from GET /health */
export async function getHealth() {
  return request("/health");
}

/** Input: jdText, optional title | Output: job object */
export async function createJob(jdText, title = null) {
  return request("/jobs", {
    method: "POST",
    body: JSON.stringify({ jd_text: jdText, title }),
  });
}

/** Input: none | Output: { jobs, count } */
export async function listJobs() {
  return request("/jobs");
}

/** Input: jobId | Output: job object */
export async function getJob(jobId) {
  return request(`/jobs/${jobId}`);
}

/** Input: jobId, files array | Output: upload response */
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

/** Input: jobId | Output: { candidates, count } */
export async function listCandidates(jobId) {
  return request(`/candidates?job_id=${encodeURIComponent(jobId)}`);
}

/** Input: candidateId | Output: candidate object */
export async function getCandidate(candidateId) {
  return request(`/candidates/${candidateId}`);
}

/** Input: candidateId, action, overrideScore, notes | Output: review result */
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

/** Input: jobId, forceRestart | Output: pipeline start response */
export async function runPipeline(jobId, forceRestart = false) {
  return request(`/pipeline/run/${jobId}`, {
    method: "POST",
    body: JSON.stringify({ force_restart: forceRestart }),
  });
}

/** Input: jobId | Output: pipeline status object */
export async function getPipelineStatus(jobId) {
  return request(`/pipeline/status/${jobId}`);
}

/** Input: jobId, limit | Output: { logs, count } */
export async function getAuditLogs(jobId, limit = 200) {
  return request(`/audit/job/${jobId}?limit=${encodeURIComponent(limit)}`);
}
