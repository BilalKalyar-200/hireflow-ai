/**
 * HireFlow AI — Pipeline stage labels, colors, and Kanban column mapping.
 */

/** All pipeline stages returned by the backend API */
export const STAGES = {
  PENDING: "pending",
  PARSING: "parsing",
  PARSED: "parsed",
  SCORED: "scored",
  SHORTLISTED: "shortlisted",
  EMAIL_SENT: "email_sent",
  INTERVIEW_SCHEDULED: "interview_scheduled",
  NEEDS_REVIEW: "needs_review",
  REJECTED: "rejected",
  ERROR: "error",
  COMPLETED: "completed",
};

/**
 * Kanban columns shown in the pipeline view.
 * Each column groups one or more backend stages.
 */
export const PIPELINE_COLUMNS = [
  {
    id: "incoming",
    title: "Incoming",
    stages: [STAGES.PENDING, STAGES.PARSING, STAGES.PARSED],
    color: "#94a3b8",
  },
  {
    id: "scored",
    title: "Scored",
    stages: [STAGES.SCORED],
    color: "#3b82f6",
  },
  {
    id: "review",
    title: "Needs Review",
    stages: [STAGES.NEEDS_REVIEW],
    color: "#f59e0b",
  },
  {
    id: "shortlisted",
    title: "Shortlisted",
    stages: [STAGES.SHORTLISTED, STAGES.EMAIL_SENT],
    color: "#10b981",
  },
  {
    id: "scheduled",
    title: "Interview Scheduled",
    stages: [STAGES.INTERVIEW_SCHEDULED, STAGES.COMPLETED],
    color: "#8b5cf6",
  },
  {
    id: "rejected",
    title: "Rejected / Error",
    stages: [STAGES.REJECTED, STAGES.ERROR],
    color: "#ef4444",
  },
];

/**
 * Human-readable label for a pipeline stage string.

 * Input: stage string from API (e.g. "needs_review")
 * Output: display label (e.g. "Needs Review")
 */
export function formatStageLabel(stage) {
  if (!stage) return "Unknown";
  return stage
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Score color based on value for visual badges.

 * Input: numeric score 0-100 or null
 * Output: CSS color hex string
 */
export function scoreColor(score) {
  if (score == null) return "#94a3b8";
  if (score >= 75) return "#10b981";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}
