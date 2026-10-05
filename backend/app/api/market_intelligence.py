from typing import List, Optional
import statistics
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.all_models import Product, VerificationResult, ProductPrice, Source, User
from app.api.deps import get_current_user

router = APIRouter(prefix="/projects/{project_id}/market-intelligence", tags=["Market Intelligence"])

@router.get("/summary")
async def get_market_intelligence_summary(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Fetch all products in project
    prod_res = await db.execute(select(Product).where(Product.project_id == project_id))
    products = prod_res.scalars().all()

    # Fetch verification results
    ver_res = await db.execute(select(VerificationResult).where(VerificationResult.project_id == project_id))
    verifications = ver_res.scalars().all()

    total_products = len(products)
    verified_count = len(set(v.product_id for v in verifications if v.status == "VERIFIED"))
    not_found_count = len(set(p.id for p in products if p.status == "UNVERIFIED"))

    # Price differences
    price_diffs = []
    lowest_prices = []
    highest_prices = []
    avg_prices = []

    # Map product prices
    prices_res = await db.execute(select(ProductPrice).where(ProductPrice.project_id == project_id))
    all_prices = prices_res.scalars().all()

    prod_price_map = {}
    for p in all_prices:
        prod_price_map.setdefault(p.product_id, []).append(p.normalized_usd)

    mismatch_count = 0

    for p in products:
        s_prices = prod_price_map.get(p.id, [])
        if s_prices:
            min_p = min(s_prices)
            max_p = max(s_prices)
            avg_p = sum(s_prices) / len(s_prices)
            lowest_prices.append(min_p)
            highest_prices.append(max_p)
            avg_prices.append(avg_p)
            if max_p - min_p > 2.0:
                mismatch_count += 1

    return {
        "total_products": total_products,
        "verified_products": verified_count,
        "unverified_products": not_found_count,
        "price_mismatches": mismatch_count,
        "market_avg_price": round(statistics.mean(avg_prices), 2) if avg_prices else 0.0,
        "market_lowest_price": round(min(lowest_prices), 2) if lowest_prices else 0.0,
        "market_highest_price": round(max(highest_prices), 2) if highest_prices else 0.0,
        "currency": "USD"
    }

@router.get("/products")
async def get_market_price_analytics(
    project_id: str,
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Product).where(Product.project_id == project_id)
    if search:
        pattern = f"%{search}%"
        query = query.where(Product.name.ilike(pattern) | Product.sku.ilike(pattern) | Product.brand.ilike(pattern))

    total_res = await db.execute(select(func.count(Product.id)).where(Product.project_id == project_id))
    total = total_res.scalar() or 0

    res = await db.execute(query.offset(skip).limit(limit))
    products = res.scalars().all()

    items = []
    for prod in products:
        # Fetch prices for this product
        p_res = await db.execute(
            select(ProductPrice, Source.name)
            .join(Source, ProductPrice.source_id == Source.id)
            .where(ProductPrice.product_id == prod.id)
        )
        source_price_rows = p_res.all()

        source_prices = []
        prices_val = []

        for p_row, s_name in source_price_rows:
            source_prices.append({
                "source_id": p_row.source_id,
                "source_name": s_name,
                "price": p_row.price,
                "currency": p_row.currency,
                "normalized_usd": p_row.normalized_usd,
                "recorded_at": p_row.recorded_at.isoformat()
            })
            prices_val.append(p_row.normalized_usd)

        # Excel base price (from specs or default)
        excel_price = 24.99
        if prod.specifications and isinstance(prod.specifications, dict) and "price" in prod.specifications:
            excel_price = float(prod.specifications["price"])

        if prices_val:
            lowest = min(prices_val)
            highest = max(prices_val)
            avg_p = round(statistics.mean(prices_val), 2)
            median_p = round(statistics.median(prices_val), 2)
            p_range = round(highest - lowest, 2)
            price_diff = round(avg_p - excel_price, 2)
        else:
            lowest = excel_price
            highest = excel_price
            avg_p = excel_price
            median_p = excel_price
            p_range = 0.0
            price_diff = 0.0

        items.append({
            "product_id": prod.id,
            "sku": prod.sku,
            "name": prod.name,
            "brand": prod.brand,
            "category_id": prod.category_id,
            "upc": prod.upc,
            "excel_price": excel_price,
            "lowest_price": lowest,
            "highest_price": highest,
            "average_price": avg_p,
            "median_price": median_p,
            "price_range": p_range,
            "price_difference": price_diff,
            "currency": "USD",
            "sources": source_prices,
            "sources_count": len(source_prices)
        })

    return {
        "total": total,
        "items": items
    }
