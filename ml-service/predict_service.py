from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional, Dict
import pandas as pd
import numpy as np
import joblib
import json

app = FastAPI(
    title="SkyGuard AI - ML Microservice",
    description="Isolation Forest Inference, Spatial QC, and SHAP Explainability Service",
    version="2.0.0"
)

# Global variables for models and metadata
scaler = None
model = None
explainer = None
metadata = None
spatial_baselines = {}

class RawData(BaseModel):
    temperature: Optional[float] = None
    pressure: Optional[float] = None
    humidity: Optional[float] = None

class Features(BaseModel):
    temp_rate: Optional[float] = 0.0
    pressure_rate: Optional[float] = 0.0
    humidity_rate: Optional[float] = 0.0
    temp_rolling_mean: Optional[float] = 0.0
    temp_rolling_std: Optional[float] = 0.0
    pressure_rolling_mean: Optional[float] = 0.0
    pressure_rolling_std: Optional[float] = 0.0
    humidity_rolling_mean: Optional[float] = 0.0
    humidity_rolling_std: Optional[float] = 0.0
    temp_pressure_residual: Optional[float] = 0.0
    temp_humidity_residual: Optional[float] = 0.0
    spatial_temp_deviation: Optional[float] = 0.0
    spatial_pressure_deviation: Optional[float] = 0.0
    spatial_humidity_deviation: Optional[float] = 0.0
    hour_sin: Optional[float] = 0.0
    hour_cos: Optional[float] = 0.0
    persistence_flag: Optional[bool] = False
    missing_flag: Optional[bool] = False
    duplicate_flag: Optional[bool] = False

class PredictRequest(BaseModel):
    station_id: str
    timestamp: str
    raw: Optional[RawData] = None
    features: Features

@app.on_event("startup")
def load_artifacts():
    global scaler, model, explainer, metadata, spatial_baselines
    import os
    base_dir = os.path.dirname(__file__)
    models_dir = os.path.join(base_dir, 'models') if os.path.exists(os.path.join(base_dir, 'models')) else 'models'

    scaler = joblib.load(os.path.join(models_dir, 'scaler.joblib'))
    model = joblib.load(os.path.join(models_dir, 'isolation_forest.joblib'))
    explainer = joblib.load(os.path.join(models_dir, 'explainer.joblib'))
    
    with open(os.path.join(models_dir, 'metadata.json'), 'r') as f:
        metadata = json.load(f)
    spatial_baselines = metadata.get('spatial_baselines', {})

def calibrate_score(raw_score: float, score_min: float, score_max: float) -> float:
    inv = -raw_score
    scaled = (inv - score_min) / (score_max - score_min)
    return float(np.clip(scaled, 0.0, 1.0))

@app.get("/")
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "SkyGuard AI ML Microservice",
        "model_version": metadata.get("model_version", "unknown") if metadata else "uninitialized"
    }

