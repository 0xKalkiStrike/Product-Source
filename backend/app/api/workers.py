from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.all_models import WorkerModel, User, AuditLog
from app.schemas.orchestration_schemas import WorkerOut, WorkerListOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/workers", tags=["Workers"])

@router.get("", response_model=WorkerListOut)
async def list_workers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    count_stmt = select(func.count(WorkerModel.id))
    stmt = select(WorkerModel).order_by(WorkerModel.worker_name.asc())

    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    res = await db.execute(stmt)
    workers = res.scalars().all()

    return WorkerListOut(
        total=total,
        items=[WorkerOut.model_validate(w) for w in workers]
    )

@router.post("/{worker_id}/restart", response_model=WorkerOut)
async def restart_worker(
    worker_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(WorkerModel).where(WorkerModel.id == worker_id))
    worker = res.scalars().first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    worker.status = "IDLE"
    worker.current_job_id = None
    await db.commit()
    await db.refresh(worker)

    audit = AuditLog(
        user_id=current_user.id,
        action="WORKER_RESTART",
        status="SUCCESS",
        details={"worker_name": worker.worker_name}
    )
    db.add(audit)
    await db.commit()

    return WorkerOut.model_validate(worker)
