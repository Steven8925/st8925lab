# =========================================================================
#  engine.py — Core AI Predictive Diagnosis Engine
#  Orchestrates Baseline Fetching, RAG Retrieval, LLM Inference and Report Generation
# =========================================================================

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from db.models import DiagnosisRequest, DiagnosticReport
from diagnosis.llm_provider import get_llm_provider
from diagnosis.prompt_templates import SYSTEM_DIAGNOSIS_PROMPT, USER_DIAGNOSIS_TEMPLATE
from knowledge_base.retriever import retriever
from baseline.calculator import BaselineCalculator, REGISTER_META
from baseline.drift_detector import DriftDetector

logger = logging.getLogger("AI_KB_Engine")

MACHINE_DIRECTORY = {
    15: {"name": "A區智慧園區-南區1號冰水主機", "model": "ECO-100RT", "capacity_rt": 100.0, "type": "chiller"},
    16: {"name": "A區智慧園區-南區1號冷卻水塔", "model": "CT-120", "capacity_rt": 120.0, "type": "tower"},
    17: {"name": "A區智慧園區-南區2號冰水主機", "model": "ECO-100RT", "capacity_rt": 100.0, "type": "chiller"},
    18: {"name": "A區智慧園區-南區2號冷卻水塔", "model": "CT-120", "capacity_rt": 120.0, "type": "tower"},
    19: {"name": "A區智慧園區-北區1號冰水主機", "model": "ECO-100RT", "capacity_rt": 100.0, "type": "chiller"},
    20: {"name": "A區智慧園區-北區1號冷卻水塔", "model": "CT-120", "capacity_rt": 120.0, "type": "tower"},
    21: {"name": "A區智慧園區-北區2號冰水主機", "model": "ECO-100RT", "capacity_rt": 100.0, "type": "chiller"},
    22: {"name": "A區智慧園區-北區2號冷卻水塔", "model": "CT-120", "capacity_rt": 120.0, "type": "tower"},
    5:  {"name": "B區醫療中心-急重症1號主機", "model": "MED-200RT", "capacity_rt": 200.0, "type": "chiller"},
    7:  {"name": "C區金融總部-大樓1號主機", "model": "FIN-80RT", "capacity_rt": 80.0, "type": "chiller"},
    8:  {"name": "C區金融總部-大樓2號主機", "model": "FIN-80RT", "capacity_rt": 80.0, "type": "chiller"},
    6:  {"name": "D區科技園區-晶圓一廠8號機", "model": "SEMI-150RT", "capacity_rt": 150.0, "type": "chiller"},
    12: {"name": "D區科技園區-封裝二廠主機", "model": "SEMI-150RT", "capacity_rt": 150.0, "type": "chiller"},
    13: {"name": "D區科技園區-研發總部主機", "model": "SEMI-150RT", "capacity_rt": 150.0, "type": "chiller"},
    11: {"name": "E區研究醫院-研究棟2號主機", "model": "HOSP-250RT", "capacity_rt": 250.0, "type": "chiller"},
    14: {"name": "E區研究醫院-門診棟3號主機", "model": "HOSP-250RT", "capacity_rt": 250.0, "type": "chiller"},
    23: {"name": "F區生醫大樓-一號醫療主機", "model": "BIO-300RT", "capacity_rt": 300.0, "type": "chiller"},
    24: {"name": "F區生醫大樓-二號醫療主機", "model": "BIO-300RT", "capacity_rt": 300.0, "type": "chiller"},
    9:  {"name": "G區精密製造-產線50RT主機", "model": "MFG-50RT", "capacity_rt": 50.0, "type": "chiller"},
    10: {"name": "G區精密製造-產線100RT主機", "model": "MFG-100RT", "capacity_rt": 100.0, "type": "chiller"},
    4:  {"name": "H區綠能廠辦-示範1號主機", "model": "GRN-60RT", "capacity_rt": 60.0, "type": "chiller"}
}

