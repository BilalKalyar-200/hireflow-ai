/**
 * FILE 6 of 14 — Resume Upload Zone.
 * Drag-and-drop area for uploading candidate resume PDFs.
 */

import { useRef, useState } from "react";

/**
 * ResumeUploadZone — upload PDF resumes for the active job.
 * Input: jobId, onUploadComplete, onUpload, disabled
 * Output: animated drag-and-drop upload UI
 */
export default function ResumeUploadZone({
  jobId,
  onUploadComplete,
  onUpload,
  disabled = false,
}) {
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  /**
   * Add PDF files to the pending upload list.
   * Input: FileList
   * Output: updates files state
   */
  function addFiles(fileList) {
    const pdfs = Array.from(fileList).filter((f) =>
      f.name.toLowerCase().endsWith(".pdf")
    );
    if (pdfs.length === 0) {
      setError("Please select PDF files only.");
      return;
    }
    setError(null);
    setFiles((prev) => [...prev, ...pdfs]);
  }

  /** Input: drag event | Output: highlights drop zone */
  function handleDragOver(e) {
    e.preventDefault();
    setDragOver(true);
  }

  /** Input: none | Output: removes highlight */
  function handleDragLeave() {
    setDragOver(false);
  }

  /** Input: drop event | Output: adds dropped files */
  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    if (!disabled && jobId) addFiles(e.dataTransfer.files);
  }

  /**
   * Upload files to backend.
   * Input: click Upload button
   * Output: calls onUpload API
   */
  async function handleUpload() {
    if (!jobId || files.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = await onUpload(jobId, files);
      onUploadComplete(result);
      setFiles([]);
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2 className="card-title">
        <span className="step-badge">2</span>
        Upload Resumes
      </h2>

      {!jobId && (
        <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", margin: "0 0 0.75rem" }}>
          Create a job first, then drop PDF resumes here.
        </p>
      )}

      {error && (
        <div className="toast toast-error" style={{ marginBottom: "0.75rem", position: "static" }}>
          <span className="toast-icon">✕</span>
          {error}
        </div>
      )}

      <div
        className={`upload-zone ${dragOver ? "drag-over" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && jobId && inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          multiple
          onChange={(e) => addFiles(e.target.files)}
          disabled={disabled || !jobId}
        />
        <p style={{ fontSize: "1.5rem", margin: "0 0 0.5rem" }}>📁</p>
        <p><strong>Drop PDF resumes here</strong> or click to browse</p>
        <p>Multiple files · Max 5 MB each · PDF only</p>
      </div>

      {files.length > 0 && (
        <ul className="file-list">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`}>📄 {f.name}</li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className="btn btn-primary btn-block"
        style={{ marginTop: "0.75rem" }}
        disabled={disabled || !jobId || files.length === 0 || loading}
        onClick={handleUpload}
      >
        {loading && <span className="btn-spinner" />}
        {loading ? "Uploading..." : `Upload ${files.length} Resume(s)`}
      </button>
    </div>
  );
}
