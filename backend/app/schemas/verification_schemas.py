from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class VerificationStartRequest(BaseModel):
    product_ids: Optional[List[str]] = None  # None = verify all unverified products in project
    source_ids: Optional[List[str]] = None   # None = verify against all active sources
    priority: Optional[int] = 2              # 2 = HIGH Priority

class VerificationResultOut(BaseModel):
    id: str
    project_id: str
    product_id: str
    source_id: Optional[str] = None
    job_id: Optional[str] = None
    match_priority_level: str
    match_confidence: float
    match_evidence: Optional[Dict[str, Any]] = None
    extracted_price: Optional[float] = None
    msrp: Optional[float] = None
    discount: Optional[float] = 0.0
    currency: str
    pack_size: Optional[str] = None
    availability: str
    condition: str
    evidence_path: Optional[str] = None
    evidence_hash: Optional[str] = None
    status: str
    verified_at: datetime

    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    product_brand: Optional[str] = None
    product_description: Optional[str] = None
    source_name: Optional[str] = None
    excel_price: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)

class VerificationListOut(BaseModel):
    total: int
    items: List[VerificationResultOut]
