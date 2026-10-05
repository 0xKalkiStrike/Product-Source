import asyncio
import logging
from datetime import datetime, timezone
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.all_models import Source
from app.orchestration.queue import job_queue

logger = logging.getLogger("InternalScheduler")

class InternalScheduler:
    """
    Central Lightweight Scheduler.
    Determines due monitoring/verification tasks and creates jobs in the Priority Job Queue.
    Never spawns OS cron processes or uncontrolled scrapers!
    """
    def __init__(self, check_interval_seconds: int = 15):
        self.check_interval_seconds = check_interval_seconds
        self.running = False
        self._task: asyncio.Task = None

    async def start(self):
        self.running = True
        self._task = asyncio.create_task(self._scheduler_loop())

    async def stop(self):
        self.running = False
        if self._task:
            self._task.cancel()

    async def _scheduler_loop(self):
        logger.info("Internal Lightweight Scheduler online.")
        while self.running:
            try:
                await self.check_and_schedule_due_tasks()
                await asyncio.sleep(self.check_interval_seconds)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Scheduler exception: {str(e)}")
                await asyncio.sleep(self.check_interval_seconds)

    async def check_and_schedule_due_tasks(self):
        async with AsyncSessionLocal() as db:
            # Check active sources with monitoring rules
            res = await db.execute(select(Source).where(Source.status == "ACTIVE"))
            sources = res.scalars().all()

            now = datetime.now(timezone.utc)
            for src in sources:
                # If never executed or monitoring interval has passed
                if not src.last_successful_execution:
                    logger.info(f"Scheduling monitoring job for source '{src.name}'")
                    await job_queue.create_job(
                        db=db,
                        project_id=src.project_id,
                        task_type="MONITORING",
                        payload={
                            "source_id": src.id,
                            "source_name": src.name,
                            "adapter_name": src.adapter_name
                        },
                        priority=3
                    )
                    src.last_successful_execution = now
                    await db.commit()

internal_scheduler = InternalScheduler()
