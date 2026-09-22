import re
import ipaddress
import asyncio
import socket
from urllib.parse import urlparse
from typing import Optional
from fastapi import HTTPException, status

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