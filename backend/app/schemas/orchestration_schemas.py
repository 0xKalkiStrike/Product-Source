from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class JobCreate(BaseModel):
    task_type: str  # VERIFICATION, MONITORING, SCREENSHOT, PRICE_CALC, REPORT
    priority: Optional[int] = 3  # 1=CRITICAL, 2=HIGH, 3=NORMAL, 4=LOW
    payload: Optional[Dict[str, Any]] = None

class JobOut(BaseModel):
    id: str
    project_id: str
    task_type: str
    priority: int
    status: str
    payload: Optional[Dict[str, Any]] = None
    progress: float
    total_items: int
    processed_items: int
    worker_id: Optional[str] = None
    retry_count: int
    max_retries: int
    error_message: Optional[str] = None
    scheduled_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class JobListOut(BaseModel):
    total: int
    items: List[JobOut]

class WorkerOut(BaseModel):
    id: str
    worker_name: str
    worker_type: str
    status: str
    current_job_id: Optional[str] = None
    cpu_usage: float
    memory_mb: float
    total_jobs_completed: int
    total_jobs_failed: int
    last_heartbeat: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class WorkerListOut(BaseModel):
    total: int
    items: List[WorkerOut]
