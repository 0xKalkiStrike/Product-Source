import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.main import app, init_db
from app.orchestration.engine import orchestration_engine

@pytest.mark.asyncio
async def test_phase3_orchestration_engine():
    await init_db()
    await orchestration_engine.initialize()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Login
        res = await client.post("/api/v1/auth/login", json={
            "email": "admin@platform.com",
            "password": "admin123"
        })
        token = res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Create Project
        res = await client.post("/api/v1/projects", json={
            "name": "Phase 3 Orchestration Test Workspace"
        }, headers=headers)
        project_id = res.json()["id"]

        # 3. Check Workers list
        res = await client.get("/api/v1/workers", headers=headers)
        assert res.status_code == 200
        workers_data = res.json()
        assert workers_data["total"] >= 4  # Initial worker pool spawned

        # 4. Enqueue background verification job
        res = await client.post(f"/api/v1/projects/{project_id}/jobs", json={
            "task_type": "VERIFICATION",
            "priority": 1,
            "payload": {
                "source_name": "Test Cigar Store",
                "adapter_name": "CigarSourceAdapter"
            }
        }, headers=headers)
        assert res.status_code == 201
        job = res.json()
        job_id = job["id"]
        assert job["priority"] == 1

        # 5. Allow worker pool loop to pick up and process job
        await asyncio.sleep(2.5)

        # 6. Check Job Status
        res = await client.get(f"/api/v1/projects/{project_id}/jobs", headers=headers)
        assert res.status_code == 200
        job_list = res.json()
        assert job_list["total"] >= 1

        # 7. Check System Health
        res = await client.get("/api/v1/health", headers=headers)
        assert res.status_code == 200
        health = res.json()
        assert health["orchestration_engine"]["status"] == "OPERATIONAL"

    await orchestration_engine.shutdown()
