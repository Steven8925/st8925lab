# =========================================================================
#  health_report.py — Comprehensive Single-Machine Health Diagnostics API
# =========================================================================

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from diagnosis.engine import MACHINE_DIRECTORY, diagnostic_engine
from baseline.calculator import BaselineCalculator, REGISTER_META
from knowledge_base.manager import kb_manager
from routes.drift import MOCK_DRIFTS

router = APIRouter(prefix="/api/health-report", tags=["Comprehensive Health Report"])

@router.get("/{machine_id}")
def get_machine_health_report(machine_id: int) -> Dict[str, Any]:
    if machine_id not in MACHINE_DIRECTORY:
        raise HTTPException(status_code=404, detail="Machine not found")

    mach_info = MACHINE_DIRECTORY[machine_id]

    # Current snapshot
    if machine_id == 15:
        curr_data = {
            "AAA0001": 1, "AAA0028": 8.5, "AAA0029": 13.1, "AAA0030": 35.8,
            "AAA0031": 30.2, "AAA0036": 16.9, "AAA0037": 3.7, "AAA0042": 12850,
            "AAA0045": 4.6, "AAA0059": 84.2
        }
        health_score = 78
    elif machine_id == 6:
        curr_data = {
            "AAA0001": 1, "AAA0028": 9.2, "AAA0029": 13.6, "AAA0030": 34.0,
            "AAA0031": 29.5, "AAA0036": 13.8, "AAA0037": 2.45, "AAA0042": 15200,
            "AAA0045": 3.8, "AAA0059": 79.0
        }
        health_score = 62
    else:
        curr_data = {
            "AAA0001": 1, "AAA0028": 8.2, "AAA0029": 12.8, "AAA0030": 34.5,
            "AAA0031": 29.5, "AAA0036": 15.6, "AAA0037": 3.8, "AAA0042": 11400,
            "AAA0045": 5.2, "AAA0059": 78.5
        }
        health_score = 96

    # Baseline comparison
    baseline_comparisons = []
    for f, meta in REGISTER_META.items():
        val = curr_data.get(f, meta["default_avg"])
        base_avg = meta["default_avg"]
        base_std = meta["default_std"]
        diff = val - base_avg
        sigma = diff / base_std
        status = "critical" if abs(sigma) > 3.0 else "warning" if abs(sigma) > 1.8 else "normal"

        baseline_comparisons.append({
            "field_code": f,
            "field_name": meta["name"],
            "unit": meta["unit"],
            "baseline_avg": base_avg,
            "baseline_std": base_std,
            "current_value": val,
            "deviation_pct": round((diff / base_avg) * 100, 2) if base_avg != 0 else 0.0,
            "deviation_sigma": round(sigma, 2),
            "status": status
        })

    # Drifts & Work Orders
    machine_drifts = [d for d in MOCK_DRIFTS if d["machine_id"] == machine_id]
    machine_wo = kb_manager.list_work_orders(machine_id=machine_id)
    recent_diagnoses = diagnostic_engine.get_machine_history(machine_id, limit=5)

    # Parts Lifecycle Maintenance check
    overdue_parts = []
    upcoming_pm = []
    for p in kb_manager.list_parts_lifecycle():
        run_h = curr_data.get("AAA0042", 12000)
        life_rem = max(0, p["expected_life_hours"] - (run_h % p["expected_life_hours"]))
        p_status = {
            "part_name": p["part_name"],
            "expected_life_hours": p["expected_life_hours"],
            "current_cycle_hours": run_h % p["expected_life_hours"],
            "remaining_hours": life_rem,
            "pm_interval_desc": p["pm_interval_desc"]
        }
        if life_rem <= 500:
            overdue_parts.append(p_status)
        else:
            upcoming_pm.append(p_status)

    return {
        "machine": {
            "id": machine_id,
            "name": mach_info["name"],
            "model": mach_info["model"],
            "capacity_rt": mach_info["capacity_rt"],
            "type": mach_info["type"],
            "run_hours": curr_data.get("AAA0042", 12850)
        },
        "health_score": health_score,
        "status": "critical" if health_score < 70 else "warning" if health_score < 85 else "healthy",
        "current_snapshot": curr_data,
        "baseline_comparison": baseline_comparisons,
        "active_drifts": machine_drifts,
        "recent_diagnoses": recent_diagnoses,
        "maintenance_status": {
            "overdue_parts": overdue_parts,
            "upcoming_pm": upcoming_pm[:4]
        },
        "recent_work_orders": machine_wo
    }
