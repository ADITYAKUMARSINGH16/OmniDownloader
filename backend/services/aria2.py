import os
import shutil
import base64
import asyncio
import logging
import subprocess
from typing import Optional, Dict, Any, List
import httpx

from core.config import settings

logger = logging.getLogger(__name__)


class Aria2Service:
    """Manages the aria2c background daemon and provides an async JSON-RPC client."""

    def __init__(
        self,
        rpc_url: str = "http://127.0.0.1:6800/jsonrpc",
        rpc_secret: Optional[str] = None,
        custom_binary_path: Optional[str] = None,
    ):
        self.rpc_url = rpc_url
        self.rpc_secret = rpc_secret
        self.custom_binary_path = custom_binary_path
        self._process: Optional[asyncio.subprocess.Process] = None
        self._lock = asyncio.Lock()

    def find_binary(self) -> Optional[str]:
        """Locates the aria2c binary on the host system."""
        if self.custom_binary_path and os.path.isfile(self.custom_binary_path):
            return self.custom_binary_path

        found = shutil.which("aria2c") or shutil.which("aria2c.exe")
        if found:
            return found

        # Check typical Windows package paths (Scoop / Chocolatey / Local bin)
        home = os.path.expanduser("~")
        candidates = [
            os.path.join(home, "scoop", "apps", "aria2", "current", "aria2c.exe"),
            os.path.join(home, "scoop", "shims", "aria2c.exe"),
            r"C:\ProgramData\chocolatey\bin\aria2c.exe",
            os.path.join(os.getcwd(), "backend", "bin", "aria2c.exe"),
            os.path.join(os.getcwd(), "bin", "aria2c.exe"),
        ]
        for c in candidates:
            if os.path.isfile(c):
                return c

        return None

    def get_version(self) -> Optional[str]:
        """Returns the version of aria2c if available."""
        binary = self.find_binary()
        if not binary:
            return None
        try:
            out = subprocess.check_output(
                [binary, "--version"], stderr=subprocess.DEVNULL, text=True
            )
            first_line = out.strip().split("\n")[0]
            return first_line.replace("aria2 version ", "v")
        except Exception:
            return None

    async def is_rpc_online(self) -> bool:
        """Checks if the aria2 JSON-RPC server is currently responding."""
        try:
            res = await self._rpc_call("aria2.getVersion")
            return res is not None and "version" in res
        except Exception:
            return False

    async def ensure_daemon(self, target_dir: Optional[str] = None) -> bool:
        """Launches aria2c in RPC daemon mode if it is not already running."""
        async with self._lock:
            if await self.is_rpc_online():
                return True

            binary = self.find_binary()
            if not binary:
                logger.warning("aria2c binary not found on system. Torrent downloads will be disabled.")
                return False

            out_dir = target_dir or settings.download_dir
            os.makedirs(out_dir, exist_ok=True)

            cmd = [
                binary,
                "--enable-rpc=true",
                "--rpc-listen-all=false",
                "--rpc-listen-port=6800",
                "--rpc-allow-origin-all=true",
                f"--dir={out_dir}",
                "--max-connection-per-server=16",
                "--split=16",
                "--min-split-size=1M",
                "--seed-time=0",
                "--bt-stop-timeout=300",
                "--quiet=true",
            ]

            if self.rpc_secret:
                cmd.append(f"--rpc-secret={self.rpc_secret}")

            try:
                logger.info(f"Starting aria2c daemon: {' '.join(cmd)}")
                self._process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.DEVNULL,
                    stderr=asyncio.subprocess.DEVNULL,
                )
                # Wait briefly for RPC to be responsive
                for _ in range(15):
                    await asyncio.sleep(0.3)
                    if await self.is_rpc_online():
                        logger.info("aria2c RPC daemon successfully initialized and online.")
                        return True
            except Exception as e:
                logger.error(f"Failed to start aria2c daemon: {e}")

            return False

    async def _rpc_call(self, method: str, params: Optional[List[Any]] = None) -> Any:
        """Sends a JSON-RPC 2.0 request to aria2c."""
        call_params = []
        if self.rpc_secret:
            call_params.append(f"token:{self.rpc_secret}")
        if params:
            call_params.extend(params)

        payload = {
            "jsonrpc": "2.0",
            "id": "omnidownload",
            "method": method,
            "params": call_params,
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(self.rpc_url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            if "error" in data:
                raise RuntimeError(f"aria2 RPC error: {data['error']}")
            return data.get("result")

    async def add_magnet(
        self, magnet_uri: str, target_dir: str, options: Optional[Dict[str, Any]] = None
    ) -> str:
        """Adds a magnet URI to aria2. Returns the aria2 task GID."""
        await self.ensure_daemon(target_dir)
        opts = {"dir": target_dir, **(options or {})}
        gid = await self._rpc_call("aria2.addUri", [[magnet_uri], opts])
        return str(gid)

    async def add_torrent(
        self, torrent_content: bytes, target_dir: str, options: Optional[Dict[str, Any]] = None
    ) -> str:
        """Adds a .torrent file to aria2 using base64 encoding. Returns the task GID."""
        await self.ensure_daemon(target_dir)
        encoded = base64.b64encode(torrent_content).decode("utf-8")
        opts = {"dir": target_dir, **(options or {})}
        gid = await self._rpc_call("aria2.addTorrent", [encoded, [], opts])
        return str(gid)

    async def get_status(self, gid: str) -> Dict[str, Any]:
        """Fetches download status, progress, speed, and file paths for a given GID."""
        keys = [
            "gid",
            "status",
            "totalLength",
            "completedLength",
            "downloadSpeed",
            "uploadSpeed",
            "infoHash",
            "numSeeders",
            "connections",
            "files",
            "errorMessage",
            "dir",
        ]
        return await self._rpc_call("aria2.tellStatus", [gid, keys])

    async def pause(self, gid: str) -> None:
        """Pauses the download task."""
        await self._rpc_call("aria2.pause", [gid])

    async def unpause(self, gid: str) -> None:
        """Resumes the download task."""
        await self._rpc_call("aria2.unpause", [gid])

    async def remove(self, gid: str) -> None:
        """Cancels and removes the download task."""
        await self._rpc_call("aria2.remove", [gid])

    async def get_system_status(self) -> Dict[str, Any]:
        """Returns discovery information for system health checks and settings."""
        binary = self.find_binary()
        version = self.get_version() if binary else None
        rpc_online = await self.is_rpc_online()
        return {
            "installed": binary is not None,
            "binary_path": binary,
            "version": version,
            "rpc_online": rpc_online,
            "rpc_url": self.rpc_url,
        }


aria2_service = Aria2Service()
