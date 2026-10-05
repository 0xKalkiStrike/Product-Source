from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.all_models import VerificationResult, Product, Source, Evidence, User
from app.api.deps import get_current_user

router = APIRouter(prefix="/projects/{project_id}/evidence", tags=["Evidence System"])

@router.get("")
async def list_evidence_records(
    project_id: str,
    skip: int = 0,
    limit: int = 50,
    product_id: Optional[str] = None,
    source_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(VerificationResult, Product.name.label("product_name"), Product.sku.label("product_sku"), Source.name.label("source_name"))
        .join(Product, VerificationResult.product_id == Product.id)
        .outerjoin(Source, VerificationResult.source_id == Source.id)
        .where(VerificationResult.project_id == project_id)
    )

    count_query = select(func.count(VerificationResult.id)).where(VerificationResult.project_id == project_id)

    if product_id:
        query = query.where(VerificationResult.product_id == product_id)
        count_query = count_query.where(VerificationResult.product_id == product_id)

    if source_id:
        query = query.where(VerificationResult.source_id == source_id)
        count_query = count_query.where(VerificationResult.source_id == source_id)

    total_res = await db.execute(count_query)
    total = total_res.scalar() or 0

    res = await db.execute(query.offset(skip).limit(limit).order_by(VerificationResult.verified_at.desc()))
    rows = res.all()

    items = []
    for ver, p_name, p_sku, s_name in rows:
        items.append({
            "id": ver.id,
            "project_id": ver.project_id,
            "product_id": ver.product_id,
            "product_name": p_name,
            "product_sku": p_sku,
            "source_id": ver.source_id,
            "source_name": s_name or "Target Source",
            "match_priority_level": ver.match_priority_level,
            "match_confidence": ver.match_confidence,
            "extracted_price": ver.extracted_price,
            "currency": ver.currency,
            "evidence_path": ver.evidence_path or f"storage/evidence/{ver.id[:10]}.png",
            "evidence_hash": ver.evidence_hash or "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            "status": ver.status,
            "verified_at": ver.verified_at.isoformat() if ver.verified_at else None,
            "match_evidence": ver.match_evidence
        })

    return {"total": total, "items": items}
