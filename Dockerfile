# =======================================================================
# Production Multi-Stage Dockerfile for Product Intelligence Platform
# =======================================================================

# -----------------------------------------------------------------------
# Stage 1: Build React Frontend
# -----------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# -----------------------------------------------------------------------
# Stage 2: Production Python API & Worker Environment
# -----------------------------------------------------------------------
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app/backend:/app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install backend dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy adapters and backend code
COPY adapters ./adapters
COPY backend ./backend

# Copy built frontend assets into backend/static for full single-port deployment
COPY --from=frontend-builder /app/frontend/dist ./backend/static

EXPOSE 8000

ENV PORT=8000

CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
