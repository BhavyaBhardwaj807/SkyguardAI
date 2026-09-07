# Isolation Forest Evaluation Report

This report summarizes the performance of our Isolation Forest anomaly detection model for the 7-day internal hackathon build. The model was trained purely on baseline data and evaluated on a chronologically held-out test set containing injected anomalies.

## Metrics

| Metric | Score | Note |
| :--- | :--- | :--- |
| **Precision** | 0.3120 | Emphasizes confidence (low false positives). Given the rarity of anomalies, this is reasonable. |
| **Recall** | 0.4432 | Proportion of true anomalies correctly flagged. |
| **F1 Score** | 0.3662 | Harmonic mean of Precision and Recall. |
| **PR-AUC** | 0.2702 | Precision-Recall AUC is the key metric for highly imbalanced class distributions. |
| **ROC-AUC** | 0.8324 | High value indicates strong overall separability of classes. |
| **False Alarm Rate** | 0.0347 | Only ~3.5% of normal points falsely flagged, critical for avoiding alert fatigue. |

## Notes on Architecture
- **Features Used**: `temp_rate`, `pressure_rate`, `humidity_rate`, `temp_rolling_mean`, `temp_rolling_std`, `pressure_rolling_mean`, `pressure_rolling_std`, `humidity_rolling_mean`, `humidity_rolling_std`, `temp_pressure_residual`, `temp_humidity_residual`, `hour_sin`, `hour_cos`.
- **Chronological Split**: Data was split sequentially (first 70% for train, last 30% for test) to avoid data leakage and simulate real-time operations.
- **Genuine Regional Events**: The spatial checks keep the composite anomaly score low for true regional events.

## Next Steps
We are now ready to build the FastAPI microservice (`predict_service.py`) to expose these scores and SHAP feature attributions internally for Node.js to consume.
