/**
 * FILE 3 of 7 — Resume Upload Zone with per-file removal.
 */

import { useRef, useState } from "react";

/**
 * Format byte size for display next to filename.
 * Input: bytes number
 * Output: human-readable string e.g. "245.3 KB"
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Stable key for a File object in the list.
 * Input: File object
 * Output: unique string key
 */
function fileKey(file) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

/**
 * ResumeUploadZone — upload PDF resumes with remove-before-upload support.
 * Input: jobId, onUploadComplete, onUpload, disabled
 * Output: drag-and-drop upload UI with file rows and X buttons
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
   * Reset the hidden file input so the same file can be re-selected.
   * Input: none
   * Output: none
   */
  function resetFileInput() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

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
    setFiles((prev) => {
      const existing = new Set(prev.map(fileKey));
      const merged = [...prev];
      for (const file of pdfs) {
        const key = fileKey(file);
        if (!existing.has(key)) {
          merged.push(file);
          existing.add(key);
        }
      }
      return merged;
    });
    resetFileInput();
  }

  /**
   * Remove one file from the list by index.
   * Input: index number
   * Output: updates files state and resets input
   */
  function removeFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    resetFileInput();
  }

  /**
   * Remove all selected files.
   * Input: click Clear All
   * Output: empty file list and reset input
   */
  function clearAll() {
    setFiles([]);
    resetFileInput();
    setError(null);
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
   * Upload remaining files to backend.
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
      resetFileInput();
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
        <p className="upload-hint">
          Create a job first, then drop PDF resumes here.
        </p>
      )}

      {error && (
        <div className="toast toast-error upload-error">
          <span className="toast-icon">✕</span>
          {error}
        </div>
      )}

      {files.length === 0 && (
        <div
          className={`upload-zone ${dragOver ? "drag-over" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && jobId && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !disabled && jobId) inputRef.current?.click();
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            multiple
            onChange={(e) => addFiles(e.target.files)}
            disabled={disabled || !jobId}
          />
          <p className="upload-emoji">📁</p>
          <p><strong>Drop PDF resumes here</strong> or click to browse</p>
          <p>Multiple files · Max 5 MB each · PDF only</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="file-list-panel">
          <div className="file-list-header">
            <span>{files.length} file(s) selected</span>
            <button
              type="button"
              className="btn btn-outline btn-sm clear-all-btn"
              onClick={clearAll}
              disabled={loading || disabled}
            >
              Clear All
            </button>
          </div>
          <ul className="file-list file-list-rows">
            {files.map((file, index) => (
              <li key={fileKey(file)} className="file-row">
                <div className="file-row-info">
                  <span className="file-row-name">📄 {file.name}</span>
                  <span className="file-row-size">{formatFileSize(file.size)}</span>
                </div>
                <button
                  type="button"
                  className="file-remove-btn"
                  onClick={() => removeFile(index)}
                  disabled={loading || disabled}
                  aria-label={`Remove ${file.name}`}
                  title="Remove file"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn-outline btn-block add-more-btn"
            disabled={disabled || !jobId || loading}
            onClick={() => inputRef.current?.click()}
          >
            + Add more PDFs
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            multiple
            className="file-input-hidden"
            onChange={(e) => addFiles(e.target.files)}
            disabled={disabled || !jobId}
          />
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary btn-block upload-submit-btn"
        disabled={disabled || !jobId || files.length === 0 || loading}
        onClick={handleUpload}
      >
        {loading && <span className="btn-spinner" />}
        {loading ? "Uploading..." : `Upload ${files.length} Resume(s)`}
      </button>
    </div>
  );
}
