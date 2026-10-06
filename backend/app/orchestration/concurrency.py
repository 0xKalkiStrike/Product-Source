import asyncio
from typing import Dict

class ConcurrencyController:
    """
    Multi-level concurrency manager enforcing Global, Project, and Source limits.
    Prevents unlimited process spawning and system crashes.
    """
    def __init__(
        self,
        global_limit: int = 50,
        project_limit: int = 15,
        source_limit: int = 5
    ):
        self.global_limit = global_limit
        self.project_limit = project_limit
        self.source_limit = source_limit

        self.current_global: int = 0
        self.current_project: Dict[str, int] = {}
        self.current_source: Dict[str, int] = {}
        self._lock = asyncio.Lock()

    async def can_execute(self, project_id: str, source_id: str | None = None) -> bool:
        async with self._lock:
            if self.current_global >= self.global_limit:
                return False
            if self.current_project.get(project_id, 0) >= self.project_limit:
                return False
            if source_id and self.current_source.get(source_id, 0) >= self.source_limit:
                return False
            return True

    async def acquire_slot(self, project_id: str, source_id: str | None = None) -> bool:
        async with self._lock:
            if self.current_global >= self.global_limit:
                return False
            if self.current_project.get(project_id, 0) >= self.project_limit:
                return False
            if source_id and self.current_source.get(source_id, 0) >= self.source_limit:
                return False

            self.current_global += 1
            self.current_project[project_id] = self.current_project.get(project_id, 0) + 1
            if source_id:
                self.current_source[source_id] = self.current_source.get(source_id, 0) + 1
            return True

    async def release_slot(self, project_id: str, source_id: str | None = None):
        async with self._lock:
            self.current_global = max(0, self.current_global - 1)
            if project_id in self.current_project:
                self.current_project[project_id] = max(0, self.current_project[project_id] - 1)
            if source_id and source_id in self.current_source:
                self.current_source[source_id] = max(0, self.current_source[source_id] - 1)

concurrency_controller = ConcurrencyController()
