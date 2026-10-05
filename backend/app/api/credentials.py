from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.encryption import encrypt_dict, decrypt_dict, mask_credential_data
from app.models.all_models import SourceCredential, Source, User, AuditLog
from app.schemas.phase2 import CredentialCreate, CredentialOut
from app.api.deps import get_current_user
from adapters.registry import get_source_adapter

router = APIRouter(prefix="/projects/{project_id}/credentials", tags=["Credentials"])

@router.get("", response_model=List[CredentialOut])
async def list_credentials(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(SourceCredential).where(SourceCredential.project_id == project_id).order_by(SourceCredential.created_at.desc())
    )
    credentials = res.scalars().all()

    out = []
    for c in credentials:
        decrypted = decrypt_dict(c.encrypted_data)
        masked = mask_credential_data(decrypted)
        out.append(
            CredentialOut(
                id=c.id,
                project_id=c.project_id,
                source_id=c.source_id,
                name=c.name,
                auth_type=c.auth_type,
                masked_data=masked,
                status=c.status,
                last_validated_at=c.last_validated_at,
                validation_error=c.validation_error,
                created_at=c.created_at,
                updated_at=c.updated_at
            )
        )
    return out

@router.post("", response_model=CredentialOut, status_code=status.HTTP_201_CREATED)
async def create_credential(
    project_id: str,
    cred_in: CredentialCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    encrypted = encrypt_dict(cred_in.credential_data)
    cred = SourceCredential(
        project_id=project_id,
        source_id=cred_in.source_id,
        name=cred_in.name,
        auth_type=cred_in.auth_type,
        encrypted_data=encrypted,
        status="PENDING"
    )
    db.add(cred)
    await db.commit()
    await db.refresh(cred)

    # Link credential to source if source_id provided
    if cred_in.source_id:
        src_res = await db.execute(select(Source).where(Source.id == cred_in.source_id))
        source = src_res.scalars().first()
        if source:
            source.credential_id = cred.id
            await db.commit()

    audit = AuditLog(
        user_id=current_user.id,
        project_id=project_id,
        action="CREDENTIAL_CREATE",
        status="SUCCESS",
        details={"name": cred.name, "auth_type": cred.auth_type}
    )
    db.add(audit)
    await db.commit()

    masked = mask_credential_data(cred_in.credential_data)
    return CredentialOut(
        id=cred.id,
        project_id=cred.project_id,
        source_id=cred.source_id,
        name=cred.name,
        auth_type=cred.auth_type,
        masked_data=masked,
        status=cred.status,
        last_validated_at=cred.last_validated_at,
        validation_error=cred.validation_error,
        created_at=cred.created_at,
        updated_at=cred.updated_at
    )

@router.post("/{credential_id}/validate", response_model=CredentialOut)
async def validate_credential(
    project_id: str,
    credential_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(SourceCredential).where(SourceCredential.project_id == project_id, SourceCredential.id == credential_id)
    )
    cred = res.scalars().first()
    if not cred:
        raise HTTPException(status_code=404, detail="Credential not found")

    cred.status = "VALIDATING"
    await db.commit()

    decrypted = decrypt_dict(cred.encrypted_data)

    # Get source config if mapped
    adapter_name = "GenericSourceAdapter"
    source_config = {"auth_required": True}
    if cred.source_id:
        src_res = await db.execute(select(Source).where(Source.id == cred.source_id))
        source = src_res.scalars().first()
        if source:
            adapter_name = source.adapter_name
            source_config = {
                "name": source.name,
                "url": source.url,
                "auth_required": source.auth_required
            }

    adapter = get_source_adapter(adapter_name, source_config=source_config, credential=decrypted)
    is_valid, error_msg = await adapter.validate_credential()

    cred.status = "VALID" if is_valid else "INVALID"
    cred.last_validated_at = datetime.now(timezone.utc)
    cred.validation_error = error_msg

    audit = AuditLog(
        user_id=current_user.id,
        project_id=project_id,
        action="CREDENTIAL_VALIDATE",
        status="SUCCESS" if is_valid else "FAILURE",
        details={"credential_name": cred.name, "is_valid": is_valid, "error": error_msg}
    )
    db.add(audit)
    await db.commit()
    await db.refresh(cred)

    masked = mask_credential_data(decrypted)
    return CredentialOut(
        id=cred.id,
        project_id=cred.project_id,
        source_id=cred.source_id,
        name=cred.name,
        auth_type=cred.auth_type,
        masked_data=masked,
        status=cred.status,
        last_validated_at=cred.last_validated_at,
        validation_error=cred.validation_error,
        created_at=cred.created_at,
        updated_at=cred.updated_at
    )

@router.delete("/{credential_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_credential(
    project_id: str,
    credential_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(SourceCredential).where(SourceCredential.project_id == project_id, SourceCredential.id == credential_id)
    )
    cred = res.scalars().first()
    if not cred:
        raise HTTPException(status_code=404, detail="Credential not found")

    await db.delete(cred)
    await db.commit()

    audit = AuditLog(
        user_id=current_user.id,
        project_id=project_id,
        action="CREDENTIAL_DELETE",
        status="SUCCESS",
        details={"name": cred.name}
    )
    db.add(audit)
    await db.commit()
