from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import numpy as np
import joblib
import json

app = FastAPI()

# Global variables for models and metadata
scaler = None
model = None
explainer = None
metadata = None

class RawData(BaseModel):
    temperature: float
    pressure: float
    humidity: float

class Features(BaseModel):
    temp_rate: float
    pressure_rate: float
    humidity_rate: float
    temp_rolling_mean: float
    temp_rolling_std: float
    pressure_rolling_mean: float
    pressure_rolling_std: float
    humidity_rolling_mean: float
    humidity_rolling_std: float
    temp_pressure_residual: float
    temp_humidity_residual: float
    spatial_temp_deviation: float
    spatial_pressure_deviation: float
    spatial_humidity_deviation: float
    hour_sin: float
    hour_cos: float
    persistence_flag: bool
    missing_flag: bool
    duplicate_flag: bool

class PredictRequest(BaseModel):
    station_id: str
    timestamp: str
    raw: RawData
    features: Features

@app.on_event("startup")
def load_artifacts():
    global scaler, model, explainer, metadata
    scaler = joblib.load('models/scaler.joblib')
    model = joblib.load('models/isolation_forest.joblib')
    explainer = joblib.load('models/explainer.joblib')
    
    with open('models/metadata.json', 'r') as f:
        metadata = json.load(f)

def calibrate_score(raw_score, score_min, score_max):
    inv = -raw_score
    scaled = (inv - score_min) / (score_max - score_min)
    return float(np.clip(scaled, 0.0, 1.0))

@app.post("/predict")
def predict(req: PredictRequest):
    # Prepare feature vector for Isolation Forest
    ml_features = metadata['features']
    feature_dict = req.features.dict()
    
    x = [feature_dict[feat] for feat in ml_features]
    X_df = pd.DataFrame([x], columns=ml_features)
    
    X_scaled = scaler.transform(X_df)
    
    # Isolation Forest Prediction
    raw_score = model.decision_function(X_scaled)[0]
    if_score = calibrate_score(raw_score, metadata['calibration']['score_min'], metadata['calibration']['score_max'])
    
    # Calculate Spatial Score
    spatial_dev_temp = abs(feature_dict['spatial_temp_deviation'])
    spatial_dev_pres = abs(feature_dict['spatial_pressure_deviation'])
    spatial_dev_hum = abs(feature_dict['spatial_humidity_deviation'])
    
    spatial_score = np.clip(
        (spatial_dev_temp / 5.0 + spatial_dev_pres / 5.0 + spatial_dev_hum / 15.0) / 3.0, 
        0.0, 1.0
    )
    
    # Calculate Signal Quality Score
    signal_score = 1.0 if (feature_dict['persistence_flag'] or 
                           feature_dict['missing_flag'] or 
                           feature_dict['duplicate_flag']) else 0.0
                           
    # Composite Anomaly Score
    anomaly_score = 0.6 * if_score + 0.25 * spatial_score + 0.15 * signal_score
    
    # SHAP feature contributions
    shap_values = explainer.shap_values(X_scaled)
    # SHAP values for IsolationForest can be negative/positive. 
    # We'll take the absolute values for contribution magnitude.
    contributions = {feat: float(abs(val)) for feat, val in zip(ml_features, shap_values[0])}
    
    # Add spatial deviations into contributions for the dashboard to show them if they are high
    contributions['spatial_temp_deviation'] = float(spatial_dev_temp)
    contributions['spatial_pressure_deviation'] = float(spatial_dev_pres)
    contributions['spatial_humidity_deviation'] = float(spatial_dev_hum)
    
    # Sort contributions to return the top 3-5 drivers
    sorted_contributions = dict(sorted(contributions.items(), key=lambda item: item[1], reverse=True)[:5])

    return {
        "station_id": req.station_id,
        "timestamp": req.timestamp,
        "anomaly_score": round(float(anomaly_score), 4),
        "raw_isolation_score": round(float(raw_score), 4),
        "feature_contributions": {k: round(v, 4) for k, v in sorted_contributions.items()},
        "model_version": metadata['model_version']
    }
