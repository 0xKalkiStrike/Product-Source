from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.all_models import Project, ProjectUser, User, AuditLog
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectOut, ProjectListOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.get("", response_model=ProjectListOut)
async def list_projects(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Fetch projects owned by or shared with current user
    if current_user.role == "ADMIN":
        count_stmt = select(func.count(Project.id))
        stmt = select(Project).offset(skip).limit(limit).order_by(Project.created_at.desc())
    else:
        count_stmt = select(func.count(Project.id)).join(ProjectUser).where(ProjectUser.user_id == current_user.id)
        stmt = select(Project).join(ProjectUser).where(ProjectUser.user_id == current_user.id).offset(skip).limit(limit).order_by(Project.created_at.desc())
    
    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0
    
    res = await db.execute(stmt)
    projects = res.scalars().all()
    
    return ProjectListOut(
        total=total,
        items=[ProjectOut.model_validate(p) for p in projects]
    )

@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_in: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    project = Project(
        name=project_in.name,
        description=project_in.description,
        status="ACTIVE",
        owner_id=current_user.id
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)

    # Link user as OWNER in ProjectUser
    pu = ProjectUser(
        project_id=project.id,
        user_id=current_user.id,
        role="OWNER"
    )
    db.add(pu)

    audit = AuditLog(
        user_id=current_user.id,
        project_id=project.id,
        action="PROJECT_CREATE",
        status="SUCCESS",
        details={"name": project.name}
    )
    db.add(audit)
    await db.commit()

    return ProjectOut.model_validate(project)

@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Project).where(Project.id == project_id))
    project = res.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check access permission
    if current_user.role != "ADMIN" and project.owner_id != current_user.id:
        pu_res = await db.execute(
            select(ProjectUser).where(
                ProjectUser.project_id == project_id,
                ProjectUser.user_id == current_user.id
            )
        )
        if not pu_res.scalars().first():
            raise HTTPException(status_code=403, detail="Access denied to this project")

    return ProjectOut.model_validate(project)

@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: str,
    project_in: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Project).where(Project.id == project_id))
    project = res.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project_in.name is not None:
        project.name = project_in.name
    if project_in.description is not None:
        project.description = project_in.description
    if project_in.status is not None:
        project.status = project_in.status

    await db.commit()
    await db.refresh(project)

    audit = AuditLog(
        user_id=current_user.id,
        project_id=project.id,
        action="PROJECT_UPDATE",
        status="SUCCESS",
        details=project_in.model_dump(exclude_unset=True)
    )
    db.add(audit)
    await db.commit()

    return ProjectOut.model_validate(project)

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Project).where(Project.id == project_id))
    project = res.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    await db.delete(project)
    await db.commit()

    audit = AuditLog(
        user_id=current_user.id,
        project_id=project_id,
        action="PROJECT_DELETE",
        status="SUCCESS",
        details={"name": project.name}
    )
    db.add(audit)
    await db.commit()
