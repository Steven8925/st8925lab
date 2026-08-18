# =========================================================================
#  models.py — Pydantic Schemas & DTOs for AI Diagnostic Knowledge Base
# =========================================================================

from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field

# ── Baseline Models ──
class BaselineProfile(BaseModel):
    id: Optional[int] = None
    machine_id: Optional[int] = None
    model: Optional[str] = None
    field_code: str
    period_type: str = "monthly"  # "weekly" | "monthly" | "quarterly"
    avg_value: float
    std_value: float
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    sample_count: int
    calculated_at: Optional[datetime] = None

class BaselineRecalculateRequest(BaseModel):
    machine_id: Optional[int] = None
    period_type: str = "monthly"

# ── Drift Event Models ──
class DriftEvent(BaseModel):
    id: Optional[int] = None
    machine_id: int
    field_code: str
    field_name: Optional[str] = None
    drift_type: str
    baseline_value: float
    current_value: float
    deviation_pct: float
    severity: str = "warning"  # "info" | "warning" | "critical"
    trend_slope: Optional[float] = None
    trend_r_squared: Optional[float] = None
    cusum_value: Optional[float] = None
    sensor_snapshot: Optional[Dict[str, Any]] = None
    detected_at: Optional[datetime] = None
    is_resolved: bool = False
    resolved_at: Optional[datetime] = None
    resolution_note: Optional[str] = None

class DriftCheckRequest(BaseModel):
    machine_id: int
    current_data: Dict[str, Any]

# ── Knowledge Base Models ──
class TroubleshootingItem(BaseModel):
    id: Optional[int] = None
    symptom_code: str
    symptom_desc: str
    possible_causes: List[Dict[str, Any]]
    recommended_actions: List[Dict[str, Any]]
    applicable_models: Optional[List[str]] = None
    severity: str = "medium"
    category: str = "thermal"
    related_alarm_codes: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    created_at: Optional[datetime] = None

class WorkOrderItem(BaseModel):
    id: Optional[int] = None
    machine_id: Optional[int] = None
    work_order_no: str
    fault_phenomenon: str
    root_cause: Optional[str] = None
    repair_actions: str
    parts_replaced: Optional[List[Dict[str, Any]]] = None
    labor_hours: Optional[float] = None
    downtime_hours: Optional[float] = None
    technician_name: Optional[str] = None
    repair_date: str
    alarm_codes: Optional[List[str]] = None
    symptom_codes: Optional[List[str]] = None
    effectiveness: str = "resolved"
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

class FAQItem(BaseModel):
    id: Optional[int] = None
    question: str
    answer: str
    category: str
    applicable_models: Optional[List[str]] = None
    source: str = "field_experience"
    tags: Optional[List[str]] = None
    created_at: Optional[datetime] = None

class PartLifecycleItem(BaseModel):
    id: Optional[int] = None
    part_name: str
    part_category: str
    expected_life_hours: int
    warning_threshold_hours: int
    expected_life_years: Optional[float] = None
    applicable_models: Optional[List[str]] = None
    pm_interval_desc: Optional[str] = None
    replacement_procedure: Optional[str] = None
    estimated_cost_range: Optional[str] = None
    failure_symptoms: Optional[List[str]] = None
    created_at: Optional[datetime] = None

class KBSearchRequest(BaseModel):
    query: str
    top_k: int = 5
    tables: Optional[List[str]] = ["troubleshooting", "work_orders", "faq", "parts"]

# ── AI Diagnosis Models ──
class DiagnosisRequest(BaseModel):
    machine_id: int
    trigger_type: str = "drift_event"  # "drift_event" | "alarm" | "manual"
    trigger_event_id: Optional[int] = None
    symptom_description: Optional[str] = None
    sensor_snapshot: Optional[Dict[str, Any]] = None

class DiagnosticReport(BaseModel):
    id: Optional[int] = None
    machine_id: int
    report_type: str
    trigger_event_id: Optional[int] = None
    trigger_source: Optional[str] = None
    diagnosis_summary: str
    possible_causes: List[Dict[str, Any]]
    recommended_actions: List[Dict[str, Any]]
    further_checks: Optional[List[Dict[str, Any]]] = None
    risk_assessment: Optional[Dict[str, Any]] = None
    confidence_score: float = 0.85
    llm_model_used: Optional[str] = None
    llm_tokens_used: Optional[int] = None
    rag_context_used: Optional[List[Dict[str, Any]]] = None
    sensor_snapshot: Dict[str, Any]
    created_at: Optional[datetime] = None

# ── Health Report & Overview Models ──
class MachineHealthSummary(BaseModel):
    machine_id: int
    name: str
    model: str
    device_type: str
    company_id: int
    health_score: int
    status: str  # "healthy" | "warning" | "critical"
    active_drifts: int
    active_alarms: int
    latest_diagnosis: Optional[Dict[str, Any]] = None
    trend_sparkline: List[float] = []
