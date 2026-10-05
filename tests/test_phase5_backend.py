import pytest
import sys
import os
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.main import app, init_db
from app.core.database import AsyncSessionLocal
from app.models.all_models import User, Project, Source, Product
from app.core.security import get_password_hash, create_access_token

@pytest.mark.asyncio
async def test_all_new_features_backend():
    await init_db()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Login with seeded admin user
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "deep@brainbean.in",
            "password": "Deep@231104"
        })
        assert login_res.status_code == 200, login_res.text
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create project
        proj_res = await ac.post("/api/v1/projects", json={
            "name": "MarketLens Project Alpha",
            "description": "Verification & Market Intelligence Test"
        }, headers=headers)
        assert proj_res.status_code == 201, proj_res.text
        project_id = proj_res.json()["id"]

        # Create source
        src_res = await ac.post(f"/api/v1/projects/{project_id}/sources", json={
            "name": "Source A (Primary Market)",
            "url": "https://source-a.example.com",
            "adapter_name": "GenericSourceAdapter"
        }, headers=headers)
        assert src_res.status_code == 201, src_res.text
        source_id = src_res.json()["id"]

        # Create product
        prod_res = await ac.post(f"/api/v1/projects/{project_id}/products", json={
            "sku": "SKU001",
            "name": "Premium Product A",
            "brand": "Brand X",
            "upc": "123456",
            "specifications": {"price": 24.99}
        }, headers=headers)
        assert prod_res.status_code == 201, prod_res.text
        product_id = prod_res.json()["id"]

        # 1. Source Data Collect & List
        resp = await ac.post(f"/api/v1/projects/{project_id}/source-data/collect", headers=headers)
        assert resp.status_code == 200, resp.text
        assert resp.json()["items_collected"] > 0

        resp = await ac.get(f"/api/v1/projects/{project_id}/source-data", headers=headers)
        assert resp.status_code == 200, resp.text
        assert resp.json()["total"] > 0

        # 2. Start Verification Engine
        resp = await ac.post(
            f"/api/v1/projects/{project_id}/verification/start",
            json={"product_ids": [product_id], "source_ids": [source_id]},
            headers=headers
        )
        assert resp.status_code == 200, resp.text

        # 3. List Verified Results
        resp = await ac.get(f"/api/v1/projects/{project_id}/verification/results", headers=headers)
        assert resp.status_code == 200, resp.text
        assert resp.json()["total"] > 0

        # 4. Market Intelligence Summary & Products
        resp = await ac.get(f"/api/v1/projects/{project_id}/market-intelligence/summary", headers=headers)
        assert resp.status_code == 200, resp.text
        assert "verified_products" in resp.json()

        resp = await ac.get(f"/api/v1/projects/{project_id}/market-intelligence/products", headers=headers)
        assert resp.status_code == 200, resp.text
        assert len(resp.json()["items"]) > 0

        # 5. Monitoring Rules & Execute
        resp = await ac.post(
            f"/api/v1/projects/{project_id}/monitoring/rules",
            params={"source_id": source_id, "rule_name": "Hourly Price Check", "interval_minutes": 60},
            headers=headers
        )
        assert resp.status_code == 200, resp.text

        resp = await ac.post(f"/api/v1/projects/{project_id}/monitoring/execute", headers=headers)
        assert resp.status_code == 200, resp.text

        resp = await ac.get(f"/api/v1/projects/{project_id}/monitoring/events", headers=headers)
        assert resp.status_code == 200, resp.text

        # 6. Audit Logs
        resp = await ac.get("/api/v1/audit-logs", headers=headers)
        assert resp.status_code == 200, resp.text
        assert resp.json()["total"] > 0

        # 7. Evidence Records
        resp = await ac.get(f"/api/v1/projects/{project_id}/evidence", headers=headers)
        assert resp.status_code == 200, resp.text
        assert resp.json()["total"] > 0

        # 8. Reports Export
        resp = await ac.get(f"/api/v1/projects/{project_id}/reports/export?format=json", headers=headers)
        assert resp.status_code == 200, resp.text

        resp = await ac.get(f"/api/v1/projects/{project_id}/reports/export?format=csv", headers=headers)
        assert resp.status_code == 200, resp.text

        # 9. System Settings
        resp = await ac.get("/api/v1/settings", headers=headers)
        assert resp.status_code == 200, resp.text
        assert "global_concurrency_limit" in resp.json()

