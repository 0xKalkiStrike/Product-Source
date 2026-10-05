import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.all_models import WorkerModel, Job

logger = logging.getLogger("AutoRecoveryEngine")

class AutoRecoveryEngine:
    """
    Monitors worker pool heartbeats.
    Automatically detects crashed workers, reclaims orphan jobs, and activates replacements.
    """
    async def run_recovery_check(self, db: AsyncSession, heartbeat_timeout_seconds: int = 30):
        cutoff = datetime.now(timezone.utc) - timedelta(seconds=heartbeat_timeout_seconds)

        # 1. Find stale/crashed workers
        res = await db.execute(
            select(WorkerModel).where(
                WorkerModel.status.in_(["IDLE", "BUSY"]),
                WorkerModel.last_heartbeat < cutoff
            )
        )
        stale_workers = res.scalars().all()

        for worker in stale_workers:
            logger.warning(f"Worker '{worker.worker_name}' missed heartbeat. Marking UNHEALTHY.")
            worker.status = "UNHEALTHY"

            # Reclaim active job if worker was busy
            if worker.current_job_id:
                job_res = await db.execute(select(Job).where(Job.id == worker.current_job_id))
                job = job_res.scalars().first()
                if job and job.status == "RUNNING":
                    logger.info(f"Reclaiming orphan job '{job.id}' from crashed worker '{worker.worker_name}'. Rescheduling.")
                    job.status = "QUEUED"
                    job.worker_id = None
                    job.error_message = f"Reclaimed after worker '{worker.worker_name}' crash."

            worker.current_job_id = None

        await db.commit()

auto_recovery = AutoRecoveryEngine()
