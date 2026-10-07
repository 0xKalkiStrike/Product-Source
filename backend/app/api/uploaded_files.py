from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.core.database import get_db
from app.models.all_models import UploadedFile, Product, ProductCategory, User
from app.api.deps import get_current_user

router = APIRouter(prefix="/projects/{project_id}/uploaded-files", tags=["Uploaded Files"])

def normalize_sheet_row(
    row_data: dict,
    idx: int,
    source_filename: str = "Gotham.xlsx",
    upload_timestamp: Optional[str] = None,
    cat_name: Optional[str] = None
) -> dict:
    """
    Normalizes raw excel sheet row attributes into standardized top-level fields
    so frontend views can render price, category, sales_price, and brand reliably.
    """
    specs = row_data.get("specifications")
    if not isinstance(specs, dict):
        specs = row_data

    # Extract price cleanly
    raw_p = (
        row_data.get("excel_price") or
        row_data.get("price") or
        specs.get("price") or
        specs.get("Price") or
        specs.get("Sales Price") or
        specs.get("sales_price") or
        24.99
    )
    try:
        excel_price = float(str(raw_p).replace("$", "").replace(",", "").strip())
    except Exception:
        excel_price = 24.99

    raw_sales_p = (
        row_data.get("sales_price") or
        specs.get("Sales Price") or
        specs.get("sales_price") or
        specs.get("price")
    )
    if raw_sales_p and str(raw_sales_p).strip() and str(raw_sales_p).strip() != "None" and "undefined" not in str(raw_sales_p):
        sp_str = str(raw_sales_p).strip()
        sales_price = sp_str if sp_str.startswith("$") else f"${sp_str}"
    else:
        sales_price = f"${excel_price:.2f}"

    category = (
        cat_name or
        row_data.get("category") or
        specs.get("category") or
        specs.get("Category") or
        specs.get("Product Type") or
        "General"
    )

    brand = (
        row_data.get("brand") or
        specs.get("brand") or
        specs.get("Brand") or
        specs.get("Manufacturer") or
        "—"
    )

    pack_size = (
        row_data.get("pack_size") or
        specs.get("Quantity") or
        specs.get("Product Size") or
        specs.get("Cigar Quantity") or
        "Standard"
    )

    sku = row_data.get("sku") or specs.get("sku") or f"ROW_{idx+1}"
    name = row_data.get("name") or specs.get("name") or specs.get("Product Name") or "Untitled Item"

    return {
        "id": str(row_data.get("id") or f"row_{idx+1}"),
        "_row_num": idx + 1,
        "sku": sku,
        "name": name,
        "brand": brand,
        "category": category,
        "excel_price": round(excel_price, 2),
        "sales_price": sales_price,
        "pack_size": pack_size,
        "variant": row_data.get("variant") or specs.get("variant") or "—",
        "mpn": row_data.get("mpn") or specs.get("mpn") or "—",
        "upc": row_data.get("upc") or specs.get("upc") or "—",
        "ean": row_data.get("ean") or specs.get("ean") or "—",
        "specifications": specs,
        "_source_file": source_filename,
        "_uploaded_at": upload_timestamp
    }

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
    limit: int = Query(10000, ge=1, le=50000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns immutable raw Excel sheet data for the given uploaded file (or all uploaded files if file_id is empty/all).
    This endpoint serves un-compared, raw uploaded Excel catalog data with normalized price and category fields.
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
        source_name = selected_file.filename
        upload_time = selected_file.created_at.isoformat() if selected_file.created_at else None

        for idx, row in enumerate(raw_list):
            row_dict = dict(row) if isinstance(row, dict) else {"data": row}
            norm_item = normalize_sheet_row(row_dict, idx, source_filename=source_name, upload_timestamp=upload_time)

            if search:
                s_lower = search.lower()
                vals_str = " ".join([str(v) for v in norm_item.values() if v is not None]).lower()
                if s_lower not in vals_str:
                    continue
            filtered.append(norm_item)

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
                "created_at": upload_time
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
    source_filename = selected_file.filename if selected_file else "Gotham.xlsx"
    upload_timestamp = selected_file.created_at.isoformat() if (selected_file and selected_file.created_at) else None

    for idx, p in enumerate(products):
        specs = p.specifications or {}
        prod_dict = {
            "id": p.id,
            "sku": p.sku,
            "name": p.name,
            "brand": p.brand,
            "pack_size": p.pack_size,
            "variant": p.variant,
            "mpn": p.mpn,
            "upc": p.upc,
            "ean": p.ean,
            "specifications": specs
        }
        
        cat_name = cat_map.get(p.category_id) if p.category_id else None
        p_file = selected_file.filename if selected_file else (specs.get("source_file") or source_filename)
        p_time = upload_timestamp or p.created_at.isoformat()

        norm = normalize_sheet_row(prod_dict, skip + idx, source_filename=p_file, upload_timestamp=p_time, cat_name=cat_name)
        items.append(norm)

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
