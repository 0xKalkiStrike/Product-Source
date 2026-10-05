import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.main import app, init_db

@pytest.mark.asyncio
async def test_phase4_verification_engine():
    await init_db()

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
            "name": "Phase 4 Verification Test Scope"
        }, headers=headers)
        project_id = res.json()["id"]

        # 3. Create Product
        res = await client.post(f"/api/v1/projects/{project_id}/products", json={
            "sku": "MONTE-002",
            "name": "Montecristo No. 2 Torpedo",
            "brand": "Montecristo",
            "upc": "012345678905",
            "mpn": "MPN-MONTE-2"
        }, headers=headers)
        assert res.status_code == 201

        # 4. Create Source
        res = await client.post(f"/api/v1/projects/{project_id}/sources", json={
            "name": "Famous Smoke Shop",
            "url": "https://www.famous-smoke.com",
            "adapter_name": "CigarSourceAdapter"
        }, headers=headers)
        assert res.status_code == 201

        # 5. Trigger Verification Engine batch run
        res = await client.post(f"/api/v1/projects/{project_id}/verification/start", json={
            "priority": 1
        }, headers=headers)
        assert res.status_code == 200
        run_res = res.json()
        assert run_res["verified_count"] >= 1

        # 6. Fetch Verification Results
        res = await client.get(f"/api/v1/projects/{project_id}/verification/results", headers=headers)
        assert res.status_code == 200
        results = res.json()
        assert results["total"] >= 1
        top_result = results["items"][0]
        assert top_result["status"] == "VERIFIED"
        assert top_result["match_priority_level"] in ["UPC_EAN", "MPN", "SKU", "BRAND_MODEL", "FUZZY"]
        assert top_result["extracted_price"] is not None
        assert top_result["evidence_hash"] is not None
