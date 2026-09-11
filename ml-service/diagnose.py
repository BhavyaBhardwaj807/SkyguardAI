import pandas as pd
import numpy as np
import joblib, json

df = pd.read_csv('../data/features.csv')
df['timestamp'] = pd.to_datetime(df['timestamp'])
df = df.sort_values(by=['station_id', 'timestamp'])
split_time = df['timestamp'].quantile(0.7)
test_df = df[df['timestamp'] >= split_time].copy()

ml_features = [
    'temp_rate', 'pressure_rate', 'humidity_rate',
    'temp_rolling_mean', 'temp_rolling_std',
    'pressure_rolling_mean', 'pressure_rolling_std',
    'humidity_rolling_mean', 'humidity_rolling_std',
    'temp_pressure_residual', 'temp_humidity_residual',
    'hour_sin', 'hour_cos'
]

test_df[ml_features] = test_df[ml_features].fillna(0.0)

scaler = joblib.load('models/scaler.joblib')
model = joblib.load('models/isolation_forest.joblib')
with open('models/metadata.json') as f:
    meta = json.load(f)

X_test_scaled = scaler.transform(test_df[ml_features])
raw_scores = model.decision_function(X_test_scaled)
s_min = meta['calibration']['score_min']
s_max = meta['calibration']['score_max']
if_scores = np.clip((-raw_scores - s_min) / (s_max - s_min), 0.0, 1.0)

sp_devs = test_df[['spatial_temp_deviation', 'spatial_pressure_deviation', 'spatial_humidity_deviation']].fillna(0.0).abs()
spatial_score = np.clip((sp_devs['spatial_temp_deviation']/5.0 + sp_devs['spatial_pressure_deviation']/5.0 + sp_devs['spatial_humidity_deviation']/15.0)/3.0, 0.0, 1.0)

def str_to_bool(s):
    return s.astype(str).str.lower() == 'true'

sig_score = (str_to_bool(test_df['persistence_flag']) | str_to_bool(test_df['missing_flag']) | str_to_bool(test_df['duplicate_flag'])).astype(float)

test_df['if_score'] = if_scores
test_df['spatial_score'] = spatial_score
test_df['sig_score'] = sig_score
test_df['anomaly_score'] = 0.6 * if_scores + 0.25 * spatial_score + 0.15 * sig_score
test_df['pred'] = (test_df['anomaly_score'] > 0.5).astype(int)

print("\n--- DETECTION BY ANOMALY TYPE ---")
for anom_type, grp in test_df[test_df['anomaly_label'] == 1].groupby('anomaly_type'):
    det_rate = grp['pred'].mean()
    print(f"{anom_type:<28}: {grp['pred'].sum():>2}/{len(grp):<2} ({det_rate*100:5.1f}%) | score: {grp['anomaly_score'].mean():.3f} | if_score: {grp['if_score'].mean():.3f} | spatial: {grp['spatial_score'].mean():.3f}")

normal_df = test_df[test_df['anomaly_label'] == 0]
print(f"\nOverall Normal rows: {len(normal_df)}")
print(f"False Positives on Normal: {normal_df['pred'].sum()} / {len(normal_df)} ({normal_df['pred'].mean()*100:.2f}%)")

reg = test_df[test_df['scenario_tag'] == 'regional_event']
print(f"\nRegional events (genuine weather, should be 0): {reg['pred'].sum()}/{len(reg)} false alarms ({reg['pred'].mean()*100:.1f}%) | mean score: {reg['anomaly_score'].mean():.3f}")
