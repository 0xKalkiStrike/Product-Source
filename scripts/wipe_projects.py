import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.core.database import AsyncSessionLocal
from sqlalchemy import delete
from app.models.all_models import (
    Project, ProjectUser, Product, ProductCategory, Source, SourceCredential,
    UploadedFile, Job, ExecutionCheckpoint, VerificationResult, ProductPrice,
    SourceProduct, MonitoringRule, ChangeEvent, Evidence
)

async def delete_all_projects():
    async with AsyncSessionLocal() as session:
        print("Wiping all projects and associated data...")
        await session.execute(delete(Evidence))
        await session.execute(delete(ChangeEvent))
        await session.execute(delete(MonitoringRule))
        await session.execute(delete(SourceProduct))
        await session.execute(delete(ProductPrice))
        await session.execute(delete(VerificationResult))
        await session.execute(delete(ExecutionCheckpoint))
        await session.execute(delete(Job))
        await session.execute(delete(UploadedFile))
        await session.execute(delete(SourceCredential))
        await session.execute(delete(Source))
        await session.execute(delete(Product))
        await session.execute(delete(ProductCategory))
        await session.execute(delete(ProjectUser))
        await session.execute(delete(Project))
        await session.commit()
        print("All projects deleted successfully. Clean slate database ready!")

if __name__ == "__main__":
    asyncio.run(delete_all_projects())
