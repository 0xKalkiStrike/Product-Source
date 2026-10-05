import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
import sys
import os

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.main import app, init_db
from app.core.database import engine, Base

@pytest.mark.asyncio
async def test_backend_foundation():
    await init_db()
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Health check
        res = await client.get("/api/v1/health")
        assert res.status_code == 200
        health_data = res.json()
        assert health_data["database"] == "healthy"

        # 2. Login with seeded admin
        res = await client.post("/api/v1/auth/login", json={
            "email": "deep@brainbean.in",
            "password": "Deep@231104"
        })
        assert res.status_code == 200
        token_data = res.json()
        token = token_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 3. Read current user
        res = await client.get("/api/v1/auth/me", headers=headers)
        assert res.status_code == 200
        assert res.json()["email"] == "deep@brainbean.in"

        # 4. Create Project
        res = await client.post("/api/v1/projects", json={
            "name": "Test Cigar & Vape Intelligence",
            "description": "Verification project for cigars and vape products"
        }, headers=headers)
        assert res.status_code == 201
        project = res.json()
        assert project["name"] == "Test Cigar & Vape Intelligence"
        project_id = project["id"]

        # 5. List Projects
        res = await client.get("/api/v1/projects", headers=headers)
        assert res.status_code == 200
        proj_list = res.json()
        assert proj_list["total"] >= 1

        # 6. Get Dashboard Stats
        res = await client.get("/api/v1/dashboard/stats", headers=headers)
        assert res.status_code == 200
        stats = res.json()
        assert stats["summary"]["total_projects"] >= 1
