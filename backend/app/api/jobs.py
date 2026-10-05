from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.all_models import Job, User, AuditLog
from app.schemas.orchestration_schemas import JobCreate, JobOut, JobListOut
from app.orchestration.queue import job_queue
from app.api.deps import get_current_user

router = APIRouter(prefix="/projects/{project_id}/jobs", tags=["Jobs"])

@router.get("", response_model=JobListOut)
async def list_jobs(
    project_id: str,
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = None,
    task_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Job).where(Job.project_id == project_id)
    count_query = select(func.count(Job.id)).where(Job.project_id == project_id)

    if status_filter:
        query = query.where(Job.status == status_filter)
        count_query = count_query.where(Job.status == status_filter)

    if task_type:
        query = query.where(Job.task_type == task_type)
        count_query = count_query.where(Job.task_type == task_type)

    total_res = await db.execute(count_query)
    total = total_res.scalar() or 0

    query = query.offset(skip).limit(limit).order_by(Job.created_at.desc())
    res = await db.execute(query)
    jobs = res.scalars().all()

    return JobListOut(
        total=total,
        items=[JobOut.model_validate(j) for j in jobs]
    )

@router.post("", response_model=JobOut, status_code=status.HTTP_201_CREATED)
async def create_job(
    project_id: str,
    job_in: JobCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    job = await job_queue.create_job(
        db=db,
        project_id=project_id,
        task_type=job_in.task_type,
        payload=job_in.payload,
        priority=job_in.priority or 3
    )

    audit = AuditLog(
        user_id=current_user.id,
        project_id=project_id,
        action="JOB_ENQUEUE",
        status="SUCCESS",
        details={"job_id": job.id, "task_type": job.task_type, "priority": job.priority}
    )
    db.add(audit)
    await db.commit()

    return JobOut.model_validate(job)

@router.post("/{job_id}/pause", response_model=JobOut)
async def pause_job(
    project_id: str,
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Job).where(Job.project_id == project_id, Job.id == job_id))
    job = res.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.status = "PAUSED"
    await db.commit()
    await db.refresh(job)
    return JobOut.model_validate(job)

@router.post("/{job_id}/resume", response_model=JobOut)
async def resume_job(
    project_id: str,
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Job).where(Job.project_id == project_id, Job.id == job_id))
    job = res.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.status = "QUEUED"
    await db.commit()
    await db.refresh(job)
    return JobOut.model_validate(job)

@router.post("/{job_id}/cancel", response_model=JobOut)
async def cancel_job(
    project_id: str,
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Job).where(Job.project_id == project_id, Job.id == job_id))
    job = res.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.status = "CANCELLED"
    await db.commit()
    await db.refresh(job)
    return JobOut.model_validate(job)
