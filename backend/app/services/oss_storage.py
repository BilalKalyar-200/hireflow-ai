"""
HireFlow AI — Alibaba Cloud OSS Storage Service.

Uploads and retrieves resume PDFs and reports from Alibaba OSS.
Falls back to local disk when OSS credentials are not configured.
"""

import logging
import os
from pathlib import Path
from typing import Any, Optional

from app.config import get_settings
from app.utils.exceptions import StorageError

logger = logging.getLogger(__name__)


class OSSStorageService:
    """
    File storage using Alibaba OSS or local disk fallback.

    Input: settings from get_settings()
    Output: upload_file and download_file methods
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self._bucket: Any = None
        self._use_local = not self.settings.is_oss_configured()
        self.local_path = Path(self.settings.local_storage_path)
        if self._use_local:
            self.local_path.mkdir(parents=True, exist_ok=True)

    async def connect(self) -> None:
        """
        Initialize OSS bucket or confirm local storage path.

        Input: none
        Output: none
        """
        if self._use_local:
            logger.warning("OSS not configured — using local storage at %s", self.local_path)
            return

        try:
            import oss2

            auth = oss2.Auth(
                self.settings.oss_access_key_id,
                self.settings.oss_access_key_secret,
            )
            self._bucket = oss2.Bucket(
                auth,
                self.settings.oss_endpoint,
                self.settings.oss_bucket_name,
            )
            logger.info("Connected to OSS bucket: %s", self.settings.oss_bucket_name)
        except Exception as exc:
            logger.error("OSS init failed, using local storage: %s", exc)
            self._use_local = True
            self.local_path.mkdir(parents=True, exist_ok=True)

    async def upload_file(self, remote_path: str, data: bytes) -> str:
        """
        Upload file bytes to OSS or local disk.

        Input:
            remote_path: path like resumes/job_id/candidate_id.pdf
            data: raw file bytes
        Output:
            storage path string (same as remote_path)
        """
        if self._use_local:
            local_file = self.local_path / remote_path.replace("/", os.sep)
            local_file.parent.mkdir(parents=True, exist_ok=True)
            local_file.write_bytes(data)
            logger.info("Saved locally: %s", local_file)
            return remote_path

        try:
            self._bucket.put_object(remote_path, data)
            logger.info("Uploaded to OSS: %s", remote_path)
            return remote_path
        except Exception as exc:
            raise StorageError(f"OSS upload failed for {remote_path}: {exc}") from exc

    async def download_file(self, remote_path: str) -> bytes:
        """
        Download file bytes from OSS or local disk.

        Input: remote_path string
        Output: raw file bytes
        """
        if self._use_local:
            local_file = self.local_path / remote_path.replace("/", os.sep)
            if not local_file.exists():
                raise StorageError(f"Local file not found: {local_file}")
            return local_file.read_bytes()

        try:
            result = self._bucket.get_object(remote_path)
            return result.read()
        except Exception as exc:
            raise StorageError(f"OSS download failed for {remote_path}: {exc}") from exc

    def build_resume_path(self, job_id: str, candidate_id: str) -> str:
        """
        Build standard OSS path for a resume PDF.

        Input: job_id and candidate_id strings
        Output: path string resumes/{job_id}/{candidate_id}.pdf
        """
        return f"resumes/{job_id}/{candidate_id}.pdf"


_oss_service: Optional[OSSStorageService] = None


def get_storage() -> OSSStorageService:
    """
    Return shared OSSStorageService instance.

    Input: none
    Output: OSSStorageService singleton
    """
    global _oss_service
    if _oss_service is None:
        _oss_service = OSSStorageService()
    return _oss_service
