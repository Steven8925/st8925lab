# =========================================================================
#  retriever.py — RAG Semantic Knowledge Retriever
#  Searches across Troubleshooting Decision Trees, Work Orders, and FAQs
# =========================================================================

import logging
import math
from typing import List, Dict, Any
from knowledge_base.manager import kb_manager
from knowledge_base.embedder import get_embedding_provider

logger = logging.getLogger("AI_KB_Retriever")

def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    norm_a = math.sqrt(sum(a * a for a in vec1))
    norm_b = math.sqrt(sum(b * b for b in vec2))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot_product / (norm_a * norm_b))

class KnowledgeRetriever:
    def __init__(self):
        self.embedder = get_embedding_provider()

    async def search(self, query: str, top_k: int = 5, tables: List[str] = None) -> List[Dict[str, Any]]:
        if tables is None:
            tables = ["troubleshooting", "work_orders", "faq", "parts"]

        query_emb = (await self.embedder.embed_texts([query]))[0]
        results = []

        # 1. Search Troubleshooting
        if "troubleshooting" in tables:
            for item in kb_manager.list_troubleshooting():
                text_repr = f"{item['symptom_code']} {item['symptom_desc']} {' '.join(item.get('tags', []))} {str(item.get('possible_causes', []))}"
                item_emb = (await self.embedder.embed_texts([text_repr]))[0]
                score = cosine_similarity(query_emb, item_emb)
                # Boost if exact keyword match
                for word in query.replace(" ", "").split():
                    if word in item['symptom_desc'] or word in item['symptom_code']:
                        score = min(1.0, score + 0.15)

                results.append({
                    "source_table": "kb_troubleshooting",
                    "id": item["id"],
                    "title": item["symptom_code"],
                    "subtitle": item["symptom_desc"],
                    "relevance_score": round(score, 3),
                    "data": item
                })

        # 2. Search Work Orders
        if "work_orders" in tables:
            for item in kb_manager.list_work_orders():
                text_repr = f"{item['work_order_no']} {item['fault_phenomenon']} {item.get('root_cause', '')} {item['repair_actions']}"
                item_emb = (await self.embedder.embed_texts([text_repr]))[0]
                score = cosine_similarity(query_emb, item_emb)
                results.append({
                    "source_table": "kb_work_orders",
                    "id": item["id"],
                    "title": item["work_order_no"],
                    "subtitle": item["fault_phenomenon"][:80] + "...",
                    "relevance_score": round(score, 3),
                    "data": item
                })

        # 3. Search FAQs
        if "faq" in tables:
            for item in kb_manager.list_faqs():
                text_repr = f"{item['question']} {item['answer']} {' '.join(item.get('tags', []))}"
                item_emb = (await self.embedder.embed_texts([text_repr]))[0]
                score = cosine_similarity(query_emb, item_emb)
                results.append({
                    "source_table": "kb_faq",
                    "id": item["id"],
                    "title": item["question"],
                    "subtitle": item["answer"][:80] + "...",
                    "relevance_score": round(score, 3),
                    "data": item
                })

        # Sort by relevance descending
        results.sort(key=lambda x: x["relevance_score"], reverse=True)
        return results[:top_k]

retriever = KnowledgeRetriever()
