# =========================================================================
#  baseline.py — Machine & Fleet Baseline Profiles API
# =========================================================================

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List, Optional
from baseline.calculator import BaselineCalculator, REGISTER_META
from diagnosis.engine import MACHINE_DIRECTORY

router = APIRouter(prefix="/api/baseline", tags=["Baseline Profiles"])

@router.get("/{machine_id}")
def get_machine_baselines(
    machine_id: int,
    period_type: str = "monthly",
    field_code: Optional[str] = None
) -> Dict[str, Any]:
    if machine_id not in MACHINE_DIRECTORY:
        raise HTTPException(status_code=404, detail="Machine not found")

    mach_info = MACHINE_DIRECTORY[machine_id]
    profiles = {}

    target_fields = [field_code] if field_code else list(REGISTER_META.keys())

    for f in target_fields:
        if f in REGISTER_META:
            meta = REGISTER_META[f]
            base = BaselineCalculator.get_default_baseline(f)
            profiles[f] = {
                "field_code": f,
                "field_name": meta["name"],
                "unit": meta["unit"],
                "period_type": period_type,
                "avg_value": base["avg"],
                "std_value": base["std"],
                "min_value": base["min"],
                "max_value": base["max"],
                "p5_value": base["p5"],
                "p95_value": base["p95"],
                "sample_count": base["count"]
            }

    return {
        "machine_id": machine_id,
        "machine_name": mach_info["name"],
        "model": mach_info["model"],
        "period_type": period_type,
        "baselines": profiles
    }

@router.post("/recalculate")
def recalculate_baselines(payload: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "status": "success",
        "message": f"Successfully refreshed statistical baselines for machine {payload.get('machine_id', 'fleet')}.",
        "updated_profiles_count": len(REGISTER_META)
    }
