# =========================================================================
#  drift.py — Multi-Scale Telemetry Drift Events API
# =========================================================================

from fastapi import APIRouter
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from db.models import DriftCheckRequest
from baseline.calculator import REGISTER_META
from baseline.drift_detector import DriftDetector

router = APIRouter(prefix="/api/drift", tags=["Drift & Trend Detection"])

# Simulated initial drift events for demo
MOCK_DRIFTS = [
    {
        "id": 101,
        "machine_id": 15,
        "field_code": "AAA0030",
        "field_name": "冷卻水出水溫度",
        "unit": "°C",
        "drift_type": "gradual_increase",
        "baseline_value": 34.50,
        "current_value": 35.80,
        "deviation_pct": 3.77,
        "severity": "warning",
        "trend_slope": 0.00512,
        "trend_r_squared": 0.88,
        "cusum_value": 4.82,
        "detected_at": (datetime.utcnow() - timedelta(hours=3)).isoformat(),
        "is_resolved": False
    },
    {
        "id": 102,
        "machine_id": 6,
        "field_code": "AAA0037",
        "field_name": "冷媒低壓壓力",
        "unit": "kg/cm²",
        "drift_type": "gradual_decrease",
        "baseline_value": 3.80,
        "current_value": 2.45,
        "deviation_pct": -35.53,
        "severity": "critical",
        "trend_slope": -0.00645,
        "trend_r_squared": 0.94,
        "cusum_value": 6.15,
        "detected_at": (datetime.utcnow() - timedelta(hours=1)).isoformat(),
        "is_resolved": False
    },
    {
        "id": 103,
        "machine_id": 23,
        "field_code": "AAA0028",
        "field_name": "冰水出水溫度",
        "unit": "°C",
        "drift_type": "gradual_increase",
        "baseline_value": 8.20,
        "current_value": 8.95,
        "deviation_pct": 9.15,
        "severity": "warning",
        "trend_slope": 0.00380,
        "trend_r_squared": 0.76,
        "cusum_value": 3.90,
        "detected_at": (datetime.utcnow() - timedelta(hours=8)).isoformat(),
        "is_resolved": False
    }
]

@router.get("/{machine_id}")
def get_machine_drifts(machine_id: int, is_resolved: Optional[bool] = None) -> List[Dict[str, Any]]:
    results = [d for d in MOCK_DRIFTS if d["machine_id"] == machine_id]
    if is_resolved is not None:
        results = [d for d in results if d["is_resolved"] == is_resolved]
    return results

@router.get("/all/active")
def get_all_active_drifts() -> List[Dict[str, Any]]:
    return [d for d in MOCK_DRIFTS if not d["is_resolved"]]

@router.post("/check")
def check_data_drift(req: DriftCheckRequest) -> Dict[str, Any]:
    detected = []
    data = req.current_data

    for f, meta in REGISTER_META.items():
        if f in data:
            val = float(data[f])
            res = DriftDetector.analyze_field_drift(
                field_code=f,
                current_value=val,
                recent_series=[val - 0.1, val, val + 0.1, val],
                baseline_avg=meta["default_avg"],
                baseline_std=meta["default_std"]
            )
            if res:
                detected.append(res)

    return {
        "machine_id": req.machine_id,
        "checked_at": datetime.utcnow().isoformat(),
        "drifts_detected_count": len(detected),
        "drifts": detected
    }
