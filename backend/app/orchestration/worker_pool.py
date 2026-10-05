import asyncio
import logging
from datetime import datetime, timezone
from typing import List, Dict
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.all_models import WorkerModel, Job, Product
from app.orchestration.queue import job_queue
from app.orchestration.concurrency import concurrency_controller
from app.orchestration.resources import resource_manager
from app.orchestration.isolation import IsolatedExecutionContext
from app.orchestration.checkpoint import save_checkpoint, get_checkpoint
from app.orchestration.retry import retry_engine
from adapters.registry import get_source_adapter

logger = logging.getLogger("WorkerPool")

WORKER_TYPES = ["VERIFICATION", "MONITORING", "SCREENSHOT", "PRICE", "REPORT"]

class BaseWorker:
    def __init__(self, worker_name: str, worker_type: str):
        self.worker_name = worker_name
        self.worker_type = worker_type
        self.running = False
        self._task: asyncio.Task = None

    async def start(self):
        self.running = True
        await self._register_worker()
        self._task = asyncio.create_task(self._worker_loop())

    async def stop(self):
        self.running = False
        if self._task:
            self._task.cancel()

    async def _register_worker(self):
        async with AsyncSessionLocal() as db:
            res = await db.execute(select(WorkerModel).where(WorkerModel.worker_name == self.worker_name))
            worker = res.scalars().first()
            if not worker:
                worker = WorkerModel(
                    worker_name=self.worker_name,
                    worker_type=self.worker_type,
                    status="IDLE",
                    last_heartbeat=datetime.now(timezone.utc)
                )
                db.add(worker)
            else:
                worker.status = "IDLE"
                worker.last_heartbeat = datetime.now(timezone.utc)
            await db.commit()

    async def _send_heartbeat(self, status: str = "IDLE", current_job_id: str = None):
        async with AsyncSessionLocal() as db:
            res = await db.execute(select(WorkerModel).where(WorkerModel.worker_name == self.worker_name))
            worker = res.scalars().first()
            if worker:
                worker.status = status
                worker.current_job_id = current_job_id
                metrics = resource_manager.get_metrics()
                worker.cpu_usage = metrics["cpu_percent"]
                worker.memory_mb = metrics["memory_used_mb"]
                worker.last_heartbeat = datetime.now(timezone.utc)
                await db.commit()

    async def _worker_loop(self):
        logger.info(f"Worker {self.worker_name} ({self.worker_type}) online and listening.")
        while self.running:
            try:
                await self._send_heartbeat(status="IDLE")

                # Throttle if system is under heavy load
                if resource_manager.should_throttle():
                    await asyncio.sleep(5)
                    continue

                async with AsyncSessionLocal() as db:
                    job = await job_queue.fetch_next_job(db, [self.worker_type, "VERIFICATION", "MONITORING"])
                    if not job:
                        await asyncio.sleep(5)
                        continue

                    # Check concurrency limit
                    acquired = await concurrency_controller.acquire_slot(job.project_id)
                    if not acquired:
                        await asyncio.sleep(1)
                        continue

                    job_id = job.id
                    project_id = job.project_id
                    task_type = job.task_type
                    payload = job.payload or {}
                    retry_count = job.retry_count
                    max_retries = job.max_retries

                    # Mark running
                    await job_queue.mark_running(db, job_id, self.worker_name)
                    await self._send_heartbeat(status="BUSY", current_job_id=job_id)

                # Isolated Execution
                isolation = IsolatedExecutionContext(execution_id=job_id, timeout_seconds=180)
                execution_result = await isolation.run(
                    self._execute_job_task, job_id, project_id, task_type, payload
                )

                async with AsyncSessionLocal() as db:
                    if execution_result["success"]:
                        await job_queue.complete_job(db, job_id)
                        # Increment worker completed count
                        res = await db.execute(select(WorkerModel).where(WorkerModel.worker_name == self.worker_name))
                        w = res.scalars().first()
                        if w:
                            w.total_jobs_completed += 1
                            await db.commit()
                    else:
                        error_msg = execution_result.get("error", "Unknown error")
                        if retry_engine.should_retry(retry_count, max_retries, error_msg):
                            next_time = retry_engine.calculate_next_attempt_time(retry_count)
                            await job_queue.schedule_retry(db, job_id, next_time, error_msg)
                        else:
                            await job_queue.fail_job(db, job_id, error_msg)
                            res = await db.execute(select(WorkerModel).where(WorkerModel.worker_name == self.worker_name))
                            w = res.scalars().first()
                            if w:
                                w.total_jobs_failed += 1
                                await db.commit()

                await concurrency_controller.release_slot(project_id)
                await asyncio.sleep(1)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Worker {self.worker_name} exception in loop: {str(e)}")
                await asyncio.sleep(2)

    async def _execute_job_task(
        self, job_id: str, project_id: str, task_type: str, payload: Dict
    ) -> Dict:
        """
        Processes batch verification/monitoring with checkpoint saving.
        """
        async with AsyncSessionLocal() as db:
            # Check checkpoint
            checkpoint = await get_checkpoint(db, job_id)
            completed_ids = set(checkpoint.completed_item_ids) if checkpoint else set()

            # Fetch target products for job
            prod_query = select(Product).where(Product.project_id == project_id)
            if payload.get("product_ids"):
                prod_query = prod_query.where(Product.id.in_(payload["product_ids"]))

            res = await db.execute(prod_query)
            products = res.scalars().all()
            total = len(products)

            adapter = get_source_adapter(
                payload.get("adapter_name", "GenericSourceAdapter"),
                source_config={"name": payload.get("source_name", "Public Source"), "url": "https://example.com"}
            )

            processed = len(completed_ids)
            for idx, product in enumerate(products):
                if product.id in completed_ids:
                    continue

                # Simulate isolated adapter matching
                match_res = await adapter.search_product({
                    "sku": product.sku,
                    "name": product.name,
                    "upc": product.upc
                })

                if match_res and match_res.get("matched"):
                    product.status = "VERIFIED"
                else:
                    product.status = "FAILED"

                completed_ids.add(product.id)
                processed += 1

                # Update progress & checkpoint
                await job_queue.update_progress(db, job_id, processed_items=processed, total_items=total)
                await save_checkpoint(db, job_id, step_number=processed, completed_item_ids=list(completed_ids))
                await asyncio.sleep(0.05)

        return {"processed": processed, "total": total}

class MasterWorkerPool:
    def __init__(self, initial_worker_count: int = 4):
        self.initial_worker_count = initial_worker_count
        self.workers: List[BaseWorker] = []

    async def start_pool(self):
        for i in range(1, self.initial_worker_count + 1):
            wtype = WORKER_TYPES[(i - 1) % len(WORKER_TYPES)]
            worker = BaseWorker(worker_name=f"Worker-{i:02d}", worker_type=wtype)
            self.workers.append(worker)
            await worker.start()

    async def stop_pool(self):
        for w in self.workers:
            await w.stop()
        self.workers.clear()

worker_pool = MasterWorkerPool()
