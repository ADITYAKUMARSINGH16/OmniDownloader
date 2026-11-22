from fastapi import HTTPException, status
from typing import Any, Optional


class OmniDownloadError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[dict[str, Any]] = None
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


class ValidationError(OmniDownloadError):
    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__("VALIDATION_ERROR", message, status.HTTP_400_BAD_REQUEST, details)


class SecurityError(OmniDownloadError):
    def __init__(self, code: str, message: str, details: Optional[dict] = None):
        super().__init__(code, message, status.HTTP_400_BAD_REQUEST, details)


class NotFoundError(OmniDownloadError):
    def __init__(self, resource: str, identifier: str):
        super().__init__(
            "NOT_FOUND",
            f"{resource} not found: {identifier}",
            status.HTTP_404_NOT_FOUND,
            {"resource": resource, "identifier": identifier}
        )


class UnsupportedSourceError(OmniDownloadError):
    def __init__(self, url: str):
        super().__init__(
            "UNSUPPORTED_SOURCE",
            f"Unsupported source for URL: {url}",
            status.HTTP_400_BAD_REQUEST,
            {"url": url}
        )


class ExtractionError(OmniDownloadError):
    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(
            "EXTRACTION_FAILED",
            message,
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            details
        )


class DownloadError(OmniDownloadError):
    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(
            "DOWNLOAD_FAILED",
            message,
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            details
        )


class QueueError(OmniDownloadError):
    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(
            "QUEUE_ERROR",
            message,
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            details
        )


class RateLimitError(OmniDownloadError):
    def __init__(self, retry_after: int = 60):
        super().__init__(
            "RATE_LIMITED",
            "Too many requests. Please try again later.",
            status.HTTP_429_TOO_MANY_REQUESTS,
            {"retry_after": retry_after}
        )


def handle_exception(exc: Exception) -> HTTPException:
    if isinstance(exc, OmniDownloadError):
        return HTTPException(
            status_code=exc.status_code,
            detail={
                "success": False,
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details
                }
            }
        )
    
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail={
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred"
            }
        }
    )