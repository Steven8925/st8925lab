# =========================================================================
#  history_generator.py — 3-Month Synthetic Fleet Telemetry Generator
#  Simulates 21 machines across Normal, Gradual Degradation, and Sudden Fault phases
# =========================================================================

import math
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any

class FleetHistoryGenerator:
    def __init__(self):
        pass

    @staticmethod
    def generate_machine_timeline(
        machine_id: int,
        days: int = 90,
        sample_interval_hours: float = 1.0
    ) -> List[Dict[str, Any]]:
        """
        Generates simulated time-series snapshots with realistic thermodynamics
        and injected degradation curves for Machine 15, 6, and 23.
        """
        snapshots = []
        now = datetime.utcnow()
        start_time = now - timedelta(days=days)
        total_steps = int((days * 24) / sample_interval_hours)

        # Baseline starting states
        supply_temp = 8.2 + (random.random() - 0.5) * 0.4
        cond_entering = 29.0
        high_pressure = 15.6
        low_pressure = 3.8
        power_kw = 75.0
        run_hours = 12000.0 + random.randint(0, 5000)

        for step in range(total_steps):
            current_time = start_time + timedelta(hours=step * sample_interval_hours)
            day_offset = (current_time - start_time).total_seconds() / 86400.0
            hour = current_time.hour + current_time.minute / 60.0
            diurnal = math.sin((hour - 8.0) * math.pi / 12.0)  # Peak around 14:00

            # ── 1. Base Thermodynamic Physics ──
            curr_supply = supply_temp + (random.random() - 0.5) * 0.15 + diurnal * 0.2
            curr_supply = max(6.5, min(10.5, curr_supply))

            curr_return = curr_supply + 4.4 + diurnal * 0.4 + (random.random() - 0.5) * 0.1
            curr_cond_in = cond_entering + diurnal * 1.5 + (random.random() - 0.5) * 0.15
            curr_cond_out = curr_cond_in + 4.8 + diurnal * 0.8 + (random.random() - 0.5) * 0.2

            curr_hp = 14.5 + (curr_cond_out - 30.0) * 0.45 + (random.random() - 0.5) * 0.15
            curr_lp = 3.2 + (curr_supply - 7.0) * 0.2 + (random.random() - 0.5) * 0.08
            curr_power = 65.0 + diurnal * 25.0 + (random.random() - 0.5) * 3.0
            run_hours += sample_interval_hours

            # ── 2. Injected Degradation Scenarios ──
            # Machine 15: Cooling Tower Fill Scaling starting at Day 55
            if machine_id == 15 and day_offset > 55:
                degrade_days = day_offset - 55
                # Condenser leaving temp gradually drifts upwards
                temp_drift = degrade_days * 0.045
                curr_cond_out += temp_drift
                curr_hp += temp_drift * 0.42
                curr_power += temp_drift * 1.2

            # Machine 6: Micro Refrigerant Leak starting at Day 60
            elif machine_id == 6 and day_offset > 60:
                degrade_days = day_offset - 60
                leak_amount = degrade_days * 0.02
                curr_lp = max(1.8, curr_lp - leak_amount)
                curr_hp = max(12.0, curr_hp - leak_amount * 0.3)
                curr_supply += leak_amount * 0.15

            # Machine 23: Evaporator Scaling starting at Day 50
            elif machine_id == 23 and day_offset > 50:
                degrade_days = day_offset - 50
                scale_drift = degrade_days * 0.03
                curr_supply += scale_drift
                curr_power += scale_drift * 1.5

            cooling_delta = max(1.0, curr_return - curr_supply)
            curr_cop = max(3.0, min(6.5, (cooling_delta * 85.0) / max(10.0, curr_power)))

            payload = {
                "AAA0001": 1,
                "AAA0002": 1,
                "AAA0003": 0,
                "AAA0013": 0,
                "AAA0018": 0,
                "AAA0028": round(curr_supply, 2),
                "AAA0029": round(curr_return, 2),
                "AAA0030": round(curr_cond_out, 2),
                "AAA0031": round(curr_cond_in, 2),
                "AAA0036": round(curr_hp, 2),
                "AAA0037": round(curr_lp, 2),
                "AAA0042": int(run_hours),
                "AAA0045": round(curr_cop, 2),
                "AAA0059": round(curr_power, 2)
            }

            snapshots.append({
                "time": current_time.isoformat(),
                "machine_id": machine_id,
                "data": payload
            })

        return snapshots

generator = FleetHistoryGenerator()
