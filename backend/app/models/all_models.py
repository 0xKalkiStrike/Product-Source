import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Text, JSON, Integer, Float
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="ADMIN") # ADMIN, MANAGER, ANALYST, WORKER
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    projects = relationship("ProjectUser", back_populates="user", cascade="all, delete-orphan")

class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(String, default="ACTIVE") # ACTIVE, ARCHIVED, PAUSED
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    members = relationship("ProjectUser", back_populates="project", cascade="all, delete-orphan")
    categories = relationship("ProductCategory", back_populates="project", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="project", cascade="all, delete-orphan")
    sources = relationship("Source", back_populates="project", cascade="all, delete-orphan")
    credentials = relationship("SourceCredential", back_populates="project", cascade="all, delete-orphan")
    jobs = relationship("Job", back_populates="project", cascade="all, delete-orphan")
    verification_results = relationship("VerificationResult", back_populates="project", cascade="all, delete-orphan")

class ProjectUser(Base):
    __tablename__ = "project_users"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, default="MEMBER")
    created_at = Column(DateTime(timezone=True), default=utc_now)

    project = relationship("Project", back_populates="members")
    user = relationship("User", back_populates="projects")

class ProductCategory(Base):
    __tablename__ = "product_categories"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    project = relationship("Project", back_populates="categories")
    products = relationship("Product", back_populates="category")

class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(String, ForeignKey("product_categories.id"), nullable=True, index=True)
    sku = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False, index=True)
    brand = Column(String, nullable=True, index=True)
    mpn = Column(String, nullable=True, index=True)
    upc = Column(String, nullable=True, index=True)
    ean = Column(String, nullable=True, index=True)
    pack_size = Column(String, nullable=True)
    variant = Column(String, nullable=True)
    specifications = Column(JSON, nullable=True)
    status = Column(String, default="UNVERIFIED")
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    project = relationship("Project", back_populates="products")
    category = relationship("ProductCategory", back_populates="products")
    verification_results = relationship("VerificationResult", back_populates="product", cascade="all, delete-orphan")
    prices = relationship("ProductPrice", back_populates="product", cascade="all, delete-orphan")

class Source(Base):
    __tablename__ = "sources"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    url = Column(String, nullable=False)
    source_type = Column(String, default="PUBLIC_SURFACE_WEB")
    auth_required = Column(Boolean, default=False)
    credential_id = Column(String, ForeignKey("source_credentials.id", ondelete="SET NULL"), nullable=True)
    adapter_name = Column(String, default="GenericSourceAdapter")
    max_concurrency = Column(Integer, default=5)
    rate_limit_rpm = Column(Integer, default=60)
    monitoring_interval_min = Column(Integer, default=60)
    status = Column(String, default="ACTIVE")
    last_successful_execution = Column(DateTime(timezone=True), nullable=True)
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    project = relationship("Project", back_populates="sources")
    credentials = relationship("SourceCredential", back_populates="source_ref", foreign_keys="[SourceCredential.source_id]")

