import pytest
import asyncio
import io
import pandas as pd
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
async def test_phase2_products_and_sources():
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
            "name": "Phase 2 Cigars & Vape Workspace"
        }, headers=headers)
        assert res.status_code == 201
        project_id = res.json()["id"]

        # 3. List & auto-seed categories
        res = await client.get(f"/api/v1/projects/{project_id}/categories", headers=headers)
        assert res.status_code == 200
        categories = res.json()
        assert len(categories) >= 8  # Pre-seeded default categories

        # 4. Upload Excel/CSV products with row validation
        csv_data = (
            "SKU,Product Name,Brand,Category,MPN,UPC,Pack Size\n"
            "CIG-001,Montecristo No. 2,Montecristo,Cigars,MPN-M2,012345678905,Box of 20\n"
            "VAPE-002,GeekVape Aegis Legend 2,GeekVape,Vape Devices/Accessories,MPN-L2,098765432109,Single Kit\n"
            "ERR-003,,MissingNameBrand,,MPN-E3,INVALID_UPC,Pack\n"
        )
        files = {"file": ("test_catalog.csv", csv_data.encode("utf-8"), "text/csv")}
        res = await client.post(f"/api/v1/projects/{project_id}/products/upload", files=files, headers=headers)
        assert res.status_code == 200
        upload_report = res.json()
        assert upload_report["inserted_count"] == 2
        assert upload_report["error_count"] == 1
        assert upload_report["error_report"][0]["row"] == 4

        # 5. List Products
        res = await client.get(f"/api/v1/projects/{project_id}/products", headers=headers)
        assert res.status_code == 200
        products_list = res.json()
        assert products_list["total"] == 2

        # 6. Create Source Website
        res = await client.post(f"/api/v1/projects/{project_id}/sources", json={
            "name": "Famous Cigar Store",
            "url": "https://www.famous-smoke.com",
            "source_type": "PUBLIC_SURFACE_WEB",
            "auth_required": True,
            "adapter_name": "CigarSourceAdapter",
            "max_concurrency": 5,
            "rate_limit_rpm": 60
        }, headers=headers)
        assert res.status_code == 201
        source = res.json()
        source_id = source["id"]

        # 7. Create & Encrypt Source Credential
        res = await client.post(f"/api/v1/projects/{project_id}/credentials", json={
            "source_id": source_id,
            "name": "Famous Smoke Partner API Key",
            "auth_type": "API_KEY",
            "credential_data": {
                "api_key": "SECRET_PARTNER_KEY_9988776655",
                "secret_token": "SUPER_SECRET_TOKEN_XYZ"
            }
        }, headers=headers)
        assert res.status_code == 201
        cred = res.json()
        cred_id = cred["id"]
        # Verify secret masking (never return raw secrets in API responses!)
        assert "masked_data" in cred
        assert cred["masked_data"]["api_key"] != "SECRET_PARTNER_KEY_9988776655"
        assert "*" in cred["masked_data"]["api_key"]

        # 8. Validate Credential
        res = await client.post(f"/api/v1/projects/{project_id}/credentials/{cred_id}/validate", headers=headers)
        assert res.status_code == 200
        validated = res.json()
        assert validated["status"] == "VALID"
