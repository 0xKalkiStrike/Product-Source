from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

class ProjectOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    status: str
    owner_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ProjectListOut(BaseModel):
    total: int
    items: List[ProjectOut]
