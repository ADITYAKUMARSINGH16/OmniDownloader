import re
import ipaddress
import asyncio
import socket
from urllib.parse import urlparse
from typing import Optional
from fastapi import HTTPException, status, Request

from core.config import settings


BLOCKED_IPS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]

ALLOWED_SCHEMES = {"http", "https"}
MAX_URL_LENGTH = 2048

URL_PATTERN = re.compile(
    r"^(?:http|https)://"
    r"(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|"
    r"localhost|"
    r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
    r"\[?[A-F0-9]*:[A-F0-9:]+\]?)"
    r"(?::\d+)?"
    r"(?:/?|[/?]\S+)$",
    re.IGNORECASE,
)


from core.exceptions import SecurityError


def validate_url(url: str) -> str:
    if not url or not isinstance(url, str):
        raise SecurityError("INVALID_URL", "URL is required")
    
    url = url.strip()
    
    if len(url) > MAX_URL_LENGTH:
        raise SecurityError("URL_TOO_LONG", f"URL exceeds maximum length of {MAX_URL_LENGTH}")
    
    parsed = urlparse(url)
    
    if not parsed.scheme:
        raise SecurityError("INVALID_URL_FORMAT", "Invalid URL format")
    
    if parsed.scheme.lower() not in ALLOWED_SCHEMES:
        raise SecurityError("UNSUPPORTED_SCHEME", f"Scheme '{parsed.scheme}' is not allowed. Only HTTP/HTTPS supported")
    
    if not URL_PATTERN.match(url):
        raise SecurityError("INVALID_URL_FORMAT", "Invalid URL format")
    
    hostname = parsed.hostname
    if not hostname:
        raise SecurityError("INVALID_URL", "No hostname found in URL")
    
    try:
        ip = ipaddress.ip_address(hostname)
        if is_private_ip(ip):
            raise SecurityError("SSRF_PROTECTION", "Access to private IP addresses is blocked")
    except ValueError:
        pass
    
    if is_localhost(hostname):
        raise SecurityError("SSRF_PROTECTION", "Access to localhost is blocked")
    
    return url


def is_private_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    for network in BLOCKED_IPS:
        if ip in network:
            return True
    return False


def is_localhost(hostname: str) -> bool:
    localhost_names = {"localhost", "localhost.localdomain", "127.0.0.1", "::1", "0.0.0.0"}
    return hostname.lower() in localhost_names


def sanitize_filename(filename: str, max_length: int = 255) -> str:
    filename = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", filename)
    filename = filename.strip(". ")
    if len(filename) > max_length:
        name, ext = filename.rsplit(".", 1) if "." in filename else (filename, "")
        if ext:
            filename = name[:max_length - len(ext) - 1] + "." + ext
        else:
            filename = filename[:max_length]
    return filename or "download"


def validate_file_size(size: int) -> None:
    if size > settings.max_file_size:
        raise SecurityError(
            "FILE_TOO_LARGE",
            f"File size {size} bytes exceeds maximum allowed {settings.max_file_size} bytes"
        )


def validate_mime_type(mime_type: str, allowed_types: Optional[list[str]] = None) -> None:
    if allowed_types and mime_type not in allowed_types:
        raise SecurityError("INVALID_MIME_TYPE", f"MIME type {mime_type} is not allowed")


async def check_ssrf(url: str) -> None:
    parsed = urlparse(url)
    hostname = parsed.hostname
    
    if not hostname:
        raise SecurityError("INVALID_URL", "No hostname found")
    
    try:
        loop = asyncio.get_running_loop()
        addrs = await loop.getaddrinfo(hostname, None, family=socket.AF_UNSPEC)
        for addr in addrs:
            ip_str = addr[4][0]
            ip = ipaddress.ip_address(ip_str)
            if is_private_ip(ip):
                raise SecurityError("SSRF_PROTECTION", f"Resolved to private IP: {ip}")
    except SecurityError:
        raise
    except Exception as e:
        raise SecurityError("DNS_RESOLUTION_FAILED", f"Failed to resolve hostname: {e}")


def sanitize_folder_path(path_str: str) -> str:
    """
    Sanitize and normalize a folder or directory path.
    Strips surrounding quotes (such as from Windows 'Copy as path'), whitespace,
    expands user tilde (~), and returns an absolute system path.
    """
    import os
    if not path_str or not isinstance(path_str, str):
        raise ValueError("Path must be a non-empty string")
    
    cleaned = path_str.strip().strip('"\'').strip()
    if not cleaned:
        raise ValueError("Path cannot be empty")
        
    cleaned = os.path.expanduser(os.path.expandvars(cleaned))
    return os.path.abspath(cleaned)


def extract_api_key(request: Request) -> Optional[str]:
    """Extract API key from X-API-Key header, Bearer Authorization, or query param."""
    key = request.headers.get("X-API-Key") or request.headers.get("x-api-key")
    if key:
        return key.strip()

    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
        if token:
            return token

    param_key = request.query_params.get("api_key")
    if param_key:
        return param_key.strip()

    return None


async def verify_api_key(request: Request) -> Optional[str]:
    """
    Verify incoming API key against configured key in database or environment.
    If 'require_api_key' is enabled, raises 401 on missing or 403 on invalid key.
    """
    from core.database import AsyncSessionLocal
    from models.database import Settings as DBSettings
    from sqlalchemy import select
    import json
    import os

    provided_key = extract_api_key(request)

    configured_key = os.getenv("OMNI_API_KEY")
    require_key = False

    try:
        async with AsyncSessionLocal() as session:
            res = await session.execute(
                select(DBSettings).where(DBSettings.key.in_(["api_key", "require_api_key"]))
            )
            rows = res.scalars().all()
            for r in rows:
                if r.key == "api_key" and r.value:
                    try:
                        configured_key = json.loads(r.value)
                    except Exception:
                        configured_key = r.value
                elif r.key == "require_api_key" and r.value:
                    try:
                        require_key = bool(json.loads(r.value))
                    except Exception:
                        require_key = False
    except Exception:
        pass

    if require_key:
        if not provided_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API Key required. Pass header 'X-API-Key: <key>' or 'Authorization: Bearer <key>'.",
                headers={"WWW-Authenticate": "ApiKey"},
            )
        if configured_key and provided_key != configured_key:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid API Key provided.",
            )

    return provided_key