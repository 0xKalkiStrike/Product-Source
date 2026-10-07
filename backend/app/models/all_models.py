import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Text, JSON, Integer, Float
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, default="ADMIN") # ADMIN, MANAGER, ANALYST, WORKER
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    projects: Mapped[List["ProjectUser"]] = relationship("ProjectUser", back_populates="user", cascade="all, delete-orphan")

class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String, default="ACTIVE") # ACTIVE, ARCHIVED, PAUSED
    owner_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    members: Mapped[List["ProjectUser"]] = relationship("ProjectUser", back_populates="project", cascade="all, delete-orphan")
    categories: Mapped[List["ProductCategory"]] = relationship("ProductCategory", back_populates="project", cascade="all, delete-orphan")
    products: Mapped[List["Product"]] = relationship("Product", back_populates="project", cascade="all, delete-orphan")
    sources: Mapped[List["Source"]] = relationship("Source", back_populates="project", cascade="all, delete-orphan")
    credentials: Mapped[List["SourceCredential"]] = relationship("SourceCredential", back_populates="project", cascade="all, delete-orphan")
    jobs: Mapped[List["Job"]] = relationship("Job", back_populates="project", cascade="all, delete-orphan")
    verification_results: Mapped[List["VerificationResult"]] = relationship("VerificationResult", back_populates="project", cascade="all, delete-orphan")

class ProjectUser(Base):
    __tablename__ = "project_users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String, default="MEMBER")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    project: Mapped["Project"] = relationship("Project", back_populates="members")
    user: Mapped["User"] = relationship("User", back_populates="projects")

class ProductCategory(Base):
    __tablename__ = "product_categories"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    project_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(String, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    project: Mapped[Optional["Project"]] = relationship("Project", back_populates="categories")
    products: Mapped[List["Product"]] = relationship("Product", back_populates="category")

class Product(Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("product_categories.id"), nullable=True, index=True)
    sku: Mapped[str] = mapped_column(String, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    brand: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    mpn: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    upc: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    ean: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    pack_size: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    variant: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    specifications: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String, default="UNVERIFIED")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    project: Mapped["Project"] = relationship("Project", back_populates="products")
    category: Mapped[Optional["ProductCategory"]] = relationship("ProductCategory", back_populates="products")
    verification_results: Mapped[List["VerificationResult"]] = relationship("VerificationResult", back_populates="product", cascade="all, delete-orphan")
    prices: Mapped[List["ProductPrice"]] = relationship("ProductPrice", back_populates="product", cascade="all, delete-orphan")

class Source(Base):
    __tablename__ = "sources"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    url: Mapped[str] = mapped_column(String, nullable=False)
    source_type: Mapped[str] = mapped_column(String, default="PUBLIC_SURFACE_WEB")
    auth_required: Mapped[bool] = mapped_column(Boolean, default=False)
    credential_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("source_credentials.id", ondelete="SET NULL"), nullable=True)
    adapter_name: Mapped[str] = mapped_column(String, default="GenericSourceAdapter")
    max_concurrency: Mapped[int] = mapped_column(Integer, default=5)
    rate_limit_rpm: Mapped[int] = mapped_column(Integer, default=60)
    monitoring_interval_min: Mapped[int] = mapped_column(Integer, default=60)
    status: Mapped[str] = mapped_column(String, default="ACTIVE")
    last_successful_execution: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    project: Mapped["Project"] = relationship("Project", back_populates="sources")
    credentials: Mapped[List["SourceCredential"]] = relationship("SourceCredential", back_populates="source_ref", foreign_keys="[SourceCredential.source_id]")

class SourceCredential(Base):
    __tablename__ = "source_credentials"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("sources.id", ondelete="CASCADE"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    auth_type: Mapped[str] = mapped_column(String, nullable=False)
    encrypted_data: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String, default="PENDING")
    last_validated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    validation_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    project: Mapped["Project"] = relationship("Project", back_populates="credentials")
    source_ref: Mapped[Optional["Source"]] = relationship("Source", back_populates="credentials", foreign_keys=[source_id])

class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    filename: Mapped[str] = mapped_column(String, nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    row_count: Mapped[int] = mapped_column(Integer, default=0)
    valid_count: Mapped[int] = mapped_column(Integer, default=0)
    error_count: Mapped[int] = mapped_column(Integer, default=0)
    error_report: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    raw_data: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String, default="PROCESSED")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    task_type: Mapped[str] = mapped_column(String, nullable=False, index=True)
    priority: Mapped[int] = mapped_column(Integer, default=3, index=True)
    status: Mapped[str] = mapped_column(String, default="PENDING", index=True)
    payload: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    progress: Mapped[float] = mapped_column(Float, default=0.0)
    total_items: Mapped[int] = mapped_column(Integer, default=0)
    processed_items: Mapped[int] = mapped_column(Integer, default=0)
    worker_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    max_retries: Mapped[int] = mapped_column(Integer, default=3)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    project: Mapped["Project"] = relationship("Project", back_populates="jobs")
    checkpoint: Mapped[Optional["ExecutionCheckpoint"]] = relationship("ExecutionCheckpoint", back_populates="job", uselist=False, cascade="all, delete-orphan")

