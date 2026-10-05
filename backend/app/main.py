import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.core.config import settings
from app.core.database import engine, Base, AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.all_models import User
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
        else:
            deep_user.hashed_password = get_password_hash("Deep@231104")
            deep_user.is_active = True

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API router under both /api/v1 AND /api for 100% path compatibility
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(api_router, prefix="/api")

@app.get("/")
async def root():
    return {
        "title": settings.PROJECT_NAME,
        "status": "online",
        "orchestration_engine": "operational",
        "docs_url": "/docs",
        "api_v1": settings.API_V1_STR
    }
