# =========================================================================
#  manager.py — Knowledge Base Manager (CRUD + Vectorization & In-Memory Store)
# =========================================================================

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from db.models import TroubleshootingItem, WorkOrderItem, FAQItem, PartLifecycleItem
from knowledge_base.seed_data import (
    TROUBLESHOOTING_SEEDS,
    WORK_ORDER_SEEDS,
    FAQ_SEEDS,
    PARTS_LIFECYCLE_SEEDS
)
from knowledge_base.embedder import get_embedding_provider

logger = logging.getLogger("AI_KB_Manager")

class KnowledgeBaseManager:
    def __init__(self):
        self.troubleshooting: List[Dict[str, Any]] = []
        self.work_orders: List[Dict[str, Any]] = []
        self.faqs: List[Dict[str, Any]] = []
        self.parts_lifecycle: List[Dict[str, Any]] = []
        self.embedder = get_embedding_provider()
        self._init_seeds()

    def _init_seeds(self):
        # 1. Seed Troubleshooting
        for idx, item in enumerate(TROUBLESHOOTING_SEEDS, start=1):
            d = dict(item)
            d["id"] = idx
            d["created_at"] = datetime.utcnow().isoformat()
            self.troubleshooting.append(d)

        # 2. Seed Work Orders
        for idx, item in enumerate(WORK_ORDER_SEEDS, start=1):
            d = dict(item)
            d["id"] = idx
            d["created_at"] = datetime.utcnow().isoformat()
            self.work_orders.append(d)

        # 3. Seed FAQs
        for idx, item in enumerate(FAQ_SEEDS, start=1):
            d = dict(item)
            d["id"] = idx
            d["created_at"] = datetime.utcnow().isoformat()
            self.faqs.append(d)

        # 4. Seed Parts Lifecycle
        for idx, item in enumerate(PARTS_LIFECYCLE_SEEDS, start=1):
            d = dict(item)
            d["id"] = idx
            d["created_at"] = datetime.utcnow().isoformat()
            self.parts_lifecycle.append(d)

        logger.info(f"KnowledgeBaseManager initialized: {len(self.troubleshooting)} TS, {len(self.work_orders)} WO, {len(self.faqs)} FAQ, {len(self.parts_lifecycle)} Parts.")

    # ── Troubleshooting CRUD ──
    def list_troubleshooting(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        if category:
            return [t for t in self.troubleshooting if t.get("category") == category]
        return self.troubleshooting

    def get_troubleshooting(self, item_id: int) -> Optional[Dict[str, Any]]:
        for t in self.troubleshooting:
            if t["id"] == item_id:
                return t
        return None

    def create_troubleshooting(self, item: TroubleshootingItem) -> Dict[str, Any]:
        new_id = max([t["id"] for t in self.troubleshooting], default=0) + 1
        d = item.model_dump()
        d["id"] = new_id
        d["created_at"] = datetime.utcnow().isoformat()
        self.troubleshooting.append(d)
        return d

    # ── Work Orders CRUD ──
    def list_work_orders(self, machine_id: Optional[int] = None) -> List[Dict[str, Any]]:
        if machine_id:
            return [w for w in self.work_orders if w.get("machine_id") == machine_id]
        return self.work_orders

    def get_work_order(self, item_id: int) -> Optional[Dict[str, Any]]:
        for w in self.work_orders:
            if w["id"] == item_id:
                return w
        return None

    def create_work_order(self, item: WorkOrderItem) -> Dict[str, Any]:
        new_id = max([w["id"] for w in self.work_orders], default=0) + 1
        d = item.model_dump()
        d["id"] = new_id
        d["created_at"] = datetime.utcnow().isoformat()
        self.work_orders.append(d)
        return d

    # ── FAQ CRUD ──
    def list_faqs(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        if category:
            return [f for f in self.faqs if f.get("category") == category]
        return self.faqs

    def create_faq(self, item: FAQItem) -> Dict[str, Any]:
        new_id = max([f["id"] for f in self.faqs], default=0) + 1
        d = item.model_dump()
        d["id"] = new_id
        d["created_at"] = datetime.utcnow().isoformat()
        self.faqs.append(d)
        return d

    # ── Parts Lifecycle CRUD ──
    def list_parts_lifecycle(self) -> List[Dict[str, Any]]:
        return self.parts_lifecycle

kb_manager = KnowledgeBaseManager()
