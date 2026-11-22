"""
OmniDownload Unified Development Runner
Starts both the FastAPI backend and Next.js frontend concurrently.
Handles clean shutdown (Ctrl+C) for both process trees.
"""

import os
import sys
import subprocess
import threading
import signal
import time
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"


def get_backend_python() -> str:
    """Find the best python executable to run the backend."""
    # Check Windows venv
    win_venv = BACKEND_DIR / "venv" / "Scripts" / "python.exe"
    if win_venv.is_file():
        return str(win_venv)

    # Check Unix venv
    unix_venv = BACKEND_DIR / "venv" / "bin" / "python"
    if unix_venv.is_file():
        return str(unix_venv)

    # Fallback to current python
    return sys.executable


def get_npm_cmd() -> str:
    """Return npm command suitable for the platform."""
    return "npm.cmd" if sys.platform == "win32" else "npm"


def stream_logs(process: subprocess.Popen, prefix: str, color_code: str):
    """Stream stdout/stderr from a subprocess with a colorized prefix."""
    reset_code = "\033[0m"
    try:
        for line in iter(process.stdout.readline, ""):
            if not line:
                break
            print(f"{color_code}{prefix}{reset_code} {line.rstrip()}")
    except Exception:
        pass


def kill_process_tree(proc: subprocess.Popen):
    """Terminate the process and all its child processes cleanly."""
    if proc is None or proc.poll() is not None:
        return

    pid = proc.pid
    if sys.platform == "win32":
        # Forcefully terminate process and all child processes spawned by it
        subprocess.run(
            ["taskkill", "/F", "/T", "/PID", str(pid)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    else:
        try:
            os.killpg(os.getpgid(pid), signal.SIGTERM)
        except Exception:
            proc.terminate()


# Try enabling static_ffmpeg in parent environment if available
try:
    import static_ffmpeg
    static_ffmpeg.add_paths()
except Exception:
    pass


def free_port(port: int):
    """If a port is already occupied by a stale/orphan process, terminate it to prevent [WinError 10013]."""
    if sys.platform == "win32":
        try:
            cmd = f'netstat -ano | findstr ":{port} "'
            out = subprocess.check_output(cmd, shell=True, text=True, stderr=subprocess.DEVNULL)
            for line in out.strip().splitlines():
                parts = line.split()
                if len(parts) >= 5 and "LISTENING" in parts:
                    pid = parts[-1]
                    if pid and pid != "0" and int(pid) != os.getpid():
                        print(f"\033[93m[PORT CHECK]\033[0m Port {port} in use by PID {pid}. Freeing port...")
                        subprocess.run(["taskkill", "/F", "/T", "/PID", pid], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                        time.sleep(0.8)
        except Exception:
            pass
    else:
        try:
            cmd = f"lsof -ti :{port}"
            pids = subprocess.check_output(cmd, shell=True, text=True).strip().split()
            for pid in pids:
                if pid and int(pid) != os.getpid():
                    os.kill(int(pid), signal.SIGKILL)
        except Exception:
            pass

    # Give Windows TCP stack a brief moment to clear TIME_WAIT
    time.sleep(0.3)


def main():
    # Enable ANSI escape colors on Windows console
    if sys.platform == "win32":
        os.system("")

    CYAN = "\033[96m"
    MAGENTA = "\033[95m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RESET = "\033[0m"

    print(f"{GREEN}============================================{RESET}")
    print(f"{GREEN}       Starting OmniDownload Dev Servers    {RESET}")
    print(f"{GREEN}============================================{RESET}")

    # Ensure ports 8000 and 3000 are not occupied by previous crashed/orphan instances
    free_port(8000)
    free_port(3000)

    backend_py = get_backend_python()
    npm_cmd = get_npm_cmd()

    print(f"{YELLOW}Using Backend Python:{RESET} {backend_py}")
    print(f"{YELLOW}Backend directory:   {RESET} {BACKEND_DIR}")
    print(f"{YELLOW}Frontend directory:  {RESET} {FRONTEND_DIR}\n")

    # Start Backend
    # Run uvicorn via python -m uvicorn with reload, or fallback to main.py
    backend_cmd = [backend_py, "-m", "uvicorn", "main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"]
    backend_proc = subprocess.Popen(
        backend_cmd,
        cwd=str(BACKEND_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )

    # Start Frontend
    frontend_cmd = [npm_cmd, "run", "dev"]
    frontend_proc = subprocess.Popen(
        frontend_cmd,
        cwd=str(FRONTEND_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )

    # Start threads to stream output
    t_backend = threading.Thread(
        target=stream_logs,
        args=(backend_proc, "[BACKEND]", CYAN),
        daemon=True,
    )
    t_frontend = threading.Thread(
        target=stream_logs,
        args=(frontend_proc, "[FRONTEND]", MAGENTA),
        daemon=True,
    )

    t_backend.start()
    t_frontend.start()

    print(f"{GREEN}Backend running at:  http://127.0.0.1:8000 (Docs: http://127.0.0.1:8000/docs){RESET}")
    print(f"{GREEN}Frontend running at: http://localhost:3000{RESET}")
    print(f"{YELLOW}Press Ctrl+C to stop both servers...{RESET}\n")

    def handle_exit(signum=None, frame=None):
        print(f"\n{YELLOW}Stopping backend and frontend servers...{RESET}")
        kill_process_tree(backend_proc)
        kill_process_tree(frontend_proc)
        print(f"{GREEN}Servers stopped.{RESET}")
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_exit)
    signal.signal(signal.SIGTERM, handle_exit)

    try:
        while True:
            # Check if any process terminated prematurely
            b_poll = backend_proc.poll()
            f_poll = frontend_proc.poll()

            if b_poll is not None:
                print(f"\n[BACKEND] exited with code {b_poll}. Shutting down...")
                handle_exit()
            if f_poll is not None:
                print(f"\n[FRONTEND] exited with code {f_poll}. Shutting down...")
                handle_exit()

            time.sleep(0.5)
    except KeyboardInterrupt:
        handle_exit()


if __name__ == "__main__":
    main()
