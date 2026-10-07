"""
Live scraper for Target Source websites.

Fetches real product data from each Target Source (Shopify-style `/products.json`
storefront API) and stores it in `source_products`. It never fabricates products:
if a site does not expose its catalog, the run for that site is reported as FAILED
with the reason, and any previously collected rows for it are left untouched.

The run executes as a background task so the HTTP request returns immediately and
the UI can poll progress. No request timeouts are applied.
"""
import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import httpx
from sqlalchemy import delete, select

from app.core.database import AsyncSessionLocal
from app.models.all_models import AuditLog, Source, SourceProduct

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
}

# project_id -> live status dict (single-process state, polled by the UI)
_state: Dict[str, Dict[str, Any]] = {}
_tasks: set = set()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _to_float(val: Any) -> Optional[float]:
    try:
        if val is None or str(val).strip() == "":
            return None
        return float(str(val).replace("$", "").replace(",", "").strip())
    except Exception:
        return None


def _map_shopify_product(p: Dict[str, Any], domain: str) -> Optional[Dict[str, Any]]:
    title = (p.get("title") or "").strip()
    if not title or p.get("id") is None:
        return None
    variants = p.get("variants") or [{}]
    first = variants[0] if variants else {}
    price = _to_float(first.get("price"))
    compare_at = _to_float(first.get("compare_at_price"))
    discount = 0.0
    if price and compare_at and compare_at > price:
        discount = round((compare_at - price) / compare_at * 100, 2)
    in_stock = any(v.get("available", True) for v in variants) if variants else True
    images = p.get("images") or []
    var_title = first.get("title")
    return {
        "source_product_id": str(p["id"]),
        "name": title,
        "brand": p.get("vendor") or None,
        "category": p.get("product_type") or None,
        "sku": first.get("sku") or None,
        "upc": first.get("barcode") or None,
        "price": price,
        "msrp": compare_at,
        "discount": discount,
        "pack_size": var_title if var_title and var_title != "Default Title" else None,
        "availability": "IN_STOCK" if in_stock else "OUT_OF_STOCK",
        "product_url": f"https://{domain}/products/{p.get('handle')}" if p.get("handle") else None,
        "image_url": images[0].get("src") if images else None,
    }


async def _fetch_catalog(url: str, entry: Dict[str, Any]) -> List[Dict[str, Any]]:
    parsed = urlparse(url if "//" in url else f"https://{url}")
    domain = parsed.netloc or parsed.path
    items: List[Dict[str, Any]] = []
    seen_first_ids: set = set()
    page = 1

    async with httpx.AsyncClient(timeout=None, follow_redirects=True, headers=HEADERS) as client:
        while True:
            resp = await client.get(f"https://{domain}/products.json", params={"limit": 250, "page": page})
            if resp.status_code != 200:
                if page == 1:
                    raise ValueError(f"{domain} does not expose a product feed (HTTP {resp.status_code})")
                break
            try:
                data = resp.json()
            except Exception:
                if page == 1:
                    raise ValueError(f"{domain} did not return a readable product feed")
                break
            products = data.get("products") if isinstance(data, dict) else None
            if not products:
                break
            first_id = products[0].get("id")
            if first_id in seen_first_ids:  # site ignores the page parameter
                break
            seen_first_ids.add(first_id)
            for p in products:
                mapped = _map_shopify_product(p, domain)
                if mapped:
                    items.append(mapped)
            entry["collected"] = len(items)
            page += 1
    return items


async def _run(project_id: str, user_id: str, source_ids: Optional[List[str]], st: Dict[str, Any]) -> None:
    try:
        async with AsyncSessionLocal() as db:
            query = select(Source).where(Source.project_id == project_id, Source.status == "ACTIVE")
            if source_ids:
                query = query.where(Source.id.in_(source_ids))
            sources = [(s.id, s.name, s.url) for s in (await db.execute(query)).scalars().all()]

            for sid, name, _url in sources:
                st["sources"][sid] = {"name": name, "state": "PENDING", "collected": 0, "error": None}

            # Remove the placeholder rows created by the old demo "collect" button.
            await db.execute(
                delete(SourceProduct).where(
                    SourceProduct.project_id == project_id,
                    SourceProduct.brand.in_(["Brand X", "Brand Y", "Brand Z"]),
                    SourceProduct.source_product_id.like("SP-%-00_"),
                )
            )
            await db.commit()

            for sid, name, url in sources:
                entry = st["sources"][sid]
                entry["state"] = "RUNNING"
                try:
                    items = await _fetch_catalog(url, entry)
                    if not items:
                        raise ValueError("The site returned no products")

                    await db.execute(
                        delete(SourceProduct).where(
                            SourceProduct.project_id == project_id, SourceProduct.source_id == sid
                        )
                    )
                    collected_at = datetime.now(timezone.utc)
                    for it in items:
                        db.add(SourceProduct(project_id=project_id, source_id=sid, collected_at=collected_at, **it))
                    src = await db.get(Source, sid)
                    if src:
                        src.last_successful_execution = collected_at
                    db.add(AuditLog(
                        user_id=user_id,
                        project_id=project_id,
                        action="SOURCE_LIVE_SCRAPE",
                        status="SUCCESS",
                        details={"source_id": sid, "source_name": name, "url": url, "items": len(items)},
                    ))
                    await db.commit()
                    entry.update(state="DONE", collected=len(items))
                    st["total_collected"] += len(items)
                except Exception as exc:
                    await db.rollback()
                    logger.warning("Live scrape failed for %s: %s", url, exc)
                    entry.update(state="FAILED", error=str(exc) or exc.__class__.__name__)
    except Exception as exc:
        logger.exception("Live scrape run crashed")
        st["error"] = str(exc) or exc.__class__.__name__
    finally:
        st["running"] = False
        st["finished_at"] = _now_iso()


def get_status(project_id: str) -> Dict[str, Any]:
    return _state.get(project_id) or {
        "running": False, "started_at": None, "finished_at": None,
        "sources": {}, "total_collected": 0, "error": None,
    }


def start_live_scrape(project_id: str, user_id: str, source_ids: Optional[List[str]] = None) -> Dict[str, Any]:
    """Starts a background scrape unless one is already running for the project."""
    current = _state.get(project_id)
    if current and current["running"]:
        return current
    st: Dict[str, Any] = {
        "running": True, "started_at": _now_iso(), "finished_at": None,
        "sources": {}, "total_collected": 0, "error": None,
    }
    _state[project_id] = st
    task = asyncio.create_task(_run(project_id, user_id, source_ids, st))
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)
    return st
