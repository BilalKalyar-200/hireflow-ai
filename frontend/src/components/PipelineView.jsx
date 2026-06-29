/**
 * HireFlow AI — Pipeline View.
 * Kanban-style board showing candidates across pipeline stages.
 */

import { PIPELINE_COLUMNS, formatStageLabel, scoreColor } from "../utils/constants";

/**
 * PipelineView — Kanban board of candidates grouped by stage.

 * Input props:
 *   candidates: array of candidate objects from API
 *   selectedId: currently selected candidate id
 *   onSelectCandidate(candidate): click handler for a card
 * Output: JSX kanban grid
 */
export default function PipelineView({
  candidates = [],
  selectedId,
  onSelectCandidate,
}) {
  /**
   * Filter candidates whose stage belongs to a column.

   * Input: column config object with stages array
   * Output: array of matching candidate objects
   */
  function candidatesInColumn(column) {
    return candidates.filter((c) => column.stages.includes(c.stage));
  }

  if (candidates.length === 0) {
    return (
      <div className="card">
        <h2 className="card-title">Candidate Pipeline</h2>
        <div className="empty-state">
          No candidates yet. Upload resumes to see the pipeline.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="card-title">Candidate Pipeline</h2>
      <div className="pipeline-board">
        {PIPELINE_COLUMNS.map((column) => {
          const columnCandidates = candidatesInColumn(column);
          return (
            <div key={column.id} className="pipeline-column">
              <div
                className="column-header"
                style={{ borderTop: `3px solid ${column.color}` }}
              >
                <span>{column.title}</span>
                <span className="column-count">{columnCandidates.length}</span>
              </div>
              <div className="column-body">
                {columnCandidates.map((candidate) => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    selected={candidate.id === selectedId}
                    onClick={() => onSelectCandidate(candidate)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * CandidateCard — single candidate tile in the Kanban column.

 * Input props:
 *   candidate: candidate object
 *   selected: whether this card is selected
 *   onClick: click handler
 * Output: JSX card element
 */
function CandidateCard({ candidate, selected, onClick }) {
  const name = candidate.name || "Unknown Candidate";
  const score = candidate.score;

  return (
    <div
      className={`candidate-card ${selected ? "selected" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div className="name">{name}</div>
      <div className="meta">{formatStageLabel(candidate.stage)}</div>
      {score != null && (
        <span
          className="score-badge"
          style={{ background: scoreColor(score) }}
        >
          {score}/100
        </span>
      )}
      {candidate.flagged_for_review && (
        <span className="flag-badge">⚠ Review needed</span>
      )}
    </div>
  );
}
