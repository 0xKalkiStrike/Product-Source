from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.all_models import Source, User, AuditLog
from app.schemas.phase2 import SourceCreate, SourceUpdate, SourceOut, SourceListOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/projects/{project_id}/sources", tags=["Sources"])

@router.get("", response_model=SourceListOut)
async def list_sources(
    project_id: str,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    count_stmt = select(func.count(Source.id)).where(Source.project_id == project_id)
    stmt = select(Source).where(Source.project_id == project_id).offset(skip).limit(limit).order_by(Source.created_at.desc())

    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    res = await db.execute(stmt)
    sources = res.scalars().all()

    return SourceListOut(
        total=total,
        items=[SourceOut.model_validate(s) for s in sources]
    )

@router.post("", response_model=SourceOut, status_code=status.HTTP_201_CREATED)
async def create_source(
    project_id: str,
    source_in: SourceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    source = Source(
        project_id=project_id,
        name=source_in.name,
        url=source_in.url,
        source_type=source_in.source_type or "PUBLIC_SURFACE_WEB",
        auth_required=source_in.auth_required or False,
        credential_id=source_in.credential_id,
        adapter_name=source_in.adapter_name or "GenericSourceAdapter",
        max_concurrency=source_in.max_concurrency or 5,
        rate_limit_rpm=source_in.rate_limit_rpm or 60,
        monitoring_interval_min=source_in.monitoring_interval_min or 60,
        status="ACTIVE"
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)

    audit = AuditLog(
        user_id=current_user.id,
        project_id=project_id,
        action="SOURCE_CREATE",
        status="SUCCESS",
        details={"name": source.name, "url": source.url, "adapter": source.adapter_name}
    )
    db.add(audit)
    await db.commit()

    return SourceOut.model_validate(source)

@router.patch("/{source_id}", response_model=SourceOut)
async def update_source(
    project_id: str,
    source_id: str,
    source_in: SourceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Source).where(Source.project_id == project_id, Source.id == source_id))
    source = res.scalars().first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    update_data = source_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(source, field, val)

    await db.commit()
    await db.refresh(source)

    audit = AuditLog(
        user_id=current_user.id,
        project_id=project_id,
        action="SOURCE_UPDATE",
        status="SUCCESS",
        details={"source_id": source_id, "updated": list(update_data.keys())}
    )
    db.add(audit)
    await db.commit()

    return SourceOut.model_validate(source)

@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_source(
    project_id: str,
    source_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Source).where(Source.project_id == project_id, Source.id == source_id))
    source = res.scalars().first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    await db.delete(source)
    await db.commit()

    audit = AuditLog(
        user_id=current_user.id,
        project_id=project_id,
        action="SOURCE_DELETE",
        status="SUCCESS",
        details={"source_name": source.name}
    )
    db.add(audit)
    await db.commit()