# Support both /predict and /infer per V2 architecture specification
@app.post("/predict")
@app.post("/infer")
def predict(req: PredictRequest):
    ml_features = metadata['features']
    feature_dict = req.features.dict()
    
    # Safe float fallback for any None or NaN
    x = []
    for feat in ml_features:
        val = feature_dict.get(feat)
        if val is None or (isinstance(val, float) and np.isnan(val)):
            x.append(0.0)
        else:
            x.append(float(val))
            
    X_df = pd.DataFrame([x], columns=ml_features)
    X_scaled = scaler.transform(X_df)
    
    # 1. Isolation Forest Raw & Calibrated Inference
    raw_score = float(model.decision_function(X_scaled)[0])
    if_score = calibrate_score(
        raw_score,
        metadata['calibration']['score_min'],
        metadata['calibration']['score_max']
    )
    
    # 2. Baseline-Adjusted Spatial Consistency Check
    # Avoids elevation bias (e.g., Bengaluru 920m vs sea-level stations)
    station_baseline = spatial_baselines.get(req.station_id, {
        'temp_mean': 0.0, 'pres_mean': 0.0, 'hum_mean': 0.0
    })
    
    raw_sp_temp = feature_dict.get('spatial_temp_deviation') or 0.0
    raw_sp_pres = feature_dict.get('spatial_pressure_deviation') or 0.0
    raw_sp_hum = feature_dict.get('spatial_humidity_deviation') or 0.0
    
    adj_sp_temp = abs(float(raw_sp_temp) - station_baseline.get('temp_mean', 0.0))
    adj_sp_pres = abs(float(raw_sp_pres) - station_baseline.get('pres_mean', 0.0))
    adj_sp_hum = abs(float(raw_sp_hum) - station_baseline.get('hum_mean', 0.0))
    
    # Channel breakaway: isolated sensor failures create extreme single-channel deviation
    spatial_max_score = float(np.clip(
        max(adj_sp_temp / 7.0, adj_sp_pres / 4.5, adj_sp_hum / 18.0),
        0.0, 1.0
    ))
    
    # 3. Hardware & Communication Quality Score
    sig_fault = bool(
        feature_dict.get('persistence_flag') or 
        feature_dict.get('missing_flag') or 
        feature_dict.get('duplicate_flag')
    )
    sig_score = 1.0 if sig_fault else 0.0
    
    # 4. Multivariate Physical Residual Evidence
    # When z-scored residuals exceed 2.0σ, atmospheric relationships are
    # physically implausible — evidence of sensor fault even if individual values look normal.
    z_tp = abs(float(X_scaled[0, 9]))   # temp_pressure_residual (scaled)
    z_th = abs(float(X_scaled[0, 10]))  # temp_humidity_residual (scaled)
    MV_ACTIVATION_THRESHOLD = 2.0
    MV_SCALE = 3.5
    mv_score = float(np.clip(
        max(
            (z_th - MV_ACTIVATION_THRESHOLD) / MV_SCALE,
            (z_tp - MV_ACTIVATION_THRESHOLD) / MV_SCALE
        ), 0.0, 1.0
    ))

    # 5. Temporal Sustained-Level Evidence (Isolated Barometric Plateau Offset)
    z_pstd = abs(float(X_scaled[0, 6]))  # pressure_rolling_std (scaled)
    sustained_p_raw = float(np.clip((z_pstd - 2.5) / 3.0, 0.0, 1.0))
    peer_disagree = float(np.clip((adj_sp_pres - 3.5) / 3.0, 0.0, 1.0))
    sustained_isolated_pressure = sustained_p_raw * peer_disagree

    # 6. Composite Scoring — Balanced 4-Evidence Multi-Channel Fusion + Temporal Sustained Term
    W_IF, W_SP, W_MV, W_SIG = 0.45, 0.25, 0.18, 0.12
    base_score = (
        W_IF * if_score
        + W_SP * spatial_max_score
        + W_MV * mv_score
        + W_SIG * sig_score
        + 0.10 * sustained_isolated_pressure
    )

    # Physics-aware regional weather dampener:
    # Real weather events maintain atmospheric consistency (z < 2.5σ).
    PHYS_CONSISTENCY_THRESHOLD = 2.5
    phys_consistent = (z_th < PHYS_CONSISTENCY_THRESHOLD) and (z_tp < PHYS_CONSISTENCY_THRESHOLD)
    is_weather_candidate = (adj_sp_temp < 5.0) and (adj_sp_pres < 3.5) and (adj_sp_hum < 14.0) and (not sig_fault) and phys_consistent
    if is_weather_candidate:
        final_anomaly_score = base_score * 0.75
    else:
        final_anomaly_score = base_score

    # Guaranteed fault floor for hardware issues (missing data, stuck sensor, duplicate)
    if sig_fault:
        final_anomaly_score = max(final_anomaly_score, 0.88)

    final_anomaly_score = float(np.clip(final_anomaly_score, 0.0, 1.0))

    # 7. SHAP Feature Contributions (Normalized to Relative % Weights)
    shap_values = explainer.shap_values(X_scaled)
    ml_contributions = {feat: float(abs(val)) for feat, val in zip(ml_features, shap_values[0])}

    # Incorporate normalized spatial, multivariate, and sustained temporal influences
    ml_contributions['spatial_temp_deviation'] = float(adj_sp_temp / 7.0)
    ml_contributions['spatial_pressure_deviation'] = float(adj_sp_pres / 4.5)
    ml_contributions['spatial_humidity_deviation'] = float(adj_sp_hum / 18.0)
    ml_contributions['multivariate_physical_residual'] = mv_score
    if sustained_isolated_pressure > 0.01:
        ml_contributions['sustained_pressure_offset'] = sustained_isolated_pressure
    
    if sig_fault:
        if feature_dict.get('missing_flag'):
            ml_contributions['missing_flag'] = 1.0
        if feature_dict.get('persistence_flag'):
            ml_contributions['persistence_flag'] = 1.0
        if feature_dict.get('duplicate_flag'):
            ml_contributions['duplicate_flag'] = 1.0
            
    total_impact = sum(ml_contributions.values()) or 1.0
    # Normalize to relative weights summing to 1.0
    normalized_contributions = {k: round(v / total_impact, 4) for k, v in ml_contributions.items()}
    top_contributions = dict(sorted(normalized_contributions.items(), key=lambda item: item[1], reverse=True)[:5])

    return {
        "station_id": req.station_id,
        "timestamp": req.timestamp,
        "anomaly_score": round(final_anomaly_score, 4),
        "raw_isolation_score": round(raw_score, 4),
        "feature_contributions": top_contributions,
        "model_version": metadata.get('model_version', 'if_v5_temporal_sustained_2026-09-10')
    }
