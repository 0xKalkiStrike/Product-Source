from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.core.database import get_db
from app.models.all_models import AuditLog, User
from app.api.deps import get_current_user

router = APIRouter(prefix="/audit-logs", tags=["Audit System"])

@router.get("")
async def list_global_audit_logs(
    skip: int = 0,
    limit: int = 50,
    project_id: Optional[str] = None,
    action: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(AuditLog)
    count_query = select(func.count(AuditLog.id))

    if project_id:
        query = query.where(AuditLog.project_id == project_id)
        count_query = count_query.where(AuditLog.project_id == project_id)

    if action:
        query = query.where(AuditLog.action == action)
        count_query = count_query.where(AuditLog.action == action)

    if search:
        pattern = f"%{search}%"
        search_filter = or_(
            AuditLog.action.ilike(pattern),
            AuditLog.status.ilike(pattern),
            AuditLog.user_id.ilike(pattern)
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    total_res = await db.execute(count_query)
    total = total_res.scalar() or 0

    res = await db.execute(query.offset(skip).limit(limit).order_by(AuditLog.timestamp.desc()))
    logs = res.scalars().all()

    items = []
    for l in logs:
        items.append({
            "id": l.id,
            "user_id": l.user_id,
            "project_id": l.project_id,
            "action": l.action,
            "status": l.status,
            "details": l.details,
            "ip_address": l.ip_address,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None
        })

    return {"total": total, "items": items}
