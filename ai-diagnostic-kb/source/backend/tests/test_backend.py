# =========================================================================
#  test_backend.py — Backend Integration and Logic Verification Tests
# =========================================================================

import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    import pytest
except ImportError:
    pytest = None

from baseline.calculator import BaselineCalculator
from baseline.cusum import CUSUMDetector
from baseline.drift_detector import DriftDetector
from knowledge_base.manager import kb_manager
from knowledge_base.retriever import retriever
from diagnosis.engine import diagnostic_engine
from db.models import DiagnosisRequest

def test_baseline_calculator():
    series = [8.1, 8.2, 8.3, 8.2, 8.1, 8.4, 8.2]
    res = BaselineCalculator.compute_from_series(series)
    assert res["count"] == 7
    assert 8.1 <= res["avg"] <= 8.3
    assert res["std"] > 0

def test_cusum_detector():
    baseline_avg = 34.5
    baseline_std = 0.65
    detector = CUSUMDetector(target_mean=baseline_avg, std_dev=baseline_std)
    
    # Rising series indicating shift
    rising_series = [34.5, 34.8, 35.1, 35.4, 35.8, 36.2, 36.5]
    res = detector.evaluate_series(rising_series)
    assert res["triggered"] is True
    assert res["type"] == "upward_shift"

def test_drift_detector():
    res = DriftDetector.analyze_field_drift(
        field_code="AAA0030",
        current_value=36.0,
        recent_series=[34.6, 34.9, 35.2, 35.5, 35.8, 36.0],
        baseline_avg=34.5,
        baseline_std=0.65
    )
    assert res is not None
    assert res["drift_type"] == "gradual_increase"
    assert res["severity"] in ["warning", "critical"]

def test_knowledge_base_seeded():
    ts = kb_manager.list_troubleshooting()
    wo = kb_manager.list_work_orders()
    faq = kb_manager.list_faqs()
    parts = kb_manager.list_parts_lifecycle()

    assert len(ts) >= 10
    assert len(wo) >= 5
    assert len(faq) >= 5
    assert len(parts) >= 5

def async_test(f):
    if pytest and hasattr(pytest, 'mark'):
        return pytest.mark.asyncio(f)
    return f

@async_test
async def test_rag_retriever():
    results = await retriever.search(query="冷卻水出水溫度偏高 散熱片結垢", top_k=3)
    assert len(results) > 0
    assert results[0]["relevance_score"] > 0

@async_test
async def test_diagnostic_engine_flow():
    req = DiagnosisRequest(
        machine_id=15,
        trigger_type="drift_event",
        sensor_snapshot={
            "AAA0001": 1, "AAA0028": 8.5, "AAA0030": 35.8, "AAA0036": 16.9,
            "AAA0042": 12850, "AAA0045": 4.6, "AAA0059": 84.2
        }
    )
    report = await diagnostic_engine.run_diagnosis(req)
    assert report["machine_id"] == 15
    assert "diagnosis_summary" in report
    assert len(report["possible_causes"]) > 0
    assert len(report["recommended_actions"]) > 0

if __name__ == "__main__":
    print("Running backend tests...")
    test_baseline_calculator()
    print("  [PASS] test_baseline_calculator")
    test_cusum_detector()
    print("  [PASS] test_cusum_detector")
    test_drift_detector()
    print("  [PASS] test_drift_detector")
    test_knowledge_base_seeded()
    print("  [PASS] test_knowledge_base_seeded")
    asyncio.run(test_rag_retriever())
    print("  [PASS] test_rag_retriever")
    asyncio.run(test_diagnostic_engine_flow())
    print("  [PASS] test_diagnostic_engine_flow")
    print("=== ALL 6 BACKEND TESTS PASSED ===")

