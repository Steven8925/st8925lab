# =========================================================================
#  drift_detector.py — Multi-Scale Telemetry Drift & Trend Detector
#  Combines Z-Score deviation, Linear Regression Slope, and CUSUM shift detection
# =========================================================================

import math
from typing import List, Dict, Any, Optional
from baseline.calculator import BaselineCalculator, REGISTER_META
from baseline.cusum import CUSUMDetector

def compute_linear_regression(series: List[float]) -> tuple[float, float]:
    """Computes slope and R-squared in pure python."""
    n = len(series)
    if n < 2:
        return 0.0, 0.0
    x = list(range(n))
    y = [float(v) for v in series]

    x_mean = sum(x) / n
    y_mean = sum(y) / n

    ss_xx = sum((xi - x_mean) ** 2 for xi in x)
    ss_yy = sum((yi - y_mean) ** 2 for yi in y)
    ss_xy = sum((xi - x_mean) * (yi - y_mean) for xi, yi in zip(x, y))

    if ss_xx == 0:
        return 0.0, 0.0

    slope = ss_xy / ss_xx
    r_squared = (ss_xy ** 2) / (ss_xx * ss_yy) if (ss_xx * ss_yy) > 0 else 0.0
    return float(slope), float(r_squared)

class DriftDetector:
    """
    Evaluates current snapshots and short/medium history windows against 
    established statistical baseline profiles.
    """

    @staticmethod
    def analyze_field_drift(
        field_code: str,
        current_value: float,
        recent_series: List[float],
        baseline_avg: float,
        baseline_std: float,
        hours_span: float = 168.0  # 7 days
    ) -> Optional[Dict[str, Any]]:
        meta = REGISTER_META.get(field_code, {"name": field_code, "unit": ""})
        sigma = max(baseline_std, 0.05)
        diff = current_value - baseline_avg
        deviation_pct = round((diff / baseline_avg) * 100, 2) if baseline_avg != 0 else 0.0
        z_score = round(abs(diff) / sigma, 2)

        # 1. Linear Trend Slope Analysis on recent window
        slope = 0.0
        r_squared = 0.0
        if recent_series and len(recent_series) >= 4:
            slope, r_squared = compute_linear_regression(recent_series)

        # 2. CUSUM Evaluation
        cusum_detector = CUSUMDetector(target_mean=baseline_avg, std_dev=sigma)
        cusum_result = cusum_detector.evaluate_series(recent_series if recent_series else [current_value])

        # 3. Decision Logic for Drift Type & Severity
        drift_type = None
        severity = "info"

        # Case A: Persistent upward slope with high confidence
        if slope > 0.003 and r_squared > 0.40:
            drift_type = "gradual_increase"
            severity = "critical" if z_score > 2.5 else "warning" if z_score > 1.4 else "info"

        # Case B: Persistent downward slope (e.g. COP decaying or Low Pressure leak)
        elif slope < -0.003 and r_squared > 0.40:
            drift_type = "gradual_decrease"
            severity = "critical" if z_score > 2.5 else "warning" if z_score > 1.4 else "info"

        # Case C: CUSUM cumulative shift triggered
        elif cusum_result["triggered"]:
            drift_type = "cusum_alert"
            severity = "warning" if z_score > 1.8 else "info"

        # Case D: Instantaneous statistical anomaly (Z-score > 2.0)
        elif z_score >= 2.0:
            drift_type = "sudden_shift"
            severity = "critical" if z_score >= 3.0 else "warning"

        if not drift_type and z_score < 1.4:
            return None  # Within normal variation tolerance

        return {
            "field_code": field_code,
            "field_name": meta["name"],
            "unit": meta["unit"],
            "baseline_avg": round(baseline_avg, 3),
            "baseline_std": round(baseline_std, 3),
            "current_value": round(current_value, 3),
            "deviation_pct": deviation_pct,
            "z_score": z_score,
            "drift_type": drift_type or "statistical_deviation",
            "severity": severity,
            "trend_slope": round(slope, 6),
            "trend_r_squared": round(r_squared, 4),
            "cusum_max": cusum_result.get("cusum_max", 0.0)
        }
