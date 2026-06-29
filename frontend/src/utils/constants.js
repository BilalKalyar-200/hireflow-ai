/**
 * FILE 1 of 14 — HireFlow AI design tokens, pipeline stages, and helpers.
 */

/** Design system color tokens */
export const COLORS = {
  primary: "#2563EB",
  success: "#16A34A",
  warning: "#D97706",
  danger: "#DC2626",
  purple: "#7C3AED",
  gray: "#64748B",
  darkGreen: "#15803D",
};

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
 * Kanban columns — one per major pipeline stage group.
 * Each column has header color, icon, and optional pulse animation.
 */
export const PIPELINE_COLUMNS = [
  {
    id: "pending",
    title: "Pending",
    stages: [STAGES.PENDING],
    color: COLORS.gray,
    icon: "⏳",
    pulse: false,
  },
  {
    id: "parsing",
    title: "Parsing",
    stages: [STAGES.PARSING, STAGES.PARSED],
    color: COLORS.primary,
    icon: "📄",
    pulse: true,
  },
  {
    id: "scored",
    title: "Scored",
    stages: [STAGES.SCORED],
    color: COLORS.purple,
    icon: "📊",
    pulse: false,
  },
  {
    id: "shortlisted",
    title: "Shortlisted",
    stages: [STAGES.SHORTLISTED, STAGES.EMAIL_SENT],
    color: COLORS.success,
    icon: "✅",
    pulse: false,
  },
  {
    id: "review",
    title: "Needs Review",
    stages: [STAGES.NEEDS_REVIEW],
    color: COLORS.warning,
    icon: "⚠️",
    pulse: true,
  },
  {
    id: "rejected",
    title: "Rejected",
    stages: [STAGES.REJECTED, STAGES.ERROR],
    color: COLORS.danger,
    icon: "✕",
    pulse: false,
  },
  {
    id: "scheduled",
    title: "Interview Scheduled",
    stages: [STAGES.INTERVIEW_SCHEDULED],
    color: COLORS.success,
    icon: "⭐",
    pulse: false,
  },
  {
    id: "completed",
    title: "Completed",
    stages: [STAGES.COMPLETED],
    color: COLORS.darkGreen,
    icon: "🏁",
    pulse: false,
  },
];

/** Audit log filter categories mapped to action/tool keywords */
export const AUDIT_FILTERS = [
  { id: "all", label: "All", match: () => true },
  { id: "jd", label: "JD Parse", match: (log) => log.action?.includes("jd") || log.tool_used?.includes("jd") },
  { id: "resume", label: "Resume", match: (log) => /resume|pdf|extract/i.test(`${log.action} ${log.tool_used}`) },
  { id: "score", label: "Score", match: (log) => /score/i.test(`${log.action} ${log.tool_used}`) },
  { id: "email", label: "Email", match: (log) => /email/i.test(`${log.action} ${log.tool_used}`) },
  { id: "calendar", label: "Calendar", match: (log) => /calendar|interview/i.test(`${log.action} ${log.tool_used}`) },
];

/**
 * Human-readable label for a pipeline stage string.
 * Input: stage string from API
 * Output: display label string
 */
export function formatStageLabel(stage) {
  if (!stage) return "Unknown";
  return stage
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Score badge color based on value.
 * Input: numeric score 0-100 or null
 * Output: CSS hex color string
 */
export function scoreColor(score) {
  if (score == null) return COLORS.gray;
  if (score >= 75) return COLORS.success;
  if (score >= 50) return COLORS.warning;
  return COLORS.danger;
}

/**
 * Stage icon for a candidate card.
 * Input: stage string
 * Output: emoji icon string
 */
export function stageIcon(stage) {
  const col = PIPELINE_COLUMNS.find((c) => c.stages.includes(stage));
  return col?.icon || "•";
}

/**
 * Format timestamp as relative time (e.g. "2 minutes ago").
 * Input: ISO timestamp string
 * Output: relative time label
 */
export function relativeTime(timestamp) {
  if (!timestamp) return "";
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
