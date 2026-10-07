import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.core.config import settings
from app.core.database import engine, Base, AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.all_models import User, Project
from app.api.router import api_router
from app.orchestration.engine import orchestration_engine

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # Check if default admin exists
        res = await session.execute(select(User).where(User.email == "admin@platform.com"))
        admin = res.scalars().first()
        if not admin:
            default_admin = User(
                email="admin@platform.com",
                hashed_password=get_password_hash("admin123"),
                full_name="System Administrator",
                role="ADMIN",
                is_active=True
            )
            session.add(default_admin)

        # Seed requested user account deep@brainbean.in
        user_res = await session.execute(select(User).where(User.email == "deep@brainbean.in"))
        deep_user = user_res.scalars().first()
        if not deep_user:
            user_account = User(
                email="deep@brainbean.in",
                hashed_password=get_password_hash("Deep@231104"),
                full_name="Deep (System Admin)",
                role="ADMIN",
                is_active=True
            )
            session.add(user_account)
        await session.commit()

        # Seed default project d48568e0-b2a3-4f90-a252-55b3db6461d2 if missing
        proj_res = await session.execute(select(Project).where(Project.id == "d48568e0-b2a3-4f90-a252-55b3db6461d2"))
        default_proj = proj_res.scalars().first()
        if not default_proj:
            owner = admin or deep_user
            if owner:
                default_proj = Project(
                    id="d48568e0-b2a3-4f90-a252-55b3db6461d2",
                    name="Default Product Verification Project",
                    description="Primary workspace for catalog verification and market intelligence.",
                    status="ACTIVE",
                    owner_id=owner.id
                )
                session.add(default_proj)
                await session.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    await orchestration_engine.initialize()
    yield
    # Shutdown
    await orchestration_engine.shutdown()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

from fastapi import Response, Request

@app.middleware("http")
async def custom_cors_middleware(request: Request, call_next):
    origin = request.headers.get("origin", "*")
    if request.method == "OPTIONS":
        response = Response(status_code=200)
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, Accept, Origin, User-Agent, Cache-Control, X-Requested-With"
        response.headers["Access-Control-Max-Age"] = "86400"
        return response

    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, Accept, Origin, User-Agent, Cache-Control, X-Requested-With"
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API router under /api/v1, /api, AND root for 100% path compatibility
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(api_router, prefix="/api")
app.include_router(api_router)

@app.get("/health")
async def health_check():
    return {
        "title": settings.PROJECT_NAME,
        "status": "online",
        "orchestration_engine": "operational",
        "api_v1": settings.API_V1_STR
    }

# Mount static frontend bundle if available (for production Docker deployments)
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from fastapi import HTTPException

static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static"))
if os.path.exists(static_dir):
    assets_dir = os.path.join(static_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("openapi.json") or full_path == "health":
            raise HTTPException(status_code=404, detail=f"Endpoint '{full_path}' not found")
        target = os.path.join(static_dir, full_path)
        if os.path.isfile(target):
            return FileResponse(target)
        return FileResponse(os.path.join(static_dir, "index.html"))
else:
    @app.get("/")
    async def root():
        return {
            "title": settings.PROJECT_NAME,
            "status": "online",
            "orchestration_engine": "operational",
            "docs_url": "/docs",
            "api_v1": settings.API_V1_STR
        }

