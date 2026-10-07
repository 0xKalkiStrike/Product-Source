from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.core.database import get_db
from app.models.all_models import Product, ProductCategory, UploadedFile, User, AuditLog
from app.schemas.phase2 import ProductCreate, ProductOut, ProductListOut
from app.services.excel_parser import parse_product_file_full
from app.api.deps import get_current_user

router = APIRouter(prefix="/projects/{project_id}/products", tags=["Products"])

@router.get("", response_model=ProductListOut)
async def list_products(
    project_id: str,
    skip: int = 0,
    limit: int = 1000,
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
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

    return ProductListOut(
        total=total,
        items=[ProductOut.model_validate(p) for p in products]
    )

@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
async def create_product(
    project_id: str,
    prod_in: ProductCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Check duplicate SKU in project
    exist = await db.execute(
        select(Product).where(Product.project_id == project_id, Product.sku == prod_in.sku)
    )
    if exist.scalars().first():
        raise HTTPException(status_code=400, detail=f"Product with SKU '{prod_in.sku}' already exists in project")

    product = Product(
        project_id=project_id,
        sku=prod_in.sku,
        name=prod_in.name,
        category_id=prod_in.category_id,
        brand=prod_in.brand,
        mpn=prod_in.mpn,
        upc=prod_in.upc,
        ean=prod_in.ean,
        pack_size=prod_in.pack_size,
        variant=prod_in.variant,
        specifications=prod_in.specifications,
        status="UNVERIFIED"
    )
    db.add(product)
    await db.commit()
    await db.refresh(product)

    return ProductOut.model_validate(product)

@router.post("/upload")
async def upload_products(
    project_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    filename = file.filename or "uploaded_file.xlsx"
    try:
        valid_products, errors, all_rows = parse_product_file_full(contents, filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"File parsing error: {str(e)}")

    inserted_count = 0

    try:
        # Map categories to IDs, create missing categories on the fly
        cat_res = await db.execute(select(ProductCategory))
        categories = cat_res.scalars().all()
        cat_map = {c.name.lower(): c.id for c in categories}

        # Pre-fetch ALL existing products for project to avoid N+1 queries during bulk processing
        exist_res = await db.execute(select(Product).where(Product.project_id == project_id))
        existing_products_map = {p.sku: p for p in exist_res.scalars().all()}

        for prod_data in valid_products:
            category_name = prod_data.get("category_name", "General")
            cat_key = category_name.lower()

            if cat_key not in cat_map:
                new_cat = ProductCategory(
                    project_id=project_id,
                    name=category_name,
                    slug=category_name.lower().replace(' ', '-')
                )
                db.add(new_cat)
                await db.flush()
                cat_map[cat_key] = new_cat.id

            category_id = cat_map[cat_key]

            sku = prod_data["sku"]
            existing_product = existing_products_map.get(sku)

            if existing_product:
                # Update existing product details
                existing_product.name = prod_data["name"]
                existing_product.brand = prod_data.get("brand") or existing_product.brand
                existing_product.mpn = prod_data.get("mpn") or existing_product.mpn
                existing_product.upc = prod_data.get("upc") or existing_product.upc
                existing_product.category_id = category_id
                existing_product.specifications = prod_data.get("specifications") or existing_product.specifications
            else:
                product = Product(
                    project_id=project_id,
                    category_id=category_id,
                    sku=prod_data["sku"],
                    name=prod_data["name"],
                    brand=prod_data.get("brand"),
                    mpn=prod_data.get("mpn"),
                    upc=prod_data.get("upc"),
                    ean=prod_data.get("ean"),
                    pack_size=prod_data.get("pack_size"),
                    variant=prod_data.get("variant"),
                    specifications=prod_data.get("specifications"),
                    status="UNVERIFIED"
                )
                db.add(product)
                existing_products_map[sku] = product
            inserted_count += 1

        # Save Upload Log
        upload_log = UploadedFile(
            project_id=project_id,
            filename=file.filename or "uploaded_file.xlsx",
            file_size=len(contents),
            row_count=len(all_rows),
            valid_count=inserted_count,
            error_count=len(errors),
            error_report={"row_errors": errors},
            raw_data=all_rows,
            status="PROCESSED" if inserted_count > 0 else "FAILED"
        )
        db.add(upload_log)

        audit = AuditLog(
            user_id=current_user.id,
            project_id=project_id,
            action="PRODUCT_EXCEL_UPLOAD",
            status="SUCCESS" if inserted_count > 0 else "WARNING",
            details={"filename": file.filename, "inserted": inserted_count, "errors": len(errors)}
        )
        db.add(audit)

        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to process catalog upload: {str(e)}")

    return {
        "filename": file.filename,
        "row_count": len(valid_products),
        "inserted_count": inserted_count,
        "error_count": len(errors),
        "error_report": errors
    }
