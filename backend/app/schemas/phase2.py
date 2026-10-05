from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

# Category Schemas
class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None

class CategoryOut(BaseModel):
    id: str
    project_id: Optional[str] = None
    name: str
    slug: str
    description: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Product Schemas
class ProductCreate(BaseModel):
    sku: str
    name: str
    category_id: Optional[str] = None
    brand: Optional[str] = None
    mpn: Optional[str] = None
    upc: Optional[str] = None
    ean: Optional[str] = None
    pack_size: Optional[str] = None
    variant: Optional[str] = None
    specifications: Optional[Dict[str, Any]] = None

class ProductOut(BaseModel):
    id: str
    project_id: str
    category_id: Optional[str] = None
    sku: str
    name: str
    brand: Optional[str] = None
    mpn: Optional[str] = None
    upc: Optional[str] = None
    ean: Optional[str] = None
    pack_size: Optional[str] = None
    variant: Optional[str] = None
    specifications: Optional[Dict[str, Any]] = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ProductListOut(BaseModel):
    total: int
    items: List[ProductOut]

# Source Schemas
class SourceCreate(BaseModel):
    name: str
    url: str
    source_type: Optional[str] = "PUBLIC_SURFACE_WEB"
    auth_required: Optional[bool] = False
    credential_id: Optional[str] = None
    adapter_name: Optional[str] = "GenericSourceAdapter"
    max_concurrency: Optional[int] = 5
    rate_limit_rpm: Optional[int] = 60
    monitoring_interval_min: Optional[int] = 60

class SourceUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    source_type: Optional[str] = None
    auth_required: Optional[bool] = None
    credential_id: Optional[str] = None
    adapter_name: Optional[str] = None
    max_concurrency: Optional[int] = None
    rate_limit_rpm: Optional[int] = None
    monitoring_interval_min: Optional[int] = None
    status: Optional[str] = None

class SourceOut(BaseModel):
    id: str
    project_id: str
    name: str
    url: str
    source_type: str
    auth_required: bool
    credential_id: Optional[str] = None
    adapter_name: str
    max_concurrency: int
    rate_limit_rpm: int
    monitoring_interval_min: int
    status: str
    last_successful_execution: Optional[datetime] = None
    last_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SourceListOut(BaseModel):
    total: int
    items: List[SourceOut]

# Credential Schemas
class CredentialCreate(BaseModel):
    source_id: Optional[str] = None
    name: str
    auth_type: str  # BASIC, BEARER_TOKEN, API_KEY, SESSION_COOKIE, CUSTOM_HEADER
    credential_data: Dict[str, Any]  # Raw dict to encrypt

class CredentialOut(BaseModel):
    id: str
    project_id: str
    source_id: Optional[str] = None
    name: str
    auth_type: str
    masked_data: Dict[str, Any]  # Never return raw secrets!
    status: str
    last_validated_at: Optional[datetime] = None
    validation_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