class DiagnosticEngine:
    def __init__(self):
        self.reports_history: List[Dict[str, Any]] = []
        self._init_demo_reports()

    def _init_demo_reports(self):
        # Add initial demo diagnosis report for Machine 15
        self.reports_history.append({
            "id": 1,
            "machine_id": 15,
            "report_type": "drift_analysis",
            "trigger_event_id": 101,
            "trigger_source": "drift_event",
            "diagnosis_summary": "A區智慧園區南區1號機冷卻水出水溫度 (AAA0030) 持續偏高達到 35.8°C，偏離基線 +2.0σ，呈現每日 +0.05°C 漸進上升趨勢。結合知識庫分析，最可能原因為冷卻水塔散熱片結垢及水泵過濾器壓差偏高，建議於 72 小時內執行散熱片高壓清洗。",
            "possible_causes": [
                {
                    "rank": 1,
                    "cause": "冷卻水塔散熱片結垢或生物膜沈積 (Cooling Tower Fill Scale)",
                    "probability": "高 (65%)",
                    "reasoning": "冷卻水出入水溫差縮小且出水溫度連續一週線性上升。"
                },
                {
                    "rank": 2,
                    "cause": "冷卻水泵入出口 Y 型過濾網堵塞 (Strainer Clogged)",
                    "probability": "中 (25%)",
                    "reasoning": "循環水流量受阻導致冷凝熱排斥效率降低。"
                }
            ],
            "recommended_actions": [
                {
                    "priority": 1,
                    "action": "目視檢查冷卻水塔散熱片表面污垢並實施高壓水柱清洗。",
                    "estimated_time": "30 分鐘",
                    "urgency": "immediate"
                },
                {
                    "priority": 2,
                    "action": "拆卸清潔冷卻水泵 Y 型過濾網不鏽鋼濾芯。",
                    "estimated_time": "45 分鐘",
                    "urgency": "soon"
                }
            ],
            "further_checks": [
                {"check": "量測冷卻水塔風扇馬達電流與皮帶張力", "purpose": "排除皮帶打滑"}
            ],
            "risk_assessment": {
                "current_risk": "medium",
                "if_unresolved": "若未即時清洗，預計 3 天內冷媒高壓將突破 18.0 kg/cm² 觸發保護跳脫停機。",
                "estimated_escalation_time": "72 小時內"
            },
            "confidence_score": 0.92,
            "llm_model_used": "gemini-1.5-flash",
            "rag_context_used": [
                {"source_table": "kb_troubleshooting", "title": "HIGH_COND_LEAVING_TEMP", "relevance": 0.95},
                {"source_table": "kb_work_orders", "title": "WO-2026-0801", "relevance": 0.91}
            ],
            "sensor_snapshot": {
                "AAA0001": 1, "AAA0028": 8.5, "AAA0029": 13.1, "AAA0030": 35.8,
                "AAA0031": 30.2, "AAA0036": 16.9, "AAA0037": 3.7, "AAA0042": 12850,
                "AAA0045": 4.6, "AAA0059": 84.2
            },
            "created_at": datetime.utcnow().isoformat()
        })

    async def run_diagnosis(self, req: DiagnosisRequest) -> Dict[str, Any]:
        mach_info = MACHINE_DIRECTORY.get(req.machine_id, {
            "name": f"機組 #{req.machine_id}", "model": "ECO-100RT", "capacity_rt": 100.0, "type": "chiller"
        })

        snapshot = req.sensor_snapshot or {
            "AAA0001": 1, "AAA0028": 8.4, "AAA0029": 13.0, "AAA0030": 35.5,
            "AAA0031": 30.0, "AAA0036": 16.8, "AAA0037": 3.7, "AAA0042": 12850,
            "AAA0045": 4.8, "AAA0059": 82.0
        }

        # 1. Evaluate Drifts across registers
        drifts = []
        for f, meta in REGISTER_META.items():
            val = float(snapshot.get(f, meta["default_avg"]))
            d = DriftDetector.analyze_field_drift(
                field_code=f,
                current_value=val,
                recent_series=[val - 0.2, val - 0.1, val, val + 0.1, val],
                baseline_avg=meta["default_avg"],
                baseline_std=meta["default_std"]
            )
            if d:
                drifts.append(d)

        primary_drift = drifts[0] if drifts else {
            "field_code": "AAA0030", "field_name": "冷卻水出水溫度", "unit": "°C",
            "baseline_avg": 34.5, "baseline_std": 0.65, "current_value": snapshot.get("AAA0030", 35.5),
            "deviation_pct": 2.9, "z_score": 1.54, "drift_type": "gradual_increase",
            "trend_slope": 0.004, "severity": "warning"
        }

        # 2. RAG Retrieval based on drift description
        query_text = f"{primary_drift['field_name']} {primary_drift['drift_type']} {mach_info['model']} 結垢 洩漏"
        rag_hits = await retriever.search(query=query_text, top_k=4)

        rag_ts_text = ""
        rag_wo_text = ""
        rag_faq_text = ""
        rag_refs = []

        for hit in rag_hits:
            rag_refs.append({
                "source_table": hit["source_table"],
                "id": hit["id"],
                "title": hit["title"],
                "relevance": hit["relevance_score"]
            })
            if hit["source_table"] == "kb_troubleshooting":
                rag_ts_text += f"- [{hit['title']}] {hit['subtitle']}\n"
            elif hit["source_table"] == "kb_work_orders":
                rag_wo_text += f"- [{hit['title']}] {hit['subtitle']}\n"
            elif hit["source_table"] == "kb_faq":
                rag_faq_text += f"- [Q: {hit['title']}] A: {hit['subtitle']}\n"

        # 3. Assemble Prompts
        sensor_fmt = "\n".join([f"- {k} ({REGISTER_META.get(k, {}).get('name', k)}): {v} {REGISTER_META.get(k, {}).get('unit', '')}" for k, v in snapshot.items()])
        user_prompt = USER_DIAGNOSIS_TEMPLATE.format(
            machine_name=mach_info["name"],
            machine_id=req.machine_id,
            model=mach_info["model"],
            capacity_rt=mach_info["capacity_rt"],
            run_hours=snapshot.get("AAA0042", 12850),
            trigger_type=req.trigger_type,
            field_name=primary_drift["field_name"],
            field_code=primary_drift["field_code"],
            baseline_avg=primary_drift["baseline_avg"],
            baseline_std=primary_drift["baseline_std"],
            unit=primary_drift["unit"],
            current_value=primary_drift["current_value"],
            deviation_pct=primary_drift["deviation_pct"],
            z_score=primary_drift["z_score"],
            trend_slope=primary_drift["trend_slope"],
            drift_type=primary_drift["drift_type"],
            sensor_snapshot_formatted=sensor_fmt,
            rag_troubleshooting=rag_ts_text or "無直接匹配條目",
            rag_work_orders=rag_wo_text or "無直接歷史工單",
            rag_faq=rag_faq_text or "無相關 FAQ"
        )

        # 4. LLM Generation
        llm = get_llm_provider()
        diag_output = await llm.generate_json_diagnosis(SYSTEM_DIAGNOSIS_PROMPT, user_prompt)

        new_id = max([r["id"] for r in self.reports_history], default=0) + 1
        report = {
            "id": new_id,
            "machine_id": req.machine_id,
            "report_type": req.trigger_type,
            "trigger_event_id": req.trigger_event_id,
            "trigger_source": req.trigger_type,
            "diagnosis_summary": diag_output.get("diagnosis_summary", "診斷完成"),
            "possible_causes": diag_output.get("possible_causes", []),
            "recommended_actions": diag_output.get("recommended_actions", []),
            "further_checks": diag_output.get("further_checks", []),
            "risk_assessment": diag_output.get("risk_assessment", {}),
            "confidence_score": diag_output.get("confidence_score", 0.88),
            "llm_model_used": "gemini-1.5-flash",
            "rag_context_used": rag_refs,
            "sensor_snapshot": snapshot,
            "created_at": datetime.utcnow().isoformat()
        }

        self.reports_history.insert(0, report)
        if len(self.reports_history) > 100:
            self.reports_history.pop()

        return report

    def get_report(self, report_id: int) -> Optional[Dict[str, Any]]:
        for r in self.reports_history:
            if r["id"] == report_id:
                return r
        return None

    def get_machine_history(self, machine_id: int, limit: int = 10) -> List[Dict[str, Any]]:
        res = [r for r in self.reports_history if r["machine_id"] == machine_id]
        return res[:limit]

diagnostic_engine = DiagnosticEngine()
