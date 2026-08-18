# =========================================================================
#  cusum.py — Cumulative Sum (CUSUM) Quality Control & Drift Detector
#  Identifies small, persistent shifts in telemetry baseline mean values
# =========================================================================

from typing import List, Dict, Any, Tuple
import numpy as np

class CUSUMDetector:
    """
    Two-sided Tabular CUSUM algorithm for detecting shifts in mean.
    S_hi = max(0, S_hi[i-1] + (x_i - (mu + k)))
    S_lo = max(0, S_lo[i-1] + ((mu - k) - x_i))
    """
    def __init__(self, target_mean: float, std_dev: float, k_factor: float = 0.5, h_factor: float = 4.5):
        self.mu = target_mean
        self.sigma = max(std_dev, 0.001)
        self.k = k_factor * self.sigma  # Reference value / slack
        self.h = h_factor * self.sigma  # Decision interval threshold

    def evaluate_series(self, values: List[float]) -> Dict[str, Any]:
        if not values or len(values) < 3:
            return {"triggered": False, "type": "none", "cusum_max": 0.0, "threshold": self.h, "shift_point": None}

        s_hi = 0.0
        s_lo = 0.0
        s_hi_series = []
        s_lo_series = []
        shift_idx = None
        triggered_type = "none"

        for idx, x in enumerate(values):
            s_hi = max(0.0, s_hi + (x - self.mu - self.k))
            s_lo = max(0.0, s_lo + (self.mu - self.k - x))
            s_hi_series.append(s_hi)
            s_lo_series.append(s_lo)

            if s_hi > self.h and triggered_type == "none":
                triggered_type = "upward_shift"
                shift_idx = idx
            elif s_lo > self.h and triggered_type == "none":
                triggered_type = "downward_shift"
                shift_idx = idx

        max_cusum = max(max(s_hi_series), max(s_lo_series)) if s_hi_series else 0.0

        return {
            "triggered": triggered_type != "none",
            "type": triggered_type,
            "cusum_max": round(float(max_cusum), 3),
            "threshold": round(float(self.h), 3),
            "shift_index": shift_idx,
            "s_hi_last": round(float(s_hi), 3),
            "s_lo_last": round(float(s_lo), 3)
        }
