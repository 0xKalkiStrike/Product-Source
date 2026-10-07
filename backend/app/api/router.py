from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.projects import router as projects_router
from app.api.health import router as health_router
from app.api.dashboard import router as dashboard_router
from app.api.categories import router as categories_router
from app.api.products import router as products_router
from app.api.sources import router as sources_router
from app.api.credentials import router as credentials_router
from app.api.jobs import router as jobs_router
from app.api.workers import router as workers_router
from app.api.verification import router as verification_router
from app.api.source_data import router as source_data_router
from app.api.market_intelligence import router as market_intelligence_router
from app.api.monitoring import router as monitoring_router
from app.api.audit_logs import router as audit_logs_router
from app.api.evidence import router as evidence_router
from app.api.reports import router as reports_router
from app.api.settings import router as settings_router
from app.api.uploaded_files import router as uploaded_files_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(projects_router)
api_router.include_router(health_router)
api_router.include_router(dashboard_router)
api_router.include_router(categories_router)
api_router.include_router(products_router)
api_router.include_router(uploaded_files_router)
api_router.include_router(sources_router)
api_router.include_router(credentials_router)
api_router.include_router(jobs_router)
api_router.include_router(workers_router)
api_router.include_router(verification_router)
api_router.include_router(source_data_router)
api_router.include_router(market_intelligence_router)
api_router.include_router(monitoring_router)
api_router.include_router(audit_logs_router)
api_router.include_router(evidence_router)
api_router.include_router(reports_router)
api_router.include_router(settings_router)

