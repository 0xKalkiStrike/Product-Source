import asyncio
import sys
import os
import io
import pandas as pd
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.main import app, init_db
import pytest

@pytest.mark.asyncio
async def test_excel_upload_live():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Login
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "deep@brainbean.in",
            "password": "Deep@231104"
        })
        print("Login status:", login_res.status_code)
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Create Project
        proj_res = await ac.post("/api/v1/projects", json={
            "name": "Live Excel Upload Test Project"
        }, headers=headers)
        print("Project creation status:", proj_res.status_code)
        project_id = proj_res.json()["id"]

        # 3. Create a real binary .xlsx file in memory using pandas / openpyxl
        df_data = {
            "Product Name": ["Premium Cuban Cigar Cohiba", "Vape Pod starter Kit", "Special Edition Lighter"],
            "SKU": ["SKU-COH-001", "SKU-VAP-002", "SKU-ZIP-003"],
            "Brand": ["Cohiba", "Vaporesso", "Zippo"],
            "Category": ["Cigars", "Vape", "Accessories"],
            "UPC": [123456789012, 234567890123, 345678901234],
            "MPN": ["MPN-52", "MPN-V1", "MPN-Z9"],
            "Price": [24.99, 39.99, 15.00],
            "Pack Size": ["Box of 10", "Single Pack", "Single"]
        }
        df = pd.DataFrame(df_data)

        excel_buffer = io.BytesIO()
        with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Sheet1')
        excel_bytes = excel_buffer.getvalue()

        print(f"Generated test .xlsx file size: {len(excel_bytes)} bytes")

        # 4. Upload .xlsx file
        files = {
            "file": ("test_catalog.xlsx", excel_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        }
        upload_res = await ac.post(
            f"/api/v1/projects/{project_id}/products/upload",
            files=files,
            headers=headers
        )

        print("Upload Response Status:", upload_res.status_code)
        print("Upload Response Payload:", upload_res.text)

if __name__ == "__main__":
    asyncio.run(test_excel_upload_live())
