import os
import json
import asyncio
from datetime import datetime, date
from typing import Any, Dict, List, Optional, Callable
from pathlib import Path
from sqlalchemy import select, inspect
from sqlalchemy.ext.asyncio import AsyncSession

# Base data directory for the Virtual JSON Database
BASE_DIR = Path(__file__).resolve().parent.parent.parent
JSON_DB_DIR = BASE_DIR / "data" / "json_db"

def json_serializer(obj):
    """Custom JSON serializer for datetime, date, UUID, and complex objects."""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if hasattr(obj, "__dict__"):
        return obj.__dict__
    return str(obj)

class JSONDatabaseEngine:
    """
    Virtual JSON Database Engine.
    Stores and manages database collections as formatted JSON files in `data/json_db/*.json`.
    No external database provider required.
    """
    def __init__(self, db_dir: Optional[Path] = None):
        self.db_dir = db_dir or JSON_DB_DIR
        self._locks: Dict[str, asyncio.Lock] = {}
        self.ensure_storage_dir()

    def ensure_storage_dir(self):
        """Ensure the json_db directory exists."""
        os.makedirs(self.db_dir, exist_ok=True)

    def _get_lock(self, table_name: str) -> asyncio.Lock:
        if table_name not in self._locks:
            self._locks[table_name] = asyncio.Lock()
        return self._locks[table_name]

    def get_file_path(self, table_name: str) -> Path:
        clean_table = table_name.lower().replace(".json", "")
        return self.db_dir / f"{clean_table}.json"

    def read_table_sync(self, table_name: str) -> List[Dict[str, Any]]:
        file_path = self.get_file_path(table_name)
        if not file_path.exists():
            return []
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if not content:
                    return []
                return json.loads(content)
        except Exception as e:
            print(f"[JSON DB Warning] Failed to read {file_path}: {e}")
            return []

    def write_table_sync(self, table_name: str, records: List[Dict[str, Any]]) -> None:
        self.ensure_storage_dir()
        file_path = self.get_file_path(table_name)
        temp_path = file_path.with_suffix(".tmp")
        try:
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(records, f, indent=2, default=json_serializer, ensure_ascii=False)
            if os.path.exists(temp_path):
                os.replace(temp_path, file_path)
        except Exception as e:
            print(f"[JSON DB Error] Failed to write table {table_name}: {e}")
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception:
                    pass

    async def read_table(self, table_name: str) -> List[Dict[str, Any]]:
        lock = self._get_lock(table_name)
        async with lock:
            return await asyncio.to_thread(self.read_table_sync, table_name)

    async def write_table(self, table_name: str, records: List[Dict[str, Any]]) -> None:
        lock = self._get_lock(table_name)
        async with lock:
            await asyncio.to_thread(self.write_table_sync, table_name, records)

    async def insert(self, table_name: str, record: Dict[str, Any]) -> Dict[str, Any]:
        records = await self.read_table(table_name)
        rec_id = record.get("id")
        if rec_id:
            records = [r for r in records if str(r.get("id")) != str(rec_id)]
        records.append(record)
        await self.write_table(table_name, records)
        return record

    async def update(self, table_name: str, record_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        records = await self.read_table(table_name)
        updated_record = None
        for i, r in enumerate(records):
            if str(r.get("id")) == str(record_id):
                records[i].update(updates)
                updated_record = records[i]
                break
        if updated_record:
            await self.write_table(table_name, records)
        return updated_record

    async def delete(self, table_name: str, record_id: str) -> bool:
        records = await self.read_table(table_name)
        initial_count = len(records)
        records = [r for r in records if str(r.get("id")) != str(record_id)]
        if len(records) < initial_count:
            await self.write_table(table_name, records)
            return True
        return False

    async def find(self, table_name: str, filter_fn: Optional[Callable[[Dict[str, Any]], bool]] = None, **kwargs) -> List[Dict[str, Any]]:
        records = await self.read_table(table_name)
        results = []
        for r in records:
            match = True
            if filter_fn and not filter_fn(r):
                match = False
            if match and kwargs:
                for k, v in kwargs.items():
                    if r.get(k) != v:
                        match = False
                        break
            if match:
                results.append(r)
        return results

    def list_tables(self) -> List[str]:
        self.ensure_storage_dir()
        return [f.stem for f in self.db_dir.glob("*.json")]

# Singleton instance
json_db = JSONDatabaseEngine()

# --- SQLAlchemy to JSON Virtual Database Bridge ---

def model_to_dict(obj) -> Dict[str, Any]:
    """Convert SQLAlchemy model instance to a JSON-serializable dictionary."""
    data = {}
    for col in obj.__table__.columns:
        val = getattr(obj, col.name, None)
        if isinstance(val, (datetime, date)):
            data[col.name] = val.isoformat()
        else:
            data[col.name] = val
    return data

def get_all_models():
    from app.models import all_models
    return [
        all_models.User,
        all_models.Project,
        all_models.ProjectUser,
        all_models.ProductCategory,
        all_models.Product,
        all_models.Source,
        all_models.SourceCredential,
        all_models.UploadedFile,
        all_models.Job,
        all_models.WorkerModel,
        all_models.ExecutionCheckpoint,
        all_models.VerificationResult,
        all_models.ProductPrice,
        all_models.AuditLog,
        all_models.SystemSetting,
        all_models.SourceProduct,
        all_models.MonitoringRule,
        all_models.ChangeEvent,
        all_models.Evidence
    ]

_export_task = None

async def export_db_to_json(session: AsyncSession, target_models: Optional[List] = None):
    """
    Exports specified or all tables from active session into JSON files in `data/json_db/*.json`.
    """
    models = target_models or get_all_models()
    for model_cls in models:
        table_name = model_cls.__tablename__
        try:
            res = await session.execute(select(model_cls))
            items = res.scalars().all()
            records = [model_to_dict(item) for item in items]
            await json_db.write_table(table_name, records)
        except Exception as e:
            print(f"[JSON DB Export Warning] Table {table_name}: {e}")

def schedule_json_export():
    """Schedules a non-blocking background export of database to JSON files."""
    global _export_task
    try:
        loop = asyncio.get_running_loop()
        if _export_task and not _export_task.done():
            return
        
        async def _bg_runner():
            await asyncio.sleep(0.5) # Debounce
            from app.core.database import AsyncSessionLocal
            async with AsyncSessionLocal() as session:
                await export_db_to_json(session)

        _export_task = loop.create_task(_bg_runner())
    except Exception as e:
        print(f"[JSON DB Background Schedule Warning]: {e}")

async def import_json_to_db(session: AsyncSession):
    """
    Imports records from JSON files into active session if JSON database files exist.
    """
    models = get_all_models()

    for model_cls in models:
        table_name = model_cls.__tablename__
        file_path = json_db.get_file_path(table_name)
        if not file_path.exists():
            continue

        records = await json_db.read_table(table_name)
        if not records:
            continue

        pk_attr_name = inspect(model_cls).primary_key[0].name
        pk_col = getattr(model_cls, pk_attr_name)

        try:
            existing_res = await session.execute(select(pk_col))
            existing_pks = set(str(k) for k in existing_res.scalars().all())
        except Exception:
            existing_pks = set()

        col_types = {col.name: col.type for col in model_cls.__table__.columns}

        for rec in records:
            rec_pk = rec.get(pk_attr_name)
            if rec_pk and str(rec_pk) in existing_pks:
                continue

            cleaned_data = {}
            for k, v in rec.items():
                if k in col_types:
                    if v is not None and "DATETIME" in str(col_types[k]).upper():
                        try:
                            cleaned_data[k] = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
                        except Exception:
                            cleaned_data[k] = v
                    else:
                        cleaned_data[k] = v

            try:
                inst = model_cls(**cleaned_data)
                session.add(inst)
            except Exception as e:
                print(f"[JSON DB Import Warning] Record in {table_name}: {e}")
        
    try:
        await session.commit()
    except Exception as e:
        await session.rollback()
        print(f"[JSON DB Commit Warning]: {e}")
