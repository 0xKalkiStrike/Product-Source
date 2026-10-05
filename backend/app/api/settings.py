from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.all_models import SystemSetting, User, AuditLog
from app.api.deps import get_current_user

router = APIRouter(prefix="/settings", tags=["System Settings"])

DEFAULT_SETTINGS = {
    "global_concurrency_limit": 100,
    "max_worker_pool_size": 10,
    "default_rate_limit_rpm": 60,
    "execution_timeout_seconds": 300,
    "cpu_overload_threshold_pct": 85.0,
    "ram_overload_threshold_pct": 90.0,
    "enable_auto_checkpointing": True,
    "max_retry_attempts": 3
}

@router.get("")
async def get_system_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(SystemSetting))
    db_settings = {s.key: s.value for s in res.scalars().all()}
    merged = {**DEFAULT_SETTINGS, **db_settings}
    return merged

@router.put("")
async def update_system_settings(
    new_settings: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    for key, val in new_settings.items():
        res = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
        setting = res.scalars().first()
        if setting:
            setting.value = val
        else:
            db.add(SystemSetting(key=key, value=val))

    audit = AuditLog(
        user_id=current_user.id,
        action="UPDATE_SYSTEM_SETTINGS",
        status="SUCCESS",
        details=new_settings
    )
    db.add(audit)
    await db.commit()

    return {"status": "SUCCESS", "settings": new_settings}
