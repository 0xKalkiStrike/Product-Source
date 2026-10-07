from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.json_database import json_db, export_db_to_json, import_json_to_db
from app.api.deps import get_current_user
from app.models.all_models import User

router = APIRouter(prefix="/json-db", tags=["Virtual JSON Database"])

@router.get("/tables")
async def list_json_tables(current_user: User = Depends(get_current_user)):
    """List all available JSON database files and record counts."""
    tables = json_db.list_tables()
    result = []
    for t in tables:
        records = await json_db.read_table(t)
        file_path = json_db.get_file_path(t)
        result.append({
            "table_name": t,
            "file_name": f"{t}.json",
            "file_path": str(file_path),
            "record_count": len(records)
        })
    return {"status": "success", "tables": result, "db_directory": str(json_db.db_dir)}

@router.get("/tables/{table_name}")
async def get_json_table(table_name: str, current_user: User = Depends(get_current_user)):
    """Retrieve full content of a specified JSON database table."""
    records = await json_db.read_table(table_name)
    return {
        "status": "success",
        "table_name": table_name,
        "count": len(records),
        "data": records
    }

@router.post("/tables/{table_name}")
async def insert_or_update_json_record(
    table_name: str,
    record: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Insert or update a record directly in a JSON database file."""
    if not record.get("id"):
        import uuid
        record["id"] = str(uuid.uuid4())
    
    saved_record = await json_db.insert(table_name, record)
    # Sync with session if applicable
    await import_json_to_db(db)
    return {"status": "success", "table_name": table_name, "record": saved_record}

@router.delete("/tables/{table_name}/{record_id}")
async def delete_json_record(
    table_name: str,
    record_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a record directly from a JSON database file."""
    deleted = await json_db.delete(table_name, record_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Record {record_id} not found in {table_name}.json")
    return {"status": "success", "message": f"Deleted record {record_id} from {table_name}.json"}

@router.post("/sync")
async def trigger_manual_sync(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Manually sync database memory and JSON database files."""
    await import_json_to_db(db)
    await export_db_to_json(db)
    tables = json_db.list_tables()
    return {"status": "success", "synced_tables": tables, "db_directory": str(json_db.db_dir)}
