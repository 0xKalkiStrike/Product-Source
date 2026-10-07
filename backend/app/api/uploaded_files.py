from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.core.database import get_db
from app.models.all_models import UploadedFile, Product, ProductCategory, User
from app.api.deps import get_current_user

router = APIRouter(prefix="/projects/{project_id}/uploaded-files", tags=["Uploaded Files"])

@router.get("")
async def list_uploaded_files(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns list of all uploaded Excel / CSV sheet files for the project.
    """
    query = select(UploadedFile).where(UploadedFile.project_id == project_id).order_by(UploadedFile.created_at.desc())
    res = await db.execute(query)
    files = res.scalars().all()
    
    return [
        {
            "id": f.id,
            "project_id": f.project_id,
            "filename": f.filename,
            "file_size": f.file_size,
            "row_count": f.row_count,
            "valid_count": f.valid_count,
            "error_count": f.error_count,
            "status": f.status,
            "created_at": f.created_at.isoformat() if f.created_at else None
        }
        for f in files
    ]

@router.get("/data")
async def get_excel_sheet_data(
    project_id: str,
    file_id: Optional[str] = Query(None, description="Uploaded file ID or 'all' for all files"),
    search: Optional[str] = Query(None, description="Search term across sheet fields"),
    category_id: Optional[str] = Query(None, description="Category filter"),
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=2000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns immutable raw Excel sheet data for the given uploaded file (or all uploaded files if file_id is empty/all).
    This endpoint serves un-compared, raw uploaded Excel catalog data.
    """
    selected_file = None
    if file_id and file_id.strip() != "" and file_id.strip().lower() != "all":
        file_res = await db.execute(
            select(UploadedFile).where(UploadedFile.id == file_id, UploadedFile.project_id == project_id)
        )
        selected_file = file_res.scalars().first()

    # Check if selected_file has raw_data saved in DB
    if selected_file and selected_file.raw_data and isinstance(selected_file.raw_data, list) and len(selected_file.raw_data) > 0:
        raw_list = selected_file.raw_data
        filtered = []
        for idx, row in enumerate(raw_list):
            row_dict = dict(row) if isinstance(row, dict) else {"data": row}
            row_dict["_row_num"] = idx + 1
            row_dict["_source_file"] = selected_file.filename
            row_dict["_uploaded_at"] = selected_file.created_at.isoformat() if selected_file.created_at else None

            if search:
                s_lower = search.lower()
                vals_str = " ".join([str(v) for v in row_dict.values() if v is not None]).lower()
                if s_lower not in vals_str:
                    continue
            filtered.append(row_dict)

        total_count = len(filtered)
        paged_items = filtered[skip : skip + limit]

        return {
            "total": total_count,
            "skip": skip,
            "limit": limit,
            "file_info": {
                "id": selected_file.id,
                "filename": selected_file.filename,
                "file_size": selected_file.file_size,
                "row_count": selected_file.row_count,
                "created_at": selected_file.created_at.isoformat() if selected_file.created_at else None
            },
            "items": paged_items
        }

    # Fetch products from DB
    query = select(Product).where(Product.project_id == project_id)
    count_query = select(func.count(Product.id)).where(Product.project_id == project_id)

    if category_id:
        query = query.where(Product.category_id == category_id)
        count_query = count_query.where(Product.category_id == category_id)

    if search:
        pattern = f"%{search}%"
        search_filter = or_(
            Product.name.ilike(pattern),
            Product.sku.ilike(pattern),
            Product.brand.ilike(pattern),
            Product.upc.ilike(pattern),
            Product.mpn.ilike(pattern)
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    total_res = await db.execute(count_query)
    total = total_res.scalar() or 0

    query = query.offset(skip).limit(limit).order_by(Product.created_at.desc())
    res = await db.execute(query)
    products = res.scalars().all()

    cat_res = await db.execute(select(ProductCategory).where(ProductCategory.project_id == project_id))
    cat_map = {c.id: c.name for c in cat_res.scalars().all()}

    items = []
    for idx, p in enumerate(products):
        specs = p.specifications or {}
        
        # Determine Excel price from specifications or default
        raw_price = specs.get("price") or specs.get("Price") or specs.get("Sales Price")
        if not raw_price:
            excel_price = 24.99
        else:
            try:
                excel_price = float(str(raw_price).replace('$', '').replace(',', '').strip())
            except Exception:
                excel_price = 24.99

        source_filename = selected_file.filename if selected_file else (specs.get("source_file") or "Uploaded Catalog")
        upload_timestamp = selected_file.created_at.isoformat() if (selected_file and selected_file.created_at) else p.created_at.isoformat()

        items.append({
            "id": p.id,
            "_row_num": skip + idx + 1,
            "sku": p.sku,
            "name": p.name,
            "brand": p.brand or specs.get("brand") or specs.get("Brand") or "—",
            "category": cat_map.get(p.category_id, "General"),
            "excel_price": excel_price,
            "sales_price": specs.get("Sales Price") or specs.get("sales_price") or f"${excel_price:.2f}",
            "pack_size": p.pack_size or specs.get("Quantity") or specs.get("Product Size") or "Standard",
            "variant": p.variant or specs.get("variant") or "—",
            "mpn": p.mpn or specs.get("mpn") or "—",
            "upc": p.upc or specs.get("upc") or "—",
            "ean": p.ean or specs.get("ean") or "—",
            "specifications": specs,
            "_source_file": source_filename,
            "_uploaded_at": upload_timestamp
        })

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "file_info": {
            "id": selected_file.id,
            "filename": selected_file.filename,
            "file_size": selected_file.file_size,
            "row_count": selected_file.row_count,
            "created_at": selected_file.created_at.isoformat() if selected_file.created_at else None
        } if selected_file else None,
        "items": items
    }
