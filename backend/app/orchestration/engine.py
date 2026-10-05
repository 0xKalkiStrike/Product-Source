import asyncio
import logging
from app.core.database import AsyncSessionLocal
from app.orchestration.worker_pool import worker_pool
from app.orchestration.scheduler import internal_scheduler
from app.orchestration.recovery import auto_recovery

logger = logging.getLogger("OrchestrationEngine")

class OrchestrationEngine:
    """
    Master Workload Orchestration Engine coordinator.
    Manages internal scheduler, worker pool, auto-recovery, resource manager, and concurrency controller.
    """
    def __init__(self):
        self.is_initialized = False
        self._recovery_task: asyncio.Task = None

    async def initialize(self):
        if self.is_initialized:
            return
        logger.info("Initializing Internal Workload Orchestration Engine...")
        await worker_pool.start_pool()
        await internal_scheduler.start()
        self._recovery_task = asyncio.create_task(self._recovery_loop())
        self.is_initialized = True
        logger.info("Orchestration Engine fully initialized and operational!")

    async def shutdown(self):
        if not self.is_initialized:
            return
        logger.info("Shutting down Orchestration Engine...")
        await internal_scheduler.stop()
        await worker_pool.stop_pool()
        if self._recovery_task:
            self._recovery_task.cancel()
        self.is_initialized = False

    async def _recovery_loop(self):
        while self.is_initialized:
            try:
                async with AsyncSessionLocal() as db:
                    await auto_recovery.run_recovery_check(db, heartbeat_timeout_seconds=30)
                await asyncio.sleep(15)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Recovery loop error: {str(e)}")
                await asyncio.sleep(15)

orchestration_engine = OrchestrationEngine()
