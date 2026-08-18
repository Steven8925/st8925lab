# =========================================================================
#  calculator.py — Statistical Baseline Calculator for IoT Telemetry
#  Computes Moving Average, Standard Deviation, Percentiles and Confidence Intervals
# =========================================================================

import math
from typing import List, Dict, Any, Optional

REGISTER_META = {
    "AAA0028": {"name": "冰水出水溫度", "unit": "°C", "default_avg": 8.20, "default_std": 0.35},
    "AAA0029": {"name": "冰水回水溫度", "unit": "°C", "default_avg": 12.80, "default_std": 0.45},
    "AAA0030": {"name": "冷卻水出水溫度", "unit": "°C", "default_avg": 34.50, "default_std": 0.65},
    "AAA0031": {"name": "冷卻水入水溫度", "unit": "°C", "default_avg": 29.50, "default_std": 0.50},
    "AAA0036": {"name": "冷媒高壓壓力", "unit": "kg/cm²", "default_avg": 15.60, "default_std": 0.45},
    "AAA0037": {"name": "冷媒低壓壓力", "unit": "kg/cm²", "default_avg": 3.80, "default_std": 0.18},
    "AAA0045": {"name": "即時能效 COP", "unit": "", "default_avg": 5.20, "default_std": 0.30},
    "AAA0059": {"name": "實體總功率", "unit": "kW", "default_avg": 78.50, "default_std": 6.50},
}

class BaselineCalculator:
    """Calculates statistical baselines from raw telemetry snapshots or hourly aggregates."""

    @staticmethod
    def compute_from_series(values: List[float]) -> Dict[str, float]:
        cleaned = [float(v) for v in values if v is not None and not math.isnan(float(v))]
        if not cleaned:
            return {"avg": 0.0, "std": 1.0, "min": 0.0, "max": 0.0, "p5": 0.0, "p95": 0.0, "count": 0}

        n = len(cleaned)
        mean_val = sum(cleaned) / n
        variance = sum((x - mean_val) ** 2 for x in cleaned) / n
        std_val = math.sqrt(variance)
        if std_val < 0.001:
            std_val = 0.1  # Avoid zero division

        sorted_arr = sorted(cleaned)
        p5_idx = int(math.floor(0.05 * (n - 1)))
        p95_idx = int(math.ceil(0.95 * (n - 1)))

        return {
            "avg": round(mean_val, 3),
            "std": round(std_val, 3),
            "min": round(sorted_arr[0], 3),
            "max": round(sorted_arr[-1], 3),
            "p5": round(sorted_arr[p5_idx], 3),
            "p95": round(sorted_arr[p95_idx], 3),
            "count": n
        }

    @staticmethod
    def get_default_baseline(field_code: str) -> Dict[str, float]:
        meta = REGISTER_META.get(field_code, {"name": field_code, "unit": "", "default_avg": 10.0, "default_std": 1.0})
        avg = meta["default_avg"]
        std = meta["default_std"]
        return {
            "avg": avg,
            "std": std,
            "min": round(avg - 3 * std, 3),
            "max": round(avg + 3 * std, 3),
            "p5": round(avg - 1.645 * std, 3),
            "p95": round(avg + 1.645 * std, 3),
            "count": 720
        }
