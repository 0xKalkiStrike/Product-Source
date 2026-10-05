from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.core.database import get_db
from app.models.all_models import ProductCategory, User, AuditLog
from app.schemas.phase2 import CategoryCreate, CategoryOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/projects/{project_id}/categories", tags=["Categories"])

DEFAULT_CATEGORIES = [
    "Cigars",
    "Cigar Products",
    "Vape/E-Cigarette Products",
    "Vape Devices/Accessories",
    "Smoking Accessories",
    "Novelties",
    "Novelty Gifts",
    "Other"
]

@router.get("", response_model=List[CategoryOut])
async def list_categories(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Fetch system default categories + project-specific categories
    stmt = select(ProductCategory).where(
        or_(ProductCategory.project_id == None, ProductCategory.project_id == project_id)
    ).order_by(ProductCategory.name.asc())
    
    res = await db.execute(stmt)
    categories = res.scalars().all()
    
    # If no categories exist, auto-seed defaults
    if not categories:
        for cat_name in DEFAULT_CATEGORIES:
            slug = cat_name.lower().replace('/', '-').replace(' ', '-')
            cat = ProductCategory(project_id=project_id, name=cat_name, slug=slug)
            db.add(cat)
        await db.commit()
        
        res = await db.execute(stmt)
        categories = res.scalars().all()

    return [CategoryOut.model_validate(c) for c in categories]

@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
async def create_category(
    project_id: str,
    cat_in: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    slug = cat_in.name.lower().replace('/', '-').replace(' ', '-')
    cat = ProductCategory(
        project_id=project_id,
        name=cat_in.name,
        slug=slug,
        description=cat_in.description
    )
    db.add(cat)
    await db.commit()
    await db.refresh(cat)

    audit = AuditLog(
        user_id=current_user.id,
        project_id=project_id,
        action="CATEGORY_CREATE",
        status="SUCCESS",
        details={"name": cat.name}
    )
    db.add(audit)
    await db.commit()

    return CategoryOut.model_validate(cat)
