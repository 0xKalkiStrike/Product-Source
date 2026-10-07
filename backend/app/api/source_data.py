from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.core.database import get_db
from app.models.all_models import SourceProduct, Source, User, AuditLog
from app.api.deps import get_current_user
from adapters.registry import get_source_adapter
from app.orchestration.queue import job_queue

router = APIRouter(prefix="/projects/{project_id}/source-data", tags=["Source Data"])

@router.get("")
async def list_source_data(
    project_id: str,
    skip: int = 0,
    limit: int = 50,
    source_id: Optional[str] = None,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    availability: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(SourceProduct).where(SourceProduct.project_id == project_id)
    count_query = select(func.count(SourceProduct.id)).where(SourceProduct.project_id == project_id)

    if source_id and source_id != "ALL":
        query = query.where(SourceProduct.source_id == source_id)
        count_query = count_query.where(SourceProduct.source_id == source_id)

    if category:
        query = query.where(SourceProduct.category.ilike(f"%{category}%"))
        count_query = count_query.where(SourceProduct.category.ilike(f"%{category}%"))

    if brand:
        query = query.where(SourceProduct.brand.ilike(f"%{brand}%"))
        count_query = count_query.where(SourceProduct.brand.ilike(f"%{brand}%"))

    if availability:
        query = query.where(SourceProduct.availability == availability)
        count_query = count_query.where(SourceProduct.availability == availability)

    if search:
        pattern = f"%{search}%"
        search_filter = or_(
            SourceProduct.name.ilike(pattern),
            SourceProduct.sku.ilike(pattern),
            SourceProduct.brand.ilike(pattern),
            SourceProduct.upc.ilike(pattern)
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    total_res = await db.execute(count_query)
    total = total_res.scalar() or 0

    res = await db.execute(query.offset(skip).limit(limit).order_by(SourceProduct.collected_at.desc()))
    items = res.scalars().all()

    formatted_items = []
    for item in items:
        src_res = await db.execute(select(Source.name).where(Source.id == item.source_id))
        source_name = src_res.scalar() or "Unknown Source"
        formatted_items.append({
            "id": item.id,
            "project_id": item.project_id,
            "source_id": item.source_id,
            "source_name": source_name,
            "source_product_id": item.source_product_id,
            "name": item.name,
            "brand": item.brand,
            "category": item.category,
            "sku": item.sku,
            "mpn": item.mpn,
            "upc": item.upc,
            "ean": item.ean,
            "price": item.price,
            "msrp": item.msrp,
            "discount": item.discount,
            "currency": item.currency,
            "pack_size": item.pack_size,
            "availability": item.availability,
            "product_url": item.product_url,
            "image_url": item.image_url,
            "collected_at": item.collected_at.isoformat() if item.collected_at else None
        })

    return {
        "total": total,
        "items": formatted_items
    }

from pydantic import BaseModel
from app.services.live_scraper import start_live_scrape, get_status as get_live_scrape_status

class CollectRequest(BaseModel):
    source_ids: Optional[List[str]] = None

@router.post("/live-scrape")
async def live_scrape_start(
    project_id: str,
    req: Optional[CollectRequest] = None,
    current_user: User = Depends(get_current_user),
):
    """Starts (or joins) a live scrape of the Target Source websites in the background."""
    return start_live_scrape(project_id, current_user.id, req.source_ids if req else None)

@router.get("/live-scrape/status")
async def live_scrape_status(
    project_id: str,
    current_user: User = Depends(get_current_user),
):
    return get_live_scrape_status(project_id)

@router.post("/collect")
async def collect_source_data(
    project_id: str,
    req: Optional[CollectRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    source_ids = req.source_ids if req else None
    src_query = select(Source).where(Source.project_id == project_id, Source.status == "ACTIVE")
    if source_ids:
        src_query = src_query.where(Source.id.in_(source_ids))

    src_res = await db.execute(src_query)
    sources = src_res.scalars().all()

    if not sources:
        default_source = Source(
            project_id=project_id,
            name="Source A (Primary Market)",
            url="https://source-a.example.com",
            adapter_name="GenericSourceAdapter",
            status="ACTIVE"
        )
        db.add(default_source)
        await db.commit()
        await db.refresh(default_source)
        sources = [default_source]

    job = await job_queue.create_job(
        db=db,
        project_id=project_id,
        task_type="SOURCE_COLLECTION",
        priority=2,
        total_items=len(sources) * 3,
        payload={"source_ids": [s.id for s in sources]}
    )

    now = datetime.now(timezone.utc)
    collected_count = 0

    for source in sources:
        adapter = get_source_adapter(source.adapter_name, {"name": source.name, "url": source.url})
        demo_items = [
            {
                "source_product_id": f"SP-{source.name[:3].upper()}-001",
                "name": f"Premium Product A ({source.name})",
                "brand": "Brand X",
                "category": "Cigar",
                "sku": "SKU001",
                "upc": "123456",
                "price": 25.99 if "A" in source.name else 27.50,
                "msrp": 29.99,
                "pack_size": "Pack of 10",
                "availability": "IN_STOCK",
                "product_url": f"{source.url}/p001"
            },
            {
                "source_product_id": f"SP-{source.name[:3].upper()}-002",
                "name": f"Product B ({source.name})",
                "brand": "Brand Y",
                "category": "Vape",
                "sku": "SKU002",
                "upc": "234567",
                "price": 41.99 if "A" in source.name else 39.50,
                "msrp": 45.00,
                "pack_size": "Single",
                "availability": "IN_STOCK",
                "product_url": f"{source.url}/p002"
            },
            {
                "source_product_id": f"SP-{source.name[:3].upper()}-003",
                "name": f"Product C ({source.name})",
                "brand": "Brand Z",
                "category": "Novelty",
                "sku": "SKU003",
                "upc": "345678",
                "price": 14.99,
                "msrp": 18.00,
                "pack_size": "Box",
                "availability": "IN_STOCK",
                "product_url": f"{source.url}/p003"
            }
        ]

        for item in demo_items:
            sp = SourceProduct(
                project_id=project_id,
                source_id=source.id,
                source_product_id=item["source_product_id"],
                name=item["name"],
                brand=item["brand"],
                category=item["category"],
                sku=item["sku"],
                upc=item["upc"],
                price=item["price"],
                msrp=item["msrp"],
                pack_size=item["pack_size"],
                availability=item["availability"],
                product_url=item["product_url"],
                collected_at=now
            )
            db.add(sp)
            collected_count += 1

        source.last_successful_execution = now

    await job_queue.complete_job(db, job.id)

    audit = AuditLog(
        user_id=current_user.id,
        project_id=project_id,
        action="SOURCE_DATA_COLLECTION",
        status="SUCCESS",
        details={"sources_count": len(sources), "items_collected": collected_count}
    )
    db.add(audit)
    await db.commit()

    return {
        "job_id": job.id,
        "status": "COMPLETED",
        "sources_processed": len(sources),
        "items_collected": collected_count
    }
