-- =======================================================================
-- PRODUCT VERIFICATION & MARKET INTELLIGENCE PLATFORM
-- Supabase PostgreSQL Production Database Schema Migration DDL
-- =======================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'ADMIN',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    owner_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Project Users Table
CREATE TABLE IF NOT EXISTS project_users (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'MEMBER',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Product Categories Table
CREATE TABLE IF NOT EXISTS product_categories (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Products Table
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,
    category_id VARCHAR(36) REFERENCES product_categories(id) ON DELETE SET NULL,
    sku VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    mpn VARCHAR(255),
    upc VARCHAR(255),
    ean VARCHAR(255),
    pack_size VARCHAR(100),
    variant VARCHAR(100),
    specifications JSONB,
    status VARCHAR(50) DEFAULT 'UNVERIFIED',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Sources Table
CREATE TABLE IF NOT EXISTS sources (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    source_type VARCHAR(50) DEFAULT 'PUBLIC_SURFACE_WEB',
    auth_required BOOLEAN DEFAULT FALSE,
    credential_id VARCHAR(36),
    adapter_name VARCHAR(100) DEFAULT 'GenericSourceAdapter',
    max_concurrency INT DEFAULT 5,
    rate_limit_rpm INT DEFAULT 60,
    monitoring_interval_min INT DEFAULT 60,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    last_successful_execution TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Source Credentials Table
CREATE TABLE IF NOT EXISTS source_credentials (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,
    source_id VARCHAR(36) REFERENCES sources(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    auth_type VARCHAR(50) NOT NULL,
    encrypted_data TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    last_validated_at TIMESTAMPTZ,
    validation_error TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Uploaded Files Table
CREATE TABLE IF NOT EXISTS uploaded_files (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_size INT NOT NULL,
    row_count INT DEFAULT 0,
    valid_count INT DEFAULT 0,
    error_count INT DEFAULT 0,
    error_report JSONB,
    status VARCHAR(50) DEFAULT 'PROCESSED',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. Jobs Table
CREATE TABLE IF NOT EXISTS jobs (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,
    task_type VARCHAR(100) NOT NULL,
    priority INT DEFAULT 3,
    status VARCHAR(50) DEFAULT 'PENDING',
    payload JSONB,
    progress FLOAT DEFAULT 0.0,
    total_items INT DEFAULT 0,
    processed_items INT DEFAULT 0,
    worker_id VARCHAR(255),
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    error_message TEXT,
    scheduled_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. Workers Table
CREATE TABLE IF NOT EXISTS workers (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    worker_name VARCHAR(255) UNIQUE NOT NULL,
    worker_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'IDLE',
    current_job_id VARCHAR(36),
    cpu_usage FLOAT DEFAULT 0.0,
    memory_mb FLOAT DEFAULT 0.0,
    total_jobs_completed INT DEFAULT 0,
    total_jobs_failed INT DEFAULT 0,
    last_heartbeat TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 11. Execution Checkpoints Table
CREATE TABLE IF NOT EXISTS execution_checkpoints (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    job_id VARCHAR(36) UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
    step_number INT DEFAULT 0,
    completed_item_ids JSONB DEFAULT '[]'::jsonb,
    state_data JSONB,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 12. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(36),
    project_id VARCHAR(36),
    action VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    details JSONB,
    ip_address VARCHAR(100),
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for maximum PostgreSQL query performance
CREATE INDEX IF NOT EXISTS idx_products_project_sku ON products(project_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_sources_project ON sources(project_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status_priority ON jobs(status, priority);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
