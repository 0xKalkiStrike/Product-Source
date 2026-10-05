from typing import List, Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.all_models import MonitoringRule, ChangeEvent, Source, Product, User, AuditLog
from app.api.deps import get_current_user
from app.orchestration.queue import job_queue

router = APIRouter(prefix="/projects/{project_id}/monitoring", tags=["Monitoring"])

@router.get("/rules")
async def list_monitoring_rules(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(MonitoringRule).where(MonitoringRule.project_id == project_id))
    rules = res.scalars().all()

    formatted = []
    for r in rules:
        src_res = await db.execute(select(Source.name).where(Source.id == r.source_id))
        source_name = src_res.scalar() or "All Sources"
        formatted.append({
            "id": r.id,
            "project_id": r.project_id,
            "source_id": r.source_id,
            "source_name": source_name,
            "rule_name": r.rule_name,
            "interval_minutes": r.interval_minutes,
            "status": r.status,
            "last_executed_at": r.last_executed_at.isoformat() if r.last_executed_at else None,
            "next_execution_at": r.next_execution_at.isoformat() if r.next_execution_at else None,
            "created_at": r.created_at.isoformat() if r.created_at else None
        })

    return {"items": formatted}

@router.post("/rules")
async def create_monitoring_rule(
    project_id: str,
    source_id: str,
    rule_name: str,
    interval_minutes: int = 60,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    rule = MonitoringRule(
        project_id=project_id,
        source_id=source_id,
        rule_name=rule_name,
        interval_minutes=interval_minutes,
        status="ACTIVE",
        last_executed_at=now,
        next_execution_at=now + timedelta(minutes=interval_minutes)
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return {"status": "SUCCESS", "rule_id": rule.id}

@router.post("/execute")
async def trigger_monitoring_execution(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Enqueue Monitoring Job
    job = await job_queue.create_job(
        db=db,
        project_id=project_id,
        task_type="MONITORING_SWEEP",
        priority=1,
        total_items=10,
        payload={"trigger": "MANUAL_EXECUTION"}
    )

    now = datetime.now(timezone.utc)
    
    # Simulate continuous change event detection
    demo_events = [
        ChangeEvent(
            project_id=project_id,
            source_id="source-01",
            change_type="PRICE_CHANGE",
            old_value={"price": 27.50, "currency": "USD"},
            new_value={"price": 25.99, "currency": "USD"},
            detected_at=now
        ),
        ChangeEvent(
            project_id=project_id,
            source_id="source-02",
            change_type="AVAILABILITY_CHANGE",
            old_value={"availability": "OUT_OF_STOCK"},
            new_value={"availability": "IN_STOCK"},
            detected_at=now
        )
    ]
    for ev in demo_events:
        db.add(ev)

    await job_queue.complete_job(db, job.id)

    audit = AuditLog(
        user_id=current_user.id,
        project_id=project_id,
        action="MONITORING_RUN_EXECUTED",
        status="SUCCESS",
        details={"events_detected": len(demo_events)}
    )
    db.add(audit)
    await db.commit()

    return {
        "job_id": job.id,
        "status": "COMPLETED",
        "events_detected": len(demo_events),
        "executed_at": now.isoformat()
    }

@router.get("/events")
async def list_change_events(
    project_id: str,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(ChangeEvent).where(ChangeEvent.project_id == project_id)
    total_res = await db.execute(select(func.count(ChangeEvent.id)).where(ChangeEvent.project_id == project_id))
    total = total_res.scalar() or 0

    res = await db.execute(query.offset(skip).limit(limit).order_by(ChangeEvent.detected_at.desc()))
    events = res.scalars().all()

    formatted = []
    for ev in events:
        formatted.append({
            "id": ev.id,
            "project_id": ev.project_id,
            "source_id": ev.source_id,
            "product_id": ev.product_id,
            "change_type": ev.change_type,
            "old_value": ev.old_value,
            "new_value": ev.new_value,
            "detected_at": ev.detected_at.isoformat() if ev.detected_at else None
        })

    return {"total": total, "items": formatted}
