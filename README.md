# SkyGuard AI

Next.js and Express application workspace for the local weather-data quality demo. Based on `feature/ml-isolation-forest-v2`; existing Python code, datasets and trained artifacts are preserved.

**Current mode: precomputed feature replay.** The backend calls the existing Python `/predict` endpoint. It does not claim to compute causal live features from raw observations. See [integration boundaries](docs/backend-handoff.md).

<details open>
<summary><strong>Run the local Docker demo</strong></summary>

Prerequisite: Docker Engine/Desktop with Docker Compose v2. Initial builds require internet access to download images and dependencies.

```bash
docker compose up --build
```

Open [localhost:8080](http://localhost:8080). Create a run, then select **Start** or **Step**. The display uses actual backend data and calls the existing model service. Only the proxy is published, bound to loopback. PostgreSQL and Python are internal services.

```bash
docker compose ps
docker compose logs -f api detection
docker compose stop detection
# Existing committed readings remain available; processing retries and then fails visibly.
docker compose start detection
```

Retry the failed job using the API, then resume the run. See [API examples](docs/api.md).

`docker compose down` stops containers and retains database data. Create another replay run to reset a scenario without deleting history. Do not remove the database volume unless you intend to discard all demo history.

The Python image uses its pre-existing Dockerfile and unpinned requirements. Its artifacts identify scikit-learn **1.9.0**; the ML owner must maintain compatible package versions. No Python dependencies or source files were changed by this backend implementation.

</details>

<details>
<summary><strong>Run with npm during development</strong></summary>

Use Node.js 22 or newer and npm. One root lockfile covers the Next.js root package and `@skyguard/backend` workspace.

```bash
npm ci
cp .env.example .env
docker run --name skyguard-dev-db -e POSTGRES_USER=skyguard -e POSTGRES_PASSWORD=skyguard_local -e POSTGRES_DB=skyguard -p 127.0.0.1:5432:5432 -d postgres:17-bookworm
npm run dev
```

Next.js runs on port 3000, Express on 4000. Start the existing Python service separately on port 8000 using its compatible environment, or use `docker compose` for the full stack. Without Python, reads and ingestion work, while feature processing eventually enters a visible failed state.

```bash
npm run build
npm run typecheck
npm test
npm run check:boundaries
```

Tests use PGlite, an embedded PostgreSQL engine, and an explicit test predictor. They do not require Docker or fabricate production model responses.

</details>

## Architecture & Team Workspace Mapping

SkyGuard AI is architected for a 6-person collaborative engineering team:

| Workspace Path | Owner | Primary Responsibility & Components |
| :--- | :--- | :--- |
| `src/app/` | Persons 4 & 5 | Next.js App Router (Landing page, `/dashboard/*` mission control, `/demo` replay runner) |
| `src/components/` | Persons 4 & 5 | Reusable UI components (Sidebar, Leaflet MapPanel, Recharts trends, AnomalyTable) |
| `src/theme/` | Person 4 | Design system tokens (`tokens.css`), global styles (`styles.css`), and `ThemeContext` |
| `src/api/` & `src/sockets/` | Person 5 | Frontend REST client, mock fallbacks, and real-time Socket.IO/SSE wrappers |
| `src/backend/` | Person 3 | Node.js Express application workspace (`@skyguard/backend`), PGlite/Postgres, queue worker, SSE hub, self-healing |
| `src/contracts/` | Person 6 | Shared Zod schemas and browser-safe TypeScript types (`Observation`, `Batch`, `Assessment`) |
| `ml-service/` | Person 1 | Isolation Forest model, spatial baselines, SHAP tree explainability, FastAPI microservice (:8000) |
| `data/pipeline/` | Person 2 | Data ingestion (`load_data.py`), WMO QC rules (`qc_rules.py`), anomaly engine (`injection_engine.py`), features (`features.py`) |
| `data/` | Person 2 | Historical CSV datasets (`clean_stations.csv`, `qc_stations.csv`, `injected_stations.csv`, `features.csv`) |
| `docker/` | Person 6 | Multi-stage Docker builds (`Dockerfile.node`, `nginx.conf`, `compose.yaml`) |
| `tests/` & `scripts/` | Person 6 | 16 PGlite integration tests, boundary enforcement (`check-boundaries.mjs`), OpenAPI generator |
| `docs/` | All Team | System API specifications, math handoff logic, architectural provenance notes |

*Note: Edge AI / ESP32 firmware quantization is explicitly deferred as future work.*

## System Architecture & Technical Specifications

### Data Source Specifications
- **Current Prototype Dataset**: Open-Meteo-derived meteorological observations for 6 major Indian geographic locations (Delhi `AWS001`, Mumbai `AWS002`, Bengaluru `AWS003`, Chennai `AWS004`, Kolkata `AWS005`, Hyderabad `AWS006`) covering hourly samples, injected with 14 deterministic synthetic anomaly scenarios for reproducibility and stress-testing.
- **Target Production Source**: Official Indian Meteorological Department (IMD) Automatic Weather Station (AWS) telemetry via authorized API gateway / SFTP ingestion.
- **Context & Reanalysis Reference**: Open-Meteo historical archives and ECMWF ERA5 reanalysis data used for regional calibration.

### 40-Column Feature Matrix Breakdown
`data/features.csv` contains exactly **40 columns** partitioned into 5 functional layers:
1. **Timestamps (4)**: `timestamp`, `hour`, `day_of_week`, `month`
2. **Station Metadata (4)**: `station_id`, `station_name`, `latitude`, `longitude`
3. **Raw Physical Measurements (6)**: `temperature_c`, `pressure_hpa`, `humidity_pct`, and pre-injection baselines `original_temperature_c`, `original_pressure_hpa`, `original_humidity_pct`
4. **Evaluation Ground-Truth (7)**: `anomaly_label`, `anomaly_type`, `anomaly_id`, `affected_parameter`, `injection_start`, `injection_end`, `scenario_tag` *(strictly excluded from model input to prevent leakage)*
5. **Engineered Features & Quality Flags (19)**:
   - **Isolation Forest Inputs (13)**: `temp_rate`, `pressure_rate`, `humidity_rate`, `temp_rolling_mean`, `temp_rolling_std`, `pressure_rolling_mean`, `pressure_rolling_std`, `humidity_rolling_mean`, `humidity_rolling_std`, `temp_pressure_residual`, `temp_humidity_residual`, `hour_sin`, `hour_cos`
   - **Spatial Deviation Layer (3)**: `spatial_temp_deviation`, `spatial_pressure_deviation`, `spatial_humidity_deviation` *(handled in station-calibrated elevation baseline layer to prevent topographic altitude bias)*
   - **Hardware Quality Flags (3)**: `persistence_flag`, `missing_flag`, `duplicate_flag` *(handled in deterministic hardware score layer)*

### Real-Time Architecture
- **Active Real-Time Stream**: **Server-Sent Events (SSE)**. The Express backend exposes a durable event stream at `/api/v1/events?runId=...` (`src/backend/events.ts`). The Next.js replay runner (`src/app/demo/page.tsx`) connects directly via native browser `new EventSource()` to receive real-time anomaly alerts, batch commits, and state transitions.
- **Socket Client Stub**: `src/sockets/socketClient.js` was created as an early frontend rehearsal stub with `USE_MOCK_SOCKET = true`. The production real-time communication is entirely driven by SSE.

### Database Architecture
- **Current Prototype**: **PostgreSQL 17** for local Docker deployments and **PGlite** (embedded in-process PostgreSQL WASM engine) for automated integration tests, ensuring tests run self-contained without external database daemons.
- **Future Production Plan**: PostgreSQL with **TimescaleDB** extension for hypertables, automatic chunk compression, and continuous time-series rollups.

### Python Environment & Requirements
- **Root `requirements.txt`**: Used to provision the local project virtual environment (`.venv`) for both Data Engineers (running `data/pipeline/*.py`) and ML Engineers.
- **`ml-service/requirements.txt`**: Used exclusively inside `ml-service/Dockerfile` for isolated, containerized microservice builds.

### Sensor Health & Spatial Self-Healing Guarantees
- **Sensor Health (0–100)**: A heuristic data-quality condition indicator calculated over 30-day baseline and 7-day evaluation windows:
  `Score = 100 - (30 * anomalyRate) - (25 * persistenceRate) - (20 * drift) - (15 * varianceChange) - (10 * missingRate)`
  *This is a data-reliability indicator, not predictive maintenance AI.*
- **Spatial Corrections**: Computed using Inverse Distance Weighting (IDW) from up to 3 normal peer stations within 100 km. Estimates are proposed as separate records for operator review and **NEVER overwrite raw observations**.

### Measured Model Performance: Baseline vs. Improved
Trained on normal observations and evaluated on the 30% chronological holdout test set:

| Evaluation Metric | Baseline Model | Improved SkyGuard AI | Relative Impact / Direction |
| :--- | :---: | :---: | :--- |
| **Precision** | 0.3349 | **0.6176** | **+84.4%** (Drastic reduction in false alarms) |
| **Recall** | 0.6126 | **0.5676** | Consistent high coverage across genuine sensor failures |
| **F1 Score** | 0.4353 | **0.5915** | **+35.9%** improvement in overall detection balance |
| **PR-AUC** | 0.2678 | **0.6055** | **+126.1%** precision-recall area under the curve |
| **ROC-AUC** | 0.8332 | **0.8289** | Robust discrimination between normal and outliers |
| **False Alarm Rate** | 0.0551 (5.51%) | **0.0157 (1.57%)** | **-71.5%** reduction in false alarms (39 vs 137 FPs) |
| **Regional Event False Alarms** | 0 / 0 | **0 / 0** | Zero false alarms on multi-station weather events |

*Note on Evaluation Realism*: Injected anomalies are synthetic, controlled benchmark injections designed to test physical plausibility boundaries. The evaluation metrics above are real, measured numbers from holdout testing, not theoretical estimates.

### Project Scope & Future Work
- **Implemented**: Next.js 16 Dashboard, Express 5 Backend, PostgreSQL/PGlite Storage, FastAPI ML Service (:8000), Isolation Forest, SHAP Attribution, Data Quality Rules, Synthetic Anomaly Generator, SSE Event Stream.
- **Future Work (Post-Qualification)**: ESP32 Edge AI firmware deployment, TensorFlow Lite Micro quantization, on-device TinyML inference, IMD AWS live API integration, TimescaleDB production cluster. *(No edge or esp32 code is included in this repository).*

---

## Quickstart & Execution Guide

### 1. Run Automated Test Suite
```bash
# Run all 16 backend integration tests using embedded PGlite (no DB install needed)
npm test

# Verify architectural boundary isolation (ensures frontend never imports backend)
npm run check:boundaries

# Run TypeScript type check across Next.js and backend workspaces
npm run typecheck

# Run Next.js production build
npm run build
```

### 2. Run the Python ML Microservice & Spatial Mesonet Demo
```bash
# Run the dedicated Spatial Cluster & Regional Event Demonstration (Parts 5 & 15)
.\.venv\Scripts\python.exe scripts/demo_spatial_cluster.py

# Start FastAPI service on port 8000
.\.venv\Scripts\python.exe -m uvicorn predict_service:app --host 127.0.0.1 --port 8000 --app-dir ml-service

# Run real-time streaming simulation test
.\.venv\Scripts\python.exe ml-service/test_api.py

# Re-train Isolation Forest model & update spatial baselines
.\.venv\Scripts\python.exe ml-service/train_isolation_forest.py
```

### 3. Run the Data Pipeline
```bash
# Run WMO-standard physical QC checks
.\.venv\Scripts\python.exe data/pipeline/qc_rules.py

# Run synthetic anomaly injection engine (14 scenarios)
.\.venv\Scripts\python.exe data/pipeline/injection_engine.py --seed 42

# Run feature engineering pipeline (rolling windows, spatial deviations)
.\.venv\Scripts\python.exe data/pipeline/features.py
```

### 4. Run Frontend & Backend Workspaces
```bash
# Start Node.js Express Backend on port 4000
npm run dev:api

# Start Next.js Frontend on port 3000
npm run dev:web

# Or run both concurrently:
npm run dev

# URLs:
# - Landing Page:               http://localhost:3000/
# - Mission Control Dashboard:  http://localhost:3000/dashboard
# - Live Station Map:           http://localhost:3000/dashboard/map
# - Interactive Replay Runner:  http://localhost:3000/demo
```

### 5. Run with Docker Compose
```bash
docker compose up --build
# Open http://localhost:8080 for Nginx reverse proxy
```

---

## Backend Guarantees and Limits

- Raw observations and pending jobs commit together. Identical retries reuse the receipt; conflicting content returns `409`.
- Each replay has its own history, cursor, and assessments. Reset means a new run.
- One database-locked API/worker instance processes batches with bounded retries. Python calls happen outside database transactions.
- Assessments commit before SSE notifications. Reconnect and periodic REST reconciliation repair missed notifications.
- Missing data, processing failures, and unknown states never imply healthy sensors.
- Health scores require adequate history. Correction proposals are separate, reviewed records and never replace raw values.
- The existing six distant locations do not provide three usable neighbors within the prototype 100 km correction radius. Correction estimates will correctly be unavailable.
- Offline feature leakage, spatial validity, and model evaluation remain ML/data issues. Existing zero-sample regional evaluation is reported as **not evaluated**.

See [API reference](docs/api.md), [OpenAPI](docs/openapi.json), [handoff and decisions](docs/backend-handoff.md), and [verification](docs/verification.md).