class SourceCredential(Base):
    __tablename__ = "source_credentials"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id = Column(String, ForeignKey("sources.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String, nullable=False)
    auth_type = Column(String, nullable=False)
    encrypted_data = Column(Text, nullable=False)
    status = Column(String, default="PENDING")
    last_validated_at = Column(DateTime(timezone=True), nullable=True)
    validation_error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    project = relationship("Project", back_populates="credentials")
    source_ref = relationship("Source", back_populates="credentials", foreign_keys=[source_id])

class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    row_count = Column(Integer, default=0)
    valid_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    error_report = Column(JSON, nullable=True)
    status = Column(String, default="PROCESSED")
    created_at = Column(DateTime(timezone=True), default=utc_now)

class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    task_type = Column(String, nullable=False, index=True)
    priority = Column(Integer, default=3, index=True)
    status = Column(String, default="PENDING", index=True)
    payload = Column(JSON, nullable=True)
    progress = Column(Float, default=0.0)
    total_items = Column(Integer, default=0)
    processed_items = Column(Integer, default=0)
    worker_id = Column(String, nullable=True)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    error_message = Column(Text, nullable=True)
    scheduled_at = Column(DateTime(timezone=True), default=utc_now)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    project = relationship("Project", back_populates="jobs")
    checkpoint = relationship("ExecutionCheckpoint", back_populates="job", uselist=False, cascade="all, delete-orphan")

class WorkerModel(Base):
    __tablename__ = "workers"

    id = Column(String, primary_key=True, default=generate_uuid)
    worker_name = Column(String, nullable=False, unique=True)
    worker_type = Column(String, nullable=False)
    status = Column(String, default="IDLE")
    current_job_id = Column(String, nullable=True)
    cpu_usage = Column(Float, default=0.0)
    memory_mb = Column(Float, default=0.0)
    total_jobs_completed = Column(Integer, default=0)
    total_jobs_failed = Column(Integer, default=0)
    last_heartbeat = Column(DateTime(timezone=True), default=utc_now)
    created_at = Column(DateTime(timezone=True), default=utc_now)

class ExecutionCheckpoint(Base):
    __tablename__ = "execution_checkpoints"

    id = Column(String, primary_key=True, default=generate_uuid)
    job_id = Column(String, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, unique=True)
    step_number = Column(Integer, default=0)
    completed_item_ids = Column(JSON, default=list)
    state_data = Column(JSON, nullable=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    job = relationship("Job", back_populates="checkpoint")

# --- Phase 4 Verification Models ---

class VerificationResult(Base):
    __tablename__ = "verification_results"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id = Column(String, ForeignKey("sources.id", ondelete="CASCADE"), nullable=True, index=True)
    job_id = Column(String, ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True)
    match_priority_level = Column(String, nullable=False) # UPC_EAN, MPN, SKU, BRAND_MODEL, BRAND_NAME, FUZZY
    match_confidence = Column(Float, default=1.0)
    match_evidence = Column(JSON, nullable=True)
    extracted_price = Column(Float, nullable=True)
    msrp = Column(Float, nullable=True)
    discount = Column(Float, default=0.0)
    currency = Column(String, default="USD")
    pack_size = Column(String, nullable=True)
    availability = Column(String, default="IN_STOCK") # IN_STOCK, OUT_OF_STOCK, PREORDER
    condition = Column(String, default="NEW")
    evidence_path = Column(String, nullable=True)
    evidence_hash = Column(String, nullable=True)
    status = Column(String, default="VERIFIED") # VERIFIED, NOT_FOUND, MISMATCH, FAILED
    verified_at = Column(DateTime(timezone=True), default=utc_now, index=True)

    project = relationship("Project", back_populates="verification_results")
    product = relationship("Product", back_populates="verification_results")

class ProductPrice(Base):
    __tablename__ = "product_prices"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id = Column(String, ForeignKey("sources.id", ondelete="CASCADE"), nullable=False, index=True)
    price = Column(Float, nullable=False)
    msrp = Column(Float, nullable=True)
    currency = Column(String, default="USD")
    normalized_usd = Column(Float, nullable=False)
    recorded_at = Column(DateTime(timezone=True), default=utc_now, index=True)

    product = relationship("Product", back_populates="prices")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, nullable=True)
    project_id = Column(String, nullable=True)
    action = Column(String, nullable=False)
    status = Column(String, nullable=False)
    details = Column(JSON, nullable=True)
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), default=utc_now, index=True)

class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String, primary_key=True)
    value = Column(JSON, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

class SourceProduct(Base):
    __tablename__ = "source_products"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id = Column(String, ForeignKey("sources.id", ondelete="CASCADE"), nullable=False, index=True)
    source_product_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False, index=True)
    brand = Column(String, nullable=True, index=True)
    category = Column(String, nullable=True, index=True)
    sku = Column(String, nullable=True, index=True)
    mpn = Column(String, nullable=True, index=True)
    upc = Column(String, nullable=True, index=True)
    ean = Column(String, nullable=True, index=True)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=True)
    msrp = Column(Float, nullable=True)
    discount = Column(Float, default=0.0)
    currency = Column(String, default="USD")
    pack_size = Column(String, nullable=True)
    availability = Column(String, default="IN_STOCK")
    product_url = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    specifications = Column(JSON, nullable=True)
    rating = Column(Float, nullable=True)
    review_count = Column(Integer, default=0)
    collected_at = Column(DateTime(timezone=True), default=utc_now, index=True)

class MonitoringRule(Base):
    __tablename__ = "monitoring_rules"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id = Column(String, ForeignKey("sources.id", ondelete="CASCADE"), nullable=False, index=True)
    rule_name = Column(String, nullable=False)
    interval_minutes = Column(Integer, default=60)
    status = Column(String, default="ACTIVE") # ACTIVE, PAUSED
    last_executed_at = Column(DateTime(timezone=True), nullable=True)
    next_execution_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

class ChangeEvent(Base):
    __tablename__ = "change_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id = Column(String, ForeignKey("sources.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String, ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True)
    change_type = Column(String, nullable=False) # PRICE_CHANGE, AVAILABILITY_CHANGE, NEW_PRODUCT
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    detected_at = Column(DateTime(timezone=True), default=utc_now, index=True)

class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    verification_result_id = Column(String, ForeignKey("verification_results.id", ondelete="CASCADE"), nullable=True, index=True)
    product_id = Column(String, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id = Column(String, ForeignKey("sources.id", ondelete="CASCADE"), nullable=False, index=True)
    screenshot_url = Column(String, nullable=False)
    evidence_hash = Column(String, nullable=False)
    captured_at = Column(DateTime(timezone=True), default=utc_now, index=True)
    metadata_info = Column(JSON, nullable=True)

