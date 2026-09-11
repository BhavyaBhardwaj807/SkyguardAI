import os
import subprocess
import json
import numpy as np

def run_command(cmd, cwd=None):
    # Using the global python interpreter that has the packages
    python_exe = r"C:\Users\manas\AppData\Local\Programs\Python\Python311\python.exe"
    if cmd.startswith("python "):
        cmd = f'"{python_exe}" ' + cmd[7:]
    
    print(f"Running: {cmd} (cwd={cwd})")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=cwd)
    if result.returncode != 0:
        print(f"Error running command: {cmd}")
        print(result.stderr)
        raise Exception("Command failed")

def main():
    seeds = [42, 100, 2026, 999, 123]
    all_metrics = []

    print("Starting Multi-Seed Tuning for Isolation Forest...\n")

    # Store original data paths to avoid conflicts, though we'll just overwrite features.csv
    # This assumes we are running from the ml-service folder
    
    # We need to run injection_engine.py and features.py from the parent directory
    parent_dir = ".."
    
    for seed in seeds:
        print(f"--- Testing Seed {seed} ---")
        
        # 1. Inject anomalies
        run_command(f'python injection_engine.py --seed {seed}', cwd="..")
        
        # 2. Generate features
        run_command(f'python features.py', cwd="..")
        
        # 3. Train and evaluate Isolation Forest
        run_command(f'python train_isolation_forest.py')
        
        # 4. Read metrics from metadata.json
        with open('models/metadata.json', 'r') as f:
            metadata = json.load(f)
            
        metrics = metadata['metrics']
        print(f"Metrics for seed {seed}: F1={metrics['f1']:.4f}, PR-AUC={metrics['pr_auc']:.4f}")
        all_metrics.append(metrics)
        print()

    # Calculate means and standard deviations
    print("=== Multi-Seed Evaluation Summary ===")
    metric_keys = ['precision', 'recall', 'f1', 'pr_auc', 'roc_auc', 'false_alarm_rate']
    
    summary = {}
    for key in metric_keys:
        values = [m[key] for m in all_metrics]
        mean_val = np.mean(values)
        std_val = np.std(values)
        summary[key] = {'mean': mean_val, 'std': std_val}
        print(f"{key.capitalize()}: {mean_val:.4f} ± {std_val:.4f}")
        
    # Save the aggregated metrics to a new JSON file for the /api/evaluation/metrics endpoint
    with open('models/evaluation_summary.json', 'w') as f:
        json.dump(summary, f, indent=2)
        
    print("\nTuning complete! Evaluation summary saved to ml-service/models/evaluation_summary.json")

if __name__ == "__main__":
    main()
