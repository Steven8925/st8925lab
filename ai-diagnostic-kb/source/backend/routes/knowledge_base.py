# =========================================================================
#  knowledge_base.py — Knowledge Base CRUD & RAG Semantic Search API
# =========================================================================

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List, Optional
from db.models import TroubleshootingItem, WorkOrderItem, FAQItem, PartLifecycleItem, KBSearchRequest
from knowledge_base.manager import kb_manager
from knowledge_base.retriever import retriever

router = APIRouter(prefix="/api/kb", tags=["Knowledge Base"])

# ── 1. Troubleshooting CRUD ──
@router.get("/troubleshooting")
def list_troubleshooting(category: Optional[str] = None) -> List[Dict[str, Any]]:
    return kb_manager.list_troubleshooting(category=category)

@router.get("/troubleshooting/{item_id}")
def get_troubleshooting(item_id: int) -> Dict[str, Any]:
    item = kb_manager.get_troubleshooting(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Troubleshooting item not found")
    return item

@router.post("/troubleshooting")
def create_troubleshooting(item: TroubleshootingItem) -> Dict[str, Any]:
    return kb_manager.create_troubleshooting(item)

# ── 2. Work Orders CRUD ──
@router.get("/work-orders")
def list_work_orders(machine_id: Optional[int] = None) -> List[Dict[str, Any]]:
    return kb_manager.list_work_orders(machine_id=machine_id)

@router.get("/work-orders/{item_id}")
def get_work_order(item_id: int) -> Dict[str, Any]:
    item = kb_manager.get_work_order(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Work order not found")
    return item

@router.post("/work-orders")
def create_work_order(item: WorkOrderItem) -> Dict[str, Any]:
    return kb_manager.create_work_order(item)

# ── 3. FAQ CRUD ──
@router.get("/faq")
def list_faqs(category: Optional[str] = None) -> List[Dict[str, Any]]:
    return kb_manager.list_faqs(category=category)

@router.post("/faq")
def create_faq(item: FAQItem) -> Dict[str, Any]:
    return kb_manager.create_faq(item)

# ── 4. Parts Lifecycle ──
@router.get("/parts-lifecycle")
def list_parts_lifecycle() -> List[Dict[str, Any]]:
    return kb_manager.list_parts_lifecycle()

# ── 5. RAG Semantic Search ──
@router.post("/search")
async def search_knowledge_base(req: KBSearchRequest) -> Dict[str, Any]:
    hits = await retriever.search(query=req.query, top_k=req.top_k, tables=req.tables)
    return {
        "query": req.query,
        "hits_count": len(hits),
        "results": hits
    }
