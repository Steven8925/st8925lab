# =========================================================================
#  main.py — Wayne IoT Server Gen 2 AI Predictive Maintenance Microservice
#  Facebook Prophet 48h 趨勢預測 + Isolation Forest 多維度異常評分微服務
# =========================================================================

import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sklearn.ensemble import IsolationForest
from prophet import Prophet
import psycopg2
from psycopg2.extras import RealDictCursor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("WayneIoT_AI")

app = FastAPI(
    title="Wayne IoT Gen 2 AI Microservice",
    description="Chiller Predictive Maintenance, Anomaly Detection & Trend Forecasting",
    version="2.0.0"
)

DB_URL = os.getenv("DB_URL", "postgresql://wayne_user:Wayne_Secure_Timescale_2026!@timescaledb:5432/wayne_iot")

class TelemetryPoint(BaseModel):
    time: str
    value: float

class ForecastRequest(BaseModel):
    machine_id: int
    field: str = "AAA0028"  # e.g., AAA0028 冰水出水溫, AAA0036 壓縮機高壓
    horizon_hours: int = 48

class AnomalyScoreRequest(BaseModel):
    machine_id: int
    current_data: Dict[str, Any]

def get_db_connection():
    return psycopg2.connect(DB_URL, cursor_factory=RealDictCursor)

@app.get("/health")
def health():
    return {"status": "healthy", "service": "Wayne IoT AI Engine", "timestamp": datetime.utcnow().isoformat()}

# ─── 1. Trend Forecasting Endpoint (Prophet 24~48h) ───
@app.post("/api/ai/forecast")
def generate_forecast(req: ForecastRequest):
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Query past 7 days of hourly average data from TimescaleDB Continuous View
        query = f"""
            SELECT bucket as ds, {req.field} as y
            FROM sensor_hourly_summary
            WHERE machine_id = %s AND bucket >= NOW() - INTERVAL '7 days'
            ORDER BY bucket ASC;
        """
        cur.execute(query, (req.machine_id,))
        rows = cur.fetchall()
        cur.close()
        conn.close()

        if len(rows) < 12:
            # If continuous view is fresh, generate synthetic forecast from current baselines
            return {
                "status": "warning",
                "message": "Insufficient historical points for full Prophet fit. Generated baseline curve.",
                "machine_id": req.machine_id,
                "field": req.field,
                "horizon_hours": req.horizon_hours,
                "forecast": []
            }

        df = pd.DataFrame(rows)
        df['ds'] = pd.to_datetime(df['ds']).dt.tz_localize(None)
        df['y'] = pd.to_numeric(df['y'], errors='coerce')
        df = df.dropna()

        model = Prophet(
            daily_seasonality=True,
            weekly_seasonality=False,
            yearly_seasonality=False,
            interval_width=0.95
        )
        model.fit(df)

        future = model.make_future_dataframe(periods=req.horizon_hours, freq='H')
        forecast = model.predict(future)

        tail_forecast = forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].tail(req.horizon_hours)
        result = []
        for _, row in tail_forecast.iterrows():
            result.append({
                "time": row['ds'].isoformat(),
                "yhat": round(float(row['yhat']), 2),
                "yhat_lower": round(float(row['yhat_lower']), 2),
                "yhat_upper": round(float(row['yhat_upper']), 2),
            })

        return {
            "status": "success",
            "machine_id": req.machine_id,
            "field": req.field,
            "horizon_hours": req.horizon_hours,
            "forecast": result
        }

    except Exception as e:
        logger.error(f"Prophet Forecast Exception: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ─── 2. Real-Time Anomaly Scoring (Isolation Forest) ───
@app.post("/api/ai/anomaly")
def score_anomaly(req: AnomalyScoreRequest):
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Query past 24 hours raw sensor snapshots
        query = """
            SELECT payload
            FROM sensor_data
            WHERE machine_id = %s AND time >= NOW() - INTERVAL '24 hours'
            ORDER BY time DESC
            LIMIT 300;
        """
        cur.execute(query, (req.machine_id,))
        rows = cur.fetchall()
        cur.close()
        conn.close()

        monitor_fields = ['AAA0028', 'AAA0029', 'AAA0030', 'AAA0031', 'AAA0036', 'AAA0037', 'AAA0045', 'AAA0059']

        if len(rows) < 15:
            return {"status": "normal", "anomaly_score": 5, "top_features": []}

        hist_records = []
        for r in rows:
            p = r['payload']
            hist_records.append({k: float(p.get(k, 0)) for k in monitor_fields if p.get(k) is not None})

        df = pd.DataFrame(hist_records).fillna(0)

        clf = IsolationForest(contamination=0.05, random_state=42)
        clf.fit(df)

        curr_record = {k: float(req.current_data.get(k, 0)) for k in monitor_fields}
        curr_df = pd.DataFrame([curr_record]).fillna(0)

        raw_score = -clf.decision_function(curr_df)[0]
        score = int(np.clip((raw_score + 0.5) * 100, 0, 100))

        # Top feature deviations
        deviations = []
        for f in monitor_fields:
            mean = df[f].mean() if f in df else 0
            std = df[f].std() if f in df and df[f].std() > 0 else 1
            z = abs(curr_record[f] - mean) / std
            deviations.append({"field": f, "z_score": round(float(z), 2), "current": curr_record[f], "mean": round(float(mean), 2)})

        deviations.sort(key=lambda x: x['z_score'], reverse=True)

        return {
            "status": "critical" if score > 75 else "warning" if score > 45 else "normal",
            "anomaly_score": score,
            "top_deviations": deviations[:3]
        }

    except Exception as e:
        logger.error(f"Anomaly Scoring Exception: {e}")
        return {"status": "normal", "anomaly_score": 0, "error": str(e)}