class WorkerModel(Base):
    __tablename__ = "workers"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    worker_name: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    worker_type: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="IDLE")
    current_job_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    cpu_usage: Mapped[float] = mapped_column(Float, default=0.0)
    memory_mb: Mapped[float] = mapped_column(Float, default=0.0)
    total_jobs_completed: Mapped[int] = mapped_column(Integer, default=0)
    total_jobs_failed: Mapped[int] = mapped_column(Integer, default=0)
    last_heartbeat: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

class ExecutionCheckpoint(Base):
    __tablename__ = "execution_checkpoints"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    job_id: Mapped[str] = mapped_column(String, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, unique=True)
    step_number: Mapped[int] = mapped_column(Integer, default=0)
    completed_item_ids: Mapped[Optional[Any]] = mapped_column(JSON, default=list)
    state_data: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    job: Mapped["Job"] = relationship("Job", back_populates="checkpoint")

# --- Phase 4 Verification Models ---

class VerificationResult(Base):
    __tablename__ = "verification_results"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[str] = mapped_column(String, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("sources.id", ondelete="CASCADE"), nullable=True, index=True)
    job_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True)
    match_priority_level: Mapped[str] = mapped_column(String, nullable=False) # UPC_EAN, MPN, SKU, BRAND_MODEL, BRAND_NAME, FUZZY
    match_confidence: Mapped[float] = mapped_column(Float, default=1.0)
    match_evidence: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    extracted_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    msrp: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    discount: Mapped[float] = mapped_column(Float, default=0.0)
    currency: Mapped[str] = mapped_column(String, default="USD")
    pack_size: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    availability: Mapped[str] = mapped_column(String, default="IN_STOCK") # IN_STOCK, OUT_OF_STOCK, PREORDER
    condition: Mapped[str] = mapped_column(String, default="NEW")
    evidence_path: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    evidence_hash: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="VERIFIED") # VERIFIED, NOT_FOUND, MISMATCH, FAILED
    verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)

    project: Mapped["Project"] = relationship("Project", back_populates="verification_results")
    product: Mapped["Product"] = relationship("Product", back_populates="verification_results")
    source: Mapped[Optional["Source"]] = relationship("Source", foreign_keys=[source_id])

class ProductPrice(Base):
    __tablename__ = "product_prices"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[str] = mapped_column(String, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id: Mapped[str] = mapped_column(String, ForeignKey("sources.id", ondelete="CASCADE"), nullable=False, index=True)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    msrp: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String, default="USD")
    normalized_usd: Mapped[float] = mapped_column(Float, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)

    product: Mapped["Product"] = relationship("Product", back_populates="prices")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    user_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    project_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    action: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    details: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)

class SystemSetting(Base):
    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(String, primary_key=True)
    value: Mapped[Any] = mapped_column(JSON, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

class SourceProduct(Base):
    __tablename__ = "source_products"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id: Mapped[str] = mapped_column(String, ForeignKey("sources.id", ondelete="CASCADE"), nullable=False, index=True)
    source_product_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    brand: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    category: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    sku: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    mpn: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    upc: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    ean: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    msrp: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    discount: Mapped[float] = mapped_column(Float, default=0.0)
    currency: Mapped[str] = mapped_column(String, default="USD")
    pack_size: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    availability: Mapped[str] = mapped_column(String, default="IN_STOCK")
    product_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    specifications: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    review_count: Mapped[int] = mapped_column(Integer, default=0)
    collected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)

class MonitoringRule(Base):
    __tablename__ = "monitoring_rules"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id: Mapped[str] = mapped_column(String, ForeignKey("sources.id", ondelete="CASCADE"), nullable=False, index=True)
    rule_name: Mapped[str] = mapped_column(String, nullable=False)
    interval_minutes: Mapped[int] = mapped_column(Integer, default=60)
    status: Mapped[str] = mapped_column(String, default="ACTIVE") # ACTIVE, PAUSED
    last_executed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    next_execution_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

class ChangeEvent(Base):
    __tablename__ = "change_events"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id: Mapped[str] = mapped_column(String, ForeignKey("sources.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True)
    change_type: Mapped[str] = mapped_column(String, nullable=False) # PRICE_CHANGE, AVAILABILITY_CHANGE, NEW_PRODUCT
    old_value: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    new_value: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)

class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    verification_result_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("verification_results.id", ondelete="CASCADE"), nullable=True, index=True)
    product_id: Mapped[str] = mapped_column(String, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id: Mapped[str] = mapped_column(String, ForeignKey("sources.id", ondelete="CASCADE"), nullable=False, index=True)
    screenshot_url: Mapped[str] = mapped_column(String, nullable=False)
    evidence_hash: Mapped[str] = mapped_column(String, nullable=False)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)
    metadata_info: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
