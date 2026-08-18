# =========================================================================
#  diagnosis.py — AI Diagnostic Reports API
# =========================================================================

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List, Optional
from db.models import DiagnosisRequest
from diagnosis.engine import diagnostic_engine

router = APIRouter(prefix="/api/diagnosis", tags=["AI Diagnosis"])

@router.post("")
async def create_diagnosis(req: DiagnosisRequest) -> Dict[str, Any]:
    report = await diagnostic_engine.run_diagnosis(req)
    return report

@router.get("/{report_id}")
def get_diagnosis_report(report_id: int) -> Dict[str, Any]:
    report = diagnostic_engine.get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Diagnostic report not found")
    return report

@router.get("/history/{machine_id}")
def get_machine_diagnosis_history(machine_id: int, limit: int = 10) -> List[Dict[str, Any]]:
    return diagnostic_engine.get_machine_history(machine_id, limit=limit)

@router.get("/for-alarm/{alarm_record_id}")
async def get_diagnosis_for_alarm(alarm_record_id: int) -> Dict[str, Any]:
    # Synthesize diagnosis on demand for external alarm-notification integration
    req = DiagnosisRequest(
        machine_id=15,
        trigger_type="alarm",
        trigger_event_id=alarm_record_id
    )
    return await diagnostic_engine.run_diagnosis(req)
