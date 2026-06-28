"""
HireFlow AI — Custom Exception Classes.

Defines application-specific errors so we can catch and handle
tool failures, API errors, and pipeline problems cleanly.
"""

from typing import Any, Optional


class HireFlowError(Exception):
    """
    Base exception for all HireFlow AI errors.

    Input: message string and optional details dict
    Output: raised exception with message and details attribute
    """

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}


class QwenAPIError(HireFlowError):
    """
    Raised when a Qwen Cloud API call fails.

    Input: error message from the API or wrapper
    Output: raised QwenAPIError
    """


class ToolError(HireFlowError):
    """
    Raised when an agent tool (PDF parser, email, etc.) fails.

    Input: tool name and error message
    Output: raised ToolError with tool name in details
    """

    def __init__(self, tool_name: str, message: str) -> None:
        super().__init__(message, {"tool": tool_name})


class PipelineError(HireFlowError):
    """
    Raised when the hiring pipeline hits an invalid state or fatal error.

    Input: job_id and error message
    Output: raised PipelineError
    """


class StorageError(HireFlowError):
    """
    Raised when file upload or download to OSS/local storage fails.

    Input: path and error message
    Output: raised StorageError
    """


class ValidationError(HireFlowError):
    """
    Raised when input data fails validation (bad PDF, missing email, etc.).

    Input: field name and error message
    Output: raised ValidationError
    """


class DatabaseError(HireFlowError):
    """
    Raised when a MongoDB operation fails.

    Input: operation name and error message
    Output: raised DatabaseError
    """
