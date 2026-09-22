from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request


def get_rate_limit_key(request: Request) -> str:
    """Derive rate-limit bucket key from API key or remote IP."""
    api_key = (
        request.headers.get("X-API-Key")
        or request.headers.get("x-api-key")
        or request.query_params.get("api_key")
    )
    if api_key:
        return f"apikey:{api_key}"

    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
        if token:
            return f"apikey:{token}"

    return get_remote_address(request)


# Global Limiter instance
limiter = Limiter(
    key_func=get_rate_limit_key,
    default_limits=["120/minute"],
    headers_enabled=True,
)
