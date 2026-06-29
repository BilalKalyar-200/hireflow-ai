/**
 * HireFlow AI — Resume Upload Zone.
 * Drag-and-drop area for uploading candidate resume PDFs.
 */

import { useRef, useState } from "react";

/**
 * ResumeUploadZone — upload PDF resumes for the active job.

 * Input props:
 *   jobId: current job id (required to upload)
 *   onUploadComplete(result): callback after successful upload
 *   onUpload(uploadFn): async (files) => upload handler from parent
 *   disabled: disable when no job selected
 * Output: JSX drag-and-drop upload UI
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
   * Add files from input or drop event to local file list.

   * Input: FileList or array of File objects
   * Output: none (updates files state, PDF only)
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

  /**
   * Handle drag over — highlight drop zone.

   * Input: drag event
   * Output: none
   */
  function handleDragOver(e) {
    e.preventDefault();
    setDragOver(true);
  }

  /**
   * Handle drag leave — remove highlight.

   * Input: drag event
   * Output: none
   */
  function handleDragLeave() {
    setDragOver(false);
  }

  /**
   * Handle file drop onto zone.

   * Input: drop event with dataTransfer.files
   * Output: none (adds files to list)
   */
  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    if (!disabled && jobId) addFiles(e.dataTransfer.files);
  }

  /**
   * Upload selected files to the backend.

   * Input: click on Upload button
   * Output: none (calls API via onUpload)
   */
  async function handleUpload() {
    if (!jobId || files.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = await onUpload(files);
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
      <h2 className="card-title">2. Upload Resumes</h2>

      {!jobId && (
        <div className="alert alert-info">
          Create a job first, then upload resume PDFs.
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

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
        <p><strong>Drop PDF resumes here</strong> or click to browse</p>
        <p>Multiple files supported · Max 5MB each</p>
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
        {loading ? "Uploading..." : `Upload ${files.length || ""} Resume(s)`}
      </button>
    </div>
  );
}
