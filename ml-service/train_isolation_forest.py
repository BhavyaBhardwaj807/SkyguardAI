import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score, average_precision_score, confusion_matrix
import shap
import json
import os

def load_data(filepath='../data/features.csv'):
    df = pd.read_csv(filepath)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values(by=['station_id', 'timestamp'])
    return df

def main():
    print("Loading data...")
    # Update path relative to ml-service folder
    df = load_data('../data/features.csv')
    
    # Chronological split (first 70% for train, last 30% for test)
    split_time = df['timestamp'].quantile(0.7)
    train_df = df[df['timestamp'] < split_time].copy()
    test_df = df[df['timestamp'] >= split_time].copy()
    
    # Train only on normal baseline data
    train_df = train_df[train_df['anomaly_label'] == 0]

    ml_features = [
        'temp_rate', 'pressure_rate', 'humidity_rate',
        'temp_rolling_mean', 'temp_rolling_std',
        'pressure_rolling_mean', 'pressure_rolling_std',
        'humidity_rolling_mean', 'humidity_rolling_std',
        'temp_pressure_residual', 'temp_humidity_residual',
        'hour_sin', 'hour_cos'
    ]

    train_df = train_df.dropna(subset=ml_features)
    test_df = test_df.dropna(subset=ml_features)

    X_train = train_df[ml_features]
    X_test = test_df[ml_features]
    y_test = test_df['anomaly_label']

    print("Scaling features...")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    print("Training Isolation Forest...")
    contamination_rate = 0.05
    model = IsolationForest(n_estimators=100, contamination=contamination_rate, random_state=42)
    model.fit(X_train_scaled)

    raw_scores_test = model.decision_function(X_test_scaled)
    
    raw_scores_train = model.decision_function(X_train_scaled)
    inverted_scores_train = -raw_scores_train
    score_min = inverted_scores_train.min()
    score_max = inverted_scores_train.max() + 0.1

    def calibrate_score(raw):
        inv = -raw
        scaled = (inv - score_min) / (score_max - score_min)
        return np.clip(scaled, 0.0, 1.0)

    if_scores_test = calibrate_score(raw_scores_test)

    print("Calculating composite AnomalyScore...")
    spatial_devs = test_df[['spatial_temp_deviation', 'spatial_pressure_deviation', 'spatial_humidity_deviation']].abs()
    spatial_score = np.clip(
        (spatial_devs['spatial_temp_deviation'] / 5.0 + 
         spatial_devs['spatial_pressure_deviation'] / 5.0 + 
         spatial_devs['spatial_humidity_deviation'] / 15.0) / 3.0, 
        0.0, 1.0
    )

    # Boolean mapping
    def str_to_bool(series):
        return series.astype(str).str.lower() == 'true'

    signal_score = (str_to_bool(test_df['persistence_flag']) | 
                    str_to_bool(test_df['missing_flag']) | 
                    str_to_bool(test_df['duplicate_flag'])).astype(float)

    anomaly_score_test = 0.6 * if_scores_test + 0.25 * spatial_score + 0.15 * signal_score

    print("Evaluating...")
    threshold = 0.5
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
    regional_total = 0
    if not regional_events.empty:
        regional_preds = preds[test_df['scenario_tag'] == 'regional_event']
        regional_fp = regional_preds.sum()
        regional_total = len(regional_preds)
        print(f"Regional Event (Negative Test) False Positives: {regional_fp}/{regional_total}")

    print(f"Precision: {precision:.4f}")
    print(f"Recall: {recall:.4f}")
    print(f"F1 Score: {f1:.4f}")
    print(f"PR-AUC: {pr_auc:.4f}")
    print(f"ROC-AUC: {roc_auc:.4f}")
    print(f"False Alarm Rate: {false_alarm_rate:.4f}")

    print("Initializing SHAP explainer...")
    explainer = shap.TreeExplainer(model)
    
    print("Saving models and metadata...")
    os.makedirs('models', exist_ok=True)
    joblib.dump(scaler, 'models/scaler.joblib')
    joblib.dump(model, 'models/isolation_forest.joblib')
    joblib.dump(explainer, 'models/explainer.joblib')

    metadata = {
        'model_version': 'if_v1_2026-09-07',
        'features': ml_features,
        'contamination': contamination_rate,
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
    with open('models/metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)

    print("Done!")

if __name__ == "__main__":
    main()
