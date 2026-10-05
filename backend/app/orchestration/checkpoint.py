from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.all_models import ExecutionCheckpoint

async def save_checkpoint(
    db: AsyncSession,
    job_id: str,
    step_number: int,
    completed_item_ids: List[str],
    state_data: Optional[Dict[str, Any]] = None
) -> ExecutionCheckpoint:
    res = await db.execute(select(ExecutionCheckpoint).where(ExecutionCheckpoint.job_id == job_id))
    checkpoint = res.scalars().first()

    if not checkpoint:
        checkpoint = ExecutionCheckpoint(
            job_id=job_id,
            step_number=step_number,
            completed_item_ids=completed_item_ids,
            state_data=state_data
        )
        db.add(checkpoint)
    else:
        checkpoint.step_number = step_number
        checkpoint.completed_item_ids = completed_item_ids
        checkpoint.state_data = state_data
        checkpoint.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(checkpoint)
    return checkpoint

async def get_checkpoint(db: AsyncSession, job_id: str) -> Optional[ExecutionCheckpoint]:
    res = await db.execute(select(ExecutionCheckpoint).where(ExecutionCheckpoint.job_id == job_id))
    return res.scalars().first()
