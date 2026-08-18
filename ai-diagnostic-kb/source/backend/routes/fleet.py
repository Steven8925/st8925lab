# =========================================================================
#  fleet.py — Fleet Overview & Health Summaries API
# =========================================================================

from fastapi import APIRouter
from typing import Dict, Any, List
from diagnosis.engine import MACHINE_DIRECTORY, diagnostic_engine
from baseline.calculator import REGISTER_META

router = APIRouter(prefix="/api/fleet", tags=["Fleet Overview"])

@router.get("/overview")
def get_fleet_overview() -> Dict[str, Any]:
    healthy_count = 0
    warning_count = 0
    critical_count = 0
    machines_res = []

    for m_id, info in MACHINE_DIRECTORY.items():
        # Machine 15 has condenser degradation -> warning
        # Machine 6 has leak -> critical
        # Machine 23 has evaporator scaling -> warning
        # Others normal
        if m_id == 6:
            status = "critical"
            health_score = 62
            active_drifts = 1
            active_alarms = 1
            critical_count += 1
            sparkline = [8.2, 8.3, 8.4, 8.6, 8.8, 9.1, 9.4]
        elif m_id == 15:
            status = "warning"
            health_score = 78
            active_drifts = 1
            active_alarms = 0
            warning_count += 1
            sparkline = [34.2, 34.4, 34.6, 34.9, 35.2, 35.5, 35.8]
        elif m_id == 23:
            status = "warning"
            health_score = 81
            active_drifts = 1
            active_alarms = 0
            warning_count += 1
            sparkline = [8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.9]
        else:
            status = "healthy"
            health_score = 95 + (m_id % 5)
            active_drifts = 0
            active_alarms = 0
            healthy_count += 1
            sparkline = [8.1, 8.2, 8.1, 8.3, 8.2, 8.15, 8.2]

        latest_diag = None
        history = diagnostic_engine.get_machine_history(m_id, limit=1)
        if history:
            latest_diag = {
                "id": history[0]["id"],
                "summary": history[0]["diagnosis_summary"],
                "created_at": history[0]["created_at"]
            }

        machines_res.append({
            "machine_id": m_id,
            "name": info["name"],
            "model": info["model"],
            "type": info["type"],
            "capacity_rt": info["capacity_rt"],
            "health_score": health_score,
            "status": status,
            "active_drifts": active_drifts,
            "active_alarms": active_alarms,
            "latest_diagnosis": latest_diag,
            "trend_sparkline": sparkline
        })

    # Sort critical first, then warning, then healthy
    severity_order = {"critical": 0, "warning": 1, "healthy": 2}
    machines_res.sort(key=lambda x: (severity_order.get(x["status"], 3), -x["health_score"]))

    return {
        "total_machines": len(MACHINE_DIRECTORY),
        "status_counts": {
            "healthy": healthy_count,
            "warning": warning_count,
            "critical": critical_count
        },
        "machines": machines_res
    }
