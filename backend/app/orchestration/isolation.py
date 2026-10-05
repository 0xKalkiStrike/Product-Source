import asyncio
import logging
from typing import Callable, Any, Dict, Optional
from datetime import datetime, timezone

logger = logging.getLogger("ExecutionIsolation")

class IsolatedExecutionContext:
    """
    Provides an isolated execution environment per job task.
    Enforces execution timeouts, resource tracking, log capture, and crash isolation.
    """
    def __init__(self, execution_id: str, timeout_seconds: int = 120):
        self.execution_id = execution_id
        self.timeout_seconds = timeout_seconds
        self.logs: list[str] = []
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None

    def log(self, message: str):
        timestamp = datetime.now(timezone.utc).isoformat()
        entry = f"[{timestamp}] [EXEC-{self.execution_id}] {message}"
        self.logs.append(entry)
        logger.info(entry)

    async def run(self, func: Callable[..., Any], *args, **kwargs) -> Dict[str, Any]:
        self.start_time = datetime.now(timezone.utc)
        self.log("Starting isolated task execution context")
        try:
            result = await asyncio.wait_for(
                func(*args, **kwargs),
                timeout=float(self.timeout_seconds)
            )
            self.end_time = datetime.now(timezone.utc)
            self.log("Task completed successfully")
            return {
                "success": True,
                "result": result,
                "logs": self.logs,
                "execution_id": self.execution_id
            }
        except asyncio.TimeoutError:
            self.end_time = datetime.now(timezone.utc)
            self.log(f"Execution timed out after {self.timeout_seconds}s")
            return {
                "success": False,
                "error": f"TASK_TIMEOUT: Exceeded limit of {self.timeout_seconds} seconds",
                "logs": self.logs,
                "execution_id": self.execution_id
            }
        except Exception as e:
            self.end_time = datetime.now(timezone.utc)
            self.log(f"Execution failed with exception: {str(e)}")
            return {
                "success": False,
                "error": f"EXECUTION_FAILURE: {str(e)}",
                "logs": self.logs,
                "execution_id": self.execution_id
            }
