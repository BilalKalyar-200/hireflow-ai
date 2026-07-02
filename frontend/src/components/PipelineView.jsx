/**
 * FILE 4 of 7 — Pipeline Kanban View with desktop scroll hint.
 */

import {
  PIPELINE_COLUMNS,
  formatStageLabel,
  scoreColor,
  stageIcon,
} from "../utils/constants";

/**
 * Skeleton cards shown while pipeline is running.
 * Input: count of skeleton cards to show
 * Output: JSX skeleton elements
 */
function SkeletonCards({ count = 3 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-line" />
          <div className="skeleton-line short" />
        </div>
      ))}
    </>
  );
}

/**
 * Single candidate card in a Kanban column.
 * Input: candidate, selected, onClick
 * Output: JSX card
 */
function CandidateCard({ candidate, selected, onClick }) {
  const name = candidate.name || "Unknown Candidate";
  const score = candidate.score;
  const skills = candidate.structured_data?.skills?.slice(0, 2) || [];

  return (
    <div
      className={`candidate-card ${selected ? "selected" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <div className="name">{name}</div>
      <div className="stage-row">
        <span>{stageIcon(candidate.stage)}</span>
        <span>{formatStageLabel(candidate.stage)}</span>
      </div>
      {score != null && (
        <span className="score-badge" style={{ background: scoreColor(score) }}>
          {score}/100
        </span>
      )}
      {skills.length > 0 && (
        <div className="skill-tags">
          {skills.map((s) => (
            <span key={s} className="skill-tag">{s}</span>
          ))}
        </div>
      )}
      {candidate.flagged_for_review && (
        <span className="score-badge review-badge">⚠ Review</span>
      )}
    </div>
  );
}

/**
 * PipelineView — Kanban board with horizontal scroll on desktop, stacked on mobile.
 * Input: candidates, selectedId, onSelectCandidate, pipelineRunning
 * Output: JSX kanban board
 */
export default function PipelineView({
  candidates = [],
  selectedId,
  onSelectCandidate,
  pipelineRunning = false,
}) {
  /**
   * Get candidates belonging to a column's stages.
   * Input: column config object
   * Output: filtered candidate array
   */
  function candidatesInColumn(column) {
    return candidates.filter((c) => column.stages.includes(c.stage));
  }

  if (candidates.length === 0 && !pipelineRunning) {
    return (
      <div className="pipeline-empty">
        <div className="emoji">🤖📋</div>
        <h3>No candidates in the pipeline yet</h3>
        <p>
          Create a job, upload resume PDFs, then click Run Autonomous Pipeline.
          Candidates will appear here as the agent processes them.
        </p>
      </div>
    );
  }

  return (
    <div className="kanban-wrapper">
      <div className="kanban-scroll-hint" aria-hidden="true">
        <span>Scroll right to see more columns</span>
        <span className="kanban-scroll-arrow">→</span>
      </div>
      <div className="kanban-scroll">
        <div className="kanban-board">
          {PIPELINE_COLUMNS.map((column) => {
            const columnCandidates = candidatesInColumn(column);
            const isEmpty = columnCandidates.length === 0;

            return (
              <div
                key={column.id}
                className={`kanban-column ${isEmpty ? "empty-column" : ""}`}
              >
                <div className="column-header">
                  <div className="column-header-left">
                    <span
                      className={`header-badge ${column.pulse ? "pulse" : ""}`}
                      style={{ background: column.color }}
                    >
                      {column.icon} {column.title}
                    </span>
                  </div>
                  <span className="column-count">{columnCandidates.length}</span>
                </div>
                <div className="column-body">
                  {isEmpty && !pipelineRunning && (
                    <div className="column-empty">No candidates</div>
                  )}
                  {isEmpty && pipelineRunning && <SkeletonCards count={2} />}
                  {columnCandidates.map((candidate) => (
                    <CandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      selected={candidate.id === selectedId}
                      onClick={() => onSelectCandidate(candidate)}
                    />
                  ))}
                  {!isEmpty && pipelineRunning && <SkeletonCards count={1} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
