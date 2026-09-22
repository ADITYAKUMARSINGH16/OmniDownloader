import sys
import os
import importlib.util

# Re-export local queue manager symbols
from queue.manager import DownloadQueue, QueueItem, queue_manager

__all__ = ["DownloadQueue", "QueueItem", "queue_manager"]

# Also re-export standard library queue symbols so libraries like aiosqlite can do:
# from queue import Empty, Queue
try:
    current_backend = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
    for p in sys.path:
        if p and os.path.abspath(p) != current_backend:
            cand = os.path.join(p, "queue.py")
            if os.path.isfile(cand):
                spec = importlib.util.spec_from_file_location("_stdlib_queue", cand)
                if spec and spec.loader:
                    mod = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(mod)
                    for k in dir(mod):
                        if not k.startswith("__") and k not in globals():
                            globals()[k] = getattr(mod, k)
                    break

    if "Empty" not in globals():
        import _queue
        Empty = _queue.Empty
        SimpleQueue = getattr(_queue, "SimpleQueue", None)
except Exception:
    pass
