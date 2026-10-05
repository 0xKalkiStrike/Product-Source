from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
import time
from app.core.database import get_db
from app.models.all_models import WorkerModel, Job
from app.orchestration.resources import resource_manager

router = APIRouter(prefix="/health", tags=["System Health"])

start_time = time.time()

@router.get("")
async def system_health(db: AsyncSession = Depends(get_db)):
    db_status = "healthy"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    system_metrics = resource_manager.get_metrics()

    # Active & Healthy Workers
    res_w = await db.execute(select(WorkerModel))
    workers = res_w.scalars().all()
    active_workers = len(workers)
    healthy_workers = sum(1 for w in workers if w.status in ["IDLE", "BUSY"])
    unhealthy_workers = sum(1 for w in workers if w.status == "UNHEALTHY")

    # Queued & Running Jobs
    q_res = await db.execute(select(func.count(Job.id)).where(Job.status.in_(["QUEUED", "PENDING"])))
    queued_jobs = q_res.scalar() or 0

    r_res = await db.execute(select(func.count(Job.id)).where(Job.status == "RUNNING"))
    running_executions = r_res.scalar() or 0

    f_res = await db.execute(select(func.count(Job.id)).where(Job.status == "FAILED"))
    failed_executions = f_res.scalar() or 0

    return {
        "status": "healthy" if db_status == "healthy" and not system_metrics["high_load"] else "degraded",
        "uptime_seconds": round(time.time() - start_time, 2),
        "database": db_status,
        "system_metrics": system_metrics,
        "orchestration_engine": {
            "status": "OPERATIONAL",
            "active_workers": active_workers,
            "healthy_workers": healthy_workers,
            "unhealthy_workers": unhealthy_workers,
            "queued_jobs": queued_jobs,
            "running_executions": running_executions,
            "failed_executions": failed_executions
        }
    }
