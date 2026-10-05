from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, or_

from app.models.all_models import Job

class PriorityJobQueue:
    """
    DB-backed Priority Queue for background orchestration workloads.
    """
    async def create_job(
        self,
        db: AsyncSession,
        project_id: str,
        task_type: str,
        payload: Optional[Dict[str, Any]] = None,
        priority: int = 3,
        total_items: int = 0
    ) -> Job:
        job = Job(
            project_id=project_id,
            task_type=task_type,
            priority=priority,
            status="QUEUED",
            payload=payload or {},
            total_items=total_items,
            processed_items=0,
            progress=0.0
        )
        db.add(job)
        await db.commit()
        await db.refresh(job)
        return job

    async def fetch_next_job(self, db: AsyncSession, allowed_task_types: List[str]) -> Optional[Job]:
        # Select highest priority (lowest number: 1 < 2 < 3 < 4) queued or retrying job scheduled for now
        now = datetime.now(timezone.utc)
        stmt = (
            select(Job)
            .where(
                Job.task_type.in_(allowed_task_types),
                Job.status.in_(["QUEUED", "RETRYING"]),
                Job.scheduled_at <= now
            )
            .order_by(Job.priority.asc(), Job.scheduled_at.asc())
            .limit(1)
        )
        res = await db.execute(stmt)
        return res.scalars().first()

    async def mark_running(self, db: AsyncSession, job_id: str, worker_id: str) -> Optional[Job]:
        res = await db.execute(select(Job).where(Job.id == job_id))
        job = res.scalars().first()
        if job:
            job.status = "RUNNING"
            job.worker_id = worker_id
            job.started_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(job)
        return job

    async def update_progress(
        self,
        db: AsyncSession,
        job_id: str,
        processed_items: int,
        total_items: Optional[int] = None
    ):
        res = await db.execute(select(Job).where(Job.id == job_id))
        job = res.scalars().first()
        if job:
            job.processed_items = processed_items
            if total_items is not None and total_items > 0:
                job.total_items = total_items
            if job.total_items > 0:
                job.progress = round(min(100.0, (processed_items / job.total_items) * 100.0), 1)
            await db.commit()

    async def complete_job(self, db: AsyncSession, job_id: str):
        res = await db.execute(select(Job).where(Job.id == job_id))
        job = res.scalars().first()
        if job:
            job.status = "COMPLETED"
            job.progress = 100.0
            job.completed_at = datetime.now(timezone.utc)
            await db.commit()

    async def fail_job(self, db: AsyncSession, job_id: str, error_message: str):
        res = await db.execute(select(Job).where(Job.id == job_id))
        job = res.scalars().first()
        if job:
            job.status = "FAILED"
            job.error_message = error_message
            job.completed_at = datetime.now(timezone.utc)
            await db.commit()

    async def schedule_retry(self, db: AsyncSession, job_id: str, next_attempt_at: datetime, error_message: str):
        res = await db.execute(select(Job).where(Job.id == job_id))
        job = res.scalars().first()
        if job:
            job.status = "RETRYING"
            job.retry_count += 1
            job.scheduled_at = next_attempt_at
            job.error_message = f"Retry #{job.retry_count}: {error_message}"
            await db.commit()

job_queue = PriorityJobQueue()
