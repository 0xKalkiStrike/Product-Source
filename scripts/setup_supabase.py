import os
import sys
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
from app.core.config import settings
from app.models.all_models import Base

async def setup_supabase(db_url: str = None):
    url = db_url or settings.DATABASE_URL
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    print(f"[*] Connecting to Supabase PostgreSQL Database at: {url.split('@')[-1] if '@' in url else url}")

    engine = create_async_engine(url, echo=True)
    try:
        async with engine.begin() as conn:
            print("[*] Creating database tables...")
            await conn.run_sync(Base.metadata.create_all)
            await conn.execute(text("SELECT 1"))
        print("[SUCCESS] Connected to Supabase PostgreSQL and created all production schema tables!")
    except Exception as e:
        print(f"[ERROR] Failed to connect to Supabase: {str(e)}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    url_arg = sys.argv[1] if len(sys.argv) > 1 else None
    asyncio.run(setup_supabase(url_arg))
