from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.all_models import Project, Product, Job, WorkerModel, MonitoringRule, AuditLog, User
from app.api.deps import get_current_user

router = APIRouter(tags=["Dashboard"])

async def _fetch_dashboard_data(db: AsyncSession):
    proj_res = await db.execute(select(func.count(Project.id)))
    total_projects = proj_res.scalar() or 0

    prod_res = await db.execute(select(func.count(Product.id)))
    total_products = prod_res.scalar() or 0

    verif_res = await db.execute(select(func.count(Product.id)).where(Product.status == "VERIFIED"))
    verified_products = verif_res.scalar() or 0

    fail_res = await db.execute(select(func.count(Product.id)).where(Product.status == "FAILED"))
    failed_products = fail_res.scalar() or 0

    act_job_res = await db.execute(select(func.count(Job.id)).where(Job.status == "RUNNING"))
    active_jobs = act_job_res.scalar() or 0

    q_job_res = await db.execute(select(func.count(Job.id)).where(Job.status == "PENDING"))
    queued_jobs = q_job_res.scalar() or 0

    rule_res = await db.execute(select(func.count(MonitoringRule.id)).where(MonitoringRule.status == "ACTIVE"))
    monitoring_tasks = rule_res.scalar() or 0

    worker_res = await db.execute(select(func.count(WorkerModel.id)).where(WorkerModel.status != "OFFLINE"))
    healthy_workers = worker_res.scalar() or 0

    audit_res = await db.execute(
        select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(10)
    )
    recent_audits = audit_res.scalars().all()

    return {
        "summary": {
            "total_projects": total_projects,
            "total_products": total_products,
            "verified_products": verified_products,
            "failed_products": failed_products,
            "active_jobs": active_jobs,
            "queued_jobs": queued_jobs,
            "monitoring_tasks": monitoring_tasks,
            "healthy_workers": healthy_workers,
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

@router.get("/dashboard/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await _fetch_dashboard_data(db)

@router.get("/overview")
async def get_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await _fetch_dashboard_data(db)

@router.get("/notifications")
async def get_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    audit_res = await db.execute(
        select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(20)
    )
    audits = audit_res.scalars().all()
    notifications = [
        {
            "id": a.id,
            "title": f"Action {a.action}",
            "message": f"Status: {a.status}",
            "status": a.status,
            "timestamp": a.timestamp,
            "read": False
        }
        for a in audits
    ]
    return {
        "notifications": notifications,
        "unread_count": len([n for n in notifications if not n["read"]])
    }
