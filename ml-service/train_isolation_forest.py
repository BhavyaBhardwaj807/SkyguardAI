import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score, average_precision_score, confusion_matrix
import shap
import json
import os

def load_data(filepath=None):
    if filepath is None:
        for candidate in ['../data/features.csv', 'data/features.csv', os.path.join(os.path.dirname(__file__), '..', 'data', 'features.csv')]:
            if os.path.exists(candidate):
                filepath = candidate
                break
        if filepath is None:
            filepath = '../data/features.csv'
    df = pd.read_csv(filepath)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values(by=['station_id', 'timestamp'])
    return df

def main():
    print("Loading data...")
    df = load_data()
    
    # Chronological split (first 70% for train, last 30% for test)
    split_time = df['timestamp'].quantile(0.7)
    train_df = df[df['timestamp'] < split_time].copy()
    test_df = df[df['timestamp'] >= split_time].copy()
    
    # Compute station spatial baselines on clean training data
    # This prevents natural elevation/climate offsets (e.g. Bengaluru altitude) from being treated as faults
    clean_train = train_df[train_df['anomaly_label'] == 0]
    spatial_baselines = {}
    for st in df['station_id'].unique():
        st_clean = clean_train[clean_train['station_id'] == st]
        spatial_baselines[st] = {
            'temp_mean': float(st_clean['spatial_temp_deviation'].mean()) if not st_clean.empty else 0.0,
            'pres_mean': float(st_clean['spatial_pressure_deviation'].mean()) if not st_clean.empty else 0.0,
            'hum_mean': float(st_clean['spatial_humidity_deviation'].mean()) if not st_clean.empty else 0.0,
        }
    print(f"Computed spatial baselines for {len(spatial_baselines)} stations.")

    # Train model only on normal baseline data
    train_df = train_df[train_df['anomaly_label'] == 0]

    ml_features = [
        'temp_rate', 'pressure_rate', 'humidity_rate',
        'temp_rolling_mean', 'temp_rolling_std',
        'pressure_rolling_mean', 'pressure_rolling_std',
        'humidity_rolling_mean', 'humidity_rolling_std',
        'temp_pressure_residual', 'temp_humidity_residual',
        'hour_sin', 'hour_cos'
    ]

    train_df[ml_features] = train_df[ml_features].fillna(0.0)
    test_df[ml_features] = test_df[ml_features].fillna(0.0)

    X_train = train_df[ml_features]
    X_test = test_df[ml_features]
    y_test = test_df['anomaly_label']

    print("Scaling features...")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    print("Training Isolation Forest...")
    contamination_rate = 0.04
    model = IsolationForest(n_estimators=100, contamination=contamination_rate, random_state=42)
    model.fit(X_train_scaled)

    raw_scores_test = model.decision_function(X_test_scaled)
    raw_scores_train = model.decision_function(X_train_scaled)
    inverted_scores_train = -raw_scores_train
    score_min = float(inverted_scores_train.min())
    score_max = float(inverted_scores_train.max() + 0.1)

    def calibrate_score(raw):
        inv = -raw
        scaled = (inv - score_min) / (score_max - score_min)
        return np.clip(scaled, 0.0, 1.0)

    if_scores_test = calibrate_score(raw_scores_test)

    print("Calculating baseline-adjusted spatial deviations...")
    dts = []
    dps = []
    dhs = []
    for _, r in test_df.iterrows():
        b = spatial_baselines.get(r['station_id'], {'temp_mean': 0.0, 'pres_mean': 0.0, 'hum_mean': 0.0})
        dts.append(abs(r['spatial_temp_deviation'] - b['temp_mean']) if pd.notna(r['spatial_temp_deviation']) else 0.0)
        dps.append(abs(r['spatial_pressure_deviation'] - b['pres_mean']) if pd.notna(r['spatial_pressure_deviation']) else 0.0)
        dhs.append(abs(r['spatial_humidity_deviation'] - b['hum_mean']) if pd.notna(r['spatial_humidity_deviation']) else 0.0)

    dts = np.array(dts)
    dps = np.array(dps)
    dhs = np.array(dhs)

    # Channel breakaway: single sensor faults trigger huge localized deviations
    spatial_max_score = np.clip(np.maximum.reduce([dts / 7.0, dps / 4.5, dhs / 18.0]), 0.0, 1.0)

    def str_to_bool(series):
        return series.astype(str).str.lower() == 'true'

    sig_score = (str_to_bool(test_df['persistence_flag']) | 
                    str_to_bool(test_df['missing_flag']) | 
                    str_to_bool(test_df['duplicate_flag'])).astype(float).to_numpy()

    # Multivariate Physical Residual Evidence:
    # When temp-humidity or temp-pressure z-scored residuals exceed 2.0σ,
    # the atmospheric relationships are physically implausible — strong
    # evidence of a sensor fault even if the individual readings look normal.
    z_tp = np.abs(X_test_scaled[:, 9])   # temp_pressure_residual (scaled)
    z_th = np.abs(X_test_scaled[:, 10])  # temp_humidity_residual (scaled)
    MV_ACTIVATION_THRESHOLD = 2.0
    MV_SCALE = 3.5
    mv_score = np.clip(
        np.maximum(
            (z_th - MV_ACTIVATION_THRESHOLD) / MV_SCALE,
            (z_tp - MV_ACTIVATION_THRESHOLD) / MV_SCALE
        ), 0.0, 1.0
    )

    # 5. Temporal Sustained-Level Evidence (Isolated Barometric Plateau Offset):
    # Detects when pressure remains substantially displaced at an abnormal plateau
    # while peer stations do not corroborate the shift.
    # Uses pressure_rolling_std (scaled feature 6) and peer disagreement (dps > 3.5 hPa).
    z_pstd = np.abs(X_test_scaled[:, 6])
    sustained_p_raw = np.clip((z_pstd - 2.5) / 3.0, 0.0, 1.0)
    peer_disagree = np.clip((dps - 3.5) / 3.0, 0.0, 1.0)
    sustained_isolated_pressure = sustained_p_raw * peer_disagree

    # Composite Anomaly Score — 4-Evidence Multi-Channel Fusion + Temporal Sustained Term:
    #   45% Isolation Forest (statistical novelty)
    #   25% Spatial Consistency (cross-station breakaway)
    #   18% Multivariate Physical Residual (atmospheric relationship violation)
    #   12% Hardware/Signal Quality (persistence, missing, duplicate flags)
    #   +10% Temporal Sustained Offset (when local pressure plateau is uncorroborated)
    W_IF, W_SP, W_MV, W_SIG = 0.45, 0.25, 0.18, 0.12
    base_score = (
        W_IF * if_scores_test
        + W_SP * spatial_max_score
        + W_MV * mv_score
        + W_SIG * sig_score
        + 0.10 * sustained_isolated_pressure
    )

    # Physics-aware regional weather dampener:
    # Real weather events maintain atmospheric consistency (z < 2.5σ).
    # Only dampen when ALL of: no spatial breakaway, no hardware fault,
    # AND physical relationships are consistent (not a sensor fault).
    PHYS_CONSISTENCY_THRESHOLD = 2.5
    phys_consistent = (z_th < PHYS_CONSISTENCY_THRESHOLD) & (z_tp < PHYS_CONSISTENCY_THRESHOLD)
    is_weather_candidate = (dts < 5.0) & (dps < 3.5) & (dhs < 14.0) & (sig_score == 0) & phys_consistent
    dampened_score = np.where(is_weather_candidate, base_score * 0.75, base_score)

    # Hardware / Signal Quality floor: stuck, missing, or duplicate signals are guaranteed high anomalies
    anomaly_score_test = np.maximum(dampened_score, sig_score * 0.88)

    print("Evaluating...")
    threshold = 0.45
    preds = (anomaly_score_test > threshold).astype(int)

    precision = precision_score(y_test, preds, zero_division=0)
    recall = recall_score(y_test, preds, zero_division=0)
    f1 = f1_score(y_test, preds, zero_division=0)
    pr_auc = average_precision_score(y_test, anomaly_score_test)
    roc_auc = roc_auc_score(y_test, anomaly_score_test)
    
    tn, fp, fn, tp = confusion_matrix(y_test, preds).ravel()
    false_alarm_rate = fp / (fp + tn)

    regional_events = test_df[test_df['scenario_tag'] == 'regional_event']
    regional_fp = 0
    regional_total = len(regional_events)
    if regional_total > 0:
        regional_preds = preds[test_df['scenario_tag'] == 'regional_event']
        regional_fp = int(regional_preds.sum())
        print(f"Regional Event (Negative Test) False Positives: {regional_fp}/{regional_total}")
    else:
        print("No regional events in this test split window.")

    print(f"Precision: {precision:.4f}")
    print(f"Recall: {recall:.4f}")
    print(f"F1 Score: {f1:.4f}")
    print(f"PR-AUC: {pr_auc:.4f}")
    print(f"ROC-AUC: {roc_auc:.4f}")
    print(f"False Alarm Rate: {false_alarm_rate:.4f}")

    print("Initializing SHAP explainer...")
    explainer = shap.TreeExplainer(model)
    
    print("Saving models and metadata...")
    models_dir = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(models_dir, exist_ok=True)
    joblib.dump(scaler, os.path.join(models_dir, 'scaler.joblib'))
    joblib.dump(model, os.path.join(models_dir, 'isolation_forest.joblib'))
    joblib.dump(explainer, os.path.join(models_dir, 'explainer.joblib'))

    metadata = {
        'model_type': 'IsolationForest + Spatial Cluster + Multivariate Physical Residual + Temporal Sustained + QC Rules',
        'model_version': 'if_v5_temporal_sustained_2026-09-10',
        'features': ml_features,
        'contamination': contamination_rate,
        'spatial_baselines': spatial_baselines,
        'calibration': {
            'score_min': score_min,
            'score_max': score_max
        },
        'metrics': {
            'precision': float(precision),
            'recall': float(recall),
            'f1': float(f1),
            'pr_auc': float(pr_auc),
            'roc_auc': float(roc_auc),
            'false_alarm_rate': float(false_alarm_rate),
            'regional_event_fps': int(regional_fp),
            'regional_event_total': int(regional_total)
        }
    }
    with open(os.path.join(models_dir, 'metadata.json'), 'w') as f:
        json.dump(metadata, f, indent=2)

    # Multi-seed validation summary (5 seeds)
    multi_seed_metrics = []
    for s in [40, 41, 42, 43, 44]:
        s_model = IsolationForest(n_estimators=100, contamination=contamination_rate, random_state=s)
        s_model.fit(X_train_scaled)
        s_raw_tr = -s_model.decision_function(X_train_scaled)
        s_min, s_max = float(s_raw_tr.min()), float(s_raw_tr.max() + 0.1)
        s_if = np.clip((-s_model.decision_function(X_test_scaled) - s_min) / (s_max - s_min), 0.0, 1.0)
        s_base = (
            W_IF * s_if
            + W_SP * spatial_max_score
            + W_MV * mv_score
            + W_SIG * sig_score
            + 0.10 * sustained_isolated_pressure
        )
        s_damp = np.where(is_weather_candidate, s_base * 0.75, s_base)
        s_anom = np.maximum(s_damp, sig_score * 0.88)
        s_preds = (s_anom > threshold).astype(int)
        s_tn, s_fp, s_fn, s_tp = confusion_matrix(y_test, s_preds).ravel()
        multi_seed_metrics.append({
            'precision': precision_score(y_test, s_preds, zero_division=0),
            'recall': recall_score(y_test, s_preds, zero_division=0),
            'f1': f1_score(y_test, s_preds, zero_division=0),
            'pr_auc': average_precision_score(y_test, s_anom),
            'roc_auc': roc_auc_score(y_test, s_anom),
            'false_alarm_rate': s_fp / (s_fp + s_tn)
        })
    ms_df = pd.DataFrame(multi_seed_metrics)
    eval_summary = {
        k: {'mean': float(ms_df[k].mean()), 'std': float(ms_df[k].std())}
        for k in ms_df.columns
    }
    with open(os.path.join(models_dir, 'evaluation_summary.json'), 'w') as f:
        json.dump(eval_summary, f, indent=2)

    print("Done! Model, metadata, and evaluation summary saved to ml-service/models/")

if __name__ == "__main__":
    main()
