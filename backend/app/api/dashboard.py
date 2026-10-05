from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.all_models import Project, User, AuditLog
from app.api.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Count projects
    proj_res = await db.execute(select(func.count(Project.id)))
    total_projects = proj_res.scalar() or 0

    # Recent Audit Activity
    audit_res = await db.execute(
        select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(10)
    )
    recent_audits = audit_res.scalars().all()

    return {
        "summary": {
            "total_projects": total_projects,
            "total_products": 0,
            "verified_products": 0,
            "failed_products": 0,
            "active_jobs": 0,
            "queued_jobs": 0,
            "monitoring_tasks": 0,
            "healthy_workers": 0,
            "failed_executions": 0,
            "avg_market_price_usd": 0.00
        },
        "recent_activity": [
            {
                "id": a.id,
                "action": a.action,
                "status": a.status,
                "details": a.details,
                "timestamp": a.timestamp
            } for a in recent_audits
        ]
    }
