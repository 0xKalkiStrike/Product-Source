import io
import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.all_models import Product, VerificationResult, Source, User, AuditLog
from app.api.deps import get_current_user

router = APIRouter(prefix="/projects/{project_id}/reports", tags=["Reports"])

@router.get("/export")
async def export_verified_report(
    project_id: str,
    format: str = Query("excel", pattern="^(excel|csv|json|pdf)$"),
    source_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(VerificationResult, Product, Source.name.label("source_name"), Source.url.label("source_url"))
        .join(Product, VerificationResult.product_id == Product.id)
        .outerjoin(Source, VerificationResult.source_id == Source.id)
        .where(VerificationResult.project_id == project_id)
    )

    if source_id and source_id != "ALL":
        query = query.where(VerificationResult.source_id == source_id)

    if status_filter:
        query = query.where(VerificationResult.status == status_filter)

    res = await db.execute(query)
    rows = res.all()

    report_data = []
    for ver, prod, s_name, s_url in rows:
        excel_price = 24.99
        if prod.specifications and isinstance(prod.specifications, dict) and "price" in prod.specifications:
            excel_price = float(prod.specifications["price"])

        report_data.append({
            "Product ID": prod.id,
            "Product Name": prod.name,
            "Brand": prod.brand or "N/A",
            "Category": prod.category_id or "N/A",
            "SKU": prod.sku,
            "UPC": prod.upc or "N/A",
            "Excel Price ($)": excel_price,
            "Source": s_name or "Public Source",
            "Source Product Name": prod.name,
            "Source Price ($)": ver.extracted_price or 0.0,
            "Market Price ($)": ver.extracted_price or excel_price,
            "Availability": ver.availability,
            "Verification Status": ver.status,
            "Source URL": s_url or "https://example.com",
            "Verified At": ver.verified_at.isoformat() if ver.verified_at else "",
            "Evidence ID": ver.evidence_hash[:12] if ver.evidence_hash else ver.id[:12]
        })

    # Record Audit
    audit = AuditLog(
        user_id=current_user.id,
        project_id=project_id,
        action="REPORT_EXPORT",
        status="SUCCESS",
        details={"format": format, "record_count": len(report_data)}
    )
    db.add(audit)
    await db.commit()

    if format == "json":
        json_str = json.dumps(report_data, indent=2)
        return Response(
            content=json_str,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=marketlens_report_{project_id[:8]}.json"}
        )

    if format == "csv":
        import pandas as pd
        df = pd.DataFrame(report_data)
        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)
        return Response(
            content=csv_buffer.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=marketlens_report_{project_id[:8]}.csv"}
        )

    if format == "excel":
        import pandas as pd
        df = pd.DataFrame(report_data)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Verified Results")
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=marketlens_report_{project_id[:8]}.xlsx"}
        )

    if format == "pdf":
        from app.models.all_models import Project
        from app.services.pdf_generator import generate_pdf_report
        
        proj_res = await db.execute(select(Project).where(Project.id == project_id))
        proj = proj_res.scalars().first()
        proj_name = proj.name if proj else "MarketLens Project"

        pdf_bytes = generate_pdf_report(proj_name, project_id, report_data)

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename=marketlens_report_{project_id[:8]}.pdf"}
        )
