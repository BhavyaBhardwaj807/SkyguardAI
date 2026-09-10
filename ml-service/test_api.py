import pandas as pd
import requests
import time
import sys

def main():
    print("==================================================")
    print("SkyGuard AI - ML Service Real-Time Simulation Test")
    print("==================================================")
    print("Loading test data from data/features.csv...")
    
    import os
    data_path = 'data/features.csv' if os.path.exists('data/features.csv') else '../data/features.csv'
    try:
        df = pd.read_csv(data_path)
    except Exception as e:
        print(f"Error loading data: {e}")
        return
        
    df['timestamp'] = pd.to_datetime(df['timestamp'])

    # Test cases to verify different anomaly categories:
    # 1. Physical sensor spike
    # 2. Hardware / Communication fault
    # 3. Genuine regional weather event (should NOT be flagged)
    test_scenarios = []

    # Scenario 1: Physical spike
    spike_rows = df[df['anomaly_type'].str.contains('spike', na=False)]
    if not spike_rows.empty:
        spike_target = spike_rows.iloc[0]
        st = spike_target['station_id']
        t = spike_target['timestamp']
        win = df[(df['station_id'] == st) & 
                 (df['timestamp'] >= t - pd.Timedelta(hours=1)) & 
                 (df['timestamp'] <= t + pd.Timedelta(hours=1))]
        test_scenarios.append(("SCENARIO 1: PHYSICAL SENSOR SPIKE", win))

    # Scenario 2: Communication Gap / Hardware
    comm_rows = df[df['anomaly_type'] == 'communication_gap']
    if not comm_rows.empty:
        comm_target = comm_rows.iloc[0]
        st = comm_target['station_id']
        t = comm_target['timestamp']
        win = df[(df['station_id'] == st) & 
                 (df['timestamp'] >= t - pd.Timedelta(hours=1)) & 
                 (df['timestamp'] <= t + pd.Timedelta(hours=1))]
        test_scenarios.append(("SCENARIO 2: HARDWARE COMMUNICATION FAULT", win))

    # Scenario 3: Genuine Regional Event
    reg_rows = df[df['scenario_tag'] == 'regional_event']
    if not reg_rows.empty:
        reg_target = reg_rows.iloc[0]
        st = reg_target['station_id']
        t = reg_target['timestamp']
        win = df[(df['station_id'] == st) & 
                 (df['timestamp'] >= t) & 
                 (df['timestamp'] <= t + pd.Timedelta(hours=2))]
        test_scenarios.append(("SCENARIO 3: GENUINE REGIONAL WEATHER EVENT (NEGATIVE TEST)", win))

    url = "http://127.0.0.1:8000/predict"

    # Test health endpoint first
    try:
        health = requests.get("http://127.0.0.1:8000/health", timeout=3)
        print(f"Health Check: {health.json()}\n")
    except requests.exceptions.ConnectionError:
        print("\n[ERROR] FastAPI ML service is not running!")
        print("Please start it in another terminal with:")
        print("  cd ml-service")
        print("  ..\\.venv\\Scripts\\python.exe -m uvicorn predict_service:app --port 8000\n")
        return

    for scenario_name, window in test_scenarios:
        print(f"\n>>> {scenario_name}")
        print("-" * 75)
        for _, row in window.iterrows():
            payload = {
                "station_id": str(row['station_id']),
                "timestamp": str(row['timestamp']),
                "raw": {
                    "temperature": float(row['temperature_c']) if pd.notna(row['temperature_c']) else None,
                    "pressure": float(row['pressure_hpa']) if pd.notna(row['pressure_hpa']) else None,
                    "humidity": float(row['humidity_pct']) if pd.notna(row['humidity_pct']) else None
                },
                "features": {
                    "temp_rate": float(row['temp_rate']) if pd.notna(row['temp_rate']) else 0.0,
                    "pressure_rate": float(row['pressure_rate']) if pd.notna(row['pressure_rate']) else 0.0,
                    "humidity_rate": float(row['humidity_rate']) if pd.notna(row['humidity_rate']) else 0.0,
                    "temp_rolling_mean": float(row['temp_rolling_mean']) if pd.notna(row['temp_rolling_mean']) else 0.0,
                    "temp_rolling_std": float(row['temp_rolling_std']) if pd.notna(row['temp_rolling_std']) else 0.0,
                    "pressure_rolling_mean": float(row['pressure_rolling_mean']) if pd.notna(row['pressure_rolling_mean']) else 0.0,
                    "pressure_rolling_std": float(row['pressure_rolling_std']) if pd.notna(row['pressure_rolling_std']) else 0.0,
                    "humidity_rolling_mean": float(row['humidity_rolling_mean']) if pd.notna(row['humidity_rolling_mean']) else 0.0,
                    "humidity_rolling_std": float(row['humidity_rolling_std']) if pd.notna(row['humidity_rolling_std']) else 0.0,
                    "temp_pressure_residual": float(row['temp_pressure_residual']) if pd.notna(row['temp_pressure_residual']) else 0.0,
                    "temp_humidity_residual": float(row['temp_humidity_residual']) if pd.notna(row['temp_humidity_residual']) else 0.0,
                    "spatial_temp_deviation": float(row['spatial_temp_deviation']) if pd.notna(row['spatial_temp_deviation']) else 0.0,
                    "spatial_pressure_deviation": float(row['spatial_pressure_deviation']) if pd.notna(row['spatial_pressure_deviation']) else 0.0,
                    "spatial_humidity_deviation": float(row['spatial_humidity_deviation']) if pd.notna(row['spatial_humidity_deviation']) else 0.0,
                    "hour_sin": float(row['hour_sin']) if pd.notna(row['hour_sin']) else 0.0,
                    "hour_cos": float(row['hour_cos']) if pd.notna(row['hour_cos']) else 0.0,
                    "persistence_flag": str(row['persistence_flag']).lower() == 'true',
                    "missing_flag": str(row['missing_flag']).lower() == 'true',
                    "duplicate_flag": str(row['duplicate_flag']).lower() == 'true'
                }
            }

            try:
                res = requests.post(url, json=payload, timeout=5)
                data = res.json()
                score = data.get('anomaly_score', 0.0)
                is_flagged = score > 0.50
                status_str = "[ALERT: ANOMALY]" if is_flagged else "[NORMAL / PASS]"
                ground_truth = f"(Label: {row['anomaly_type']})"
                
                print(f"[{row['station_id']}] {row['timestamp']} | {status_str:<18} | Score: {score:.3f} | {ground_truth}")
                if is_flagged:
                    print(f"       Drivers: {data.get('feature_contributions')}")
            except Exception as e:
                print(f"Error calling API: {e}")
                break
                
            time.sleep(0.3)

    print("\n==================================================")
    print("Simulation completed successfully.")
    print("==================================================")

if __name__ == "__main__":
    main()
