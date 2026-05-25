# EPC Rating Predictor

A machine learning model and web application that predicts residential Energy Performance Certificate (EPC) ratings for properties in England and Wales. Trained on 23 million EPC assessments from the public MHCLG register.

**Model on Hugging Face:** https://huggingface.co/kulbinderdio/uk-epc-model  
See [REPORT.md](REPORT.md) for a full technical writeup covering data findings, model architecture, and accuracy analysis.

---

## Quick start (existing model)

If you already have the trained model (`data/models/lgbm_epc.txt`) and processed data, you can run the web app immediately:

```bash
# Terminal 1 — API
uv run uvicorn api.main:app --port 8000

# Terminal 2 — Web app
cd web && pnpm dev
```

Open http://localhost:3000.

<img width="816" height="1010" alt="image" src="https://github.com/user-attachments/assets/ddf2f1d6-a814-42b1-ad5e-49704a5d02c5" />


---

## Reproducing from scratch

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Python | ≥ 3.11 | [python.org](https://python.org) |
| uv | latest | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| Node.js | ≥ 20 | [nodejs.org](https://nodejs.org) |
| pnpm | latest | `npm install -g pnpm` |

### Step 1 — Download the source data

Download the full domestic EPC dataset from the MHCLG open data portal:

**https://get-energy-performance-data.communities.gov.uk/**

Select "Domestic" and download all available certificate and recommendation files. Extract them into `domestic-csv/` so the directory looks like:

```
domestic-csv/
├── certificates-2012.csv
├── certificates-2013.csv
├── ...
├── certificates-2026.csv
├── recommendations-2012.csv
├── recommendations-2013.csv
├── ...
└── recommendations-2026.csv
```

The full download is approximately 55 GB across 30 CSV files.

### Step 2 — Install Python dependencies

```bash
uv sync
```

This creates `.venv/` and installs all dependencies from `pyproject.toml`.

### Step 3 — Install web dependencies

```bash
cd web && pnpm install && cd ..
```

### Step 4 — Process raw data into Parquet

This is a one-time job. DuckDB streams all 55 GB without loading to RAM. Runtime: ~60–90 minutes.

```bash
uv run python -m src.pipeline.loader
```

Outputs:
- `data/processed/train/certificates-{year}.parquet` — 2012–2023 (19.3M rows)
- `data/processed/test/certificates-{year}.parquet` — 2024–2026 (4.0M rows)
- `data/processed/recommendations_lookup.parquet` — pre-aggregated improvement recommendations
- `data/models/feature_meta.json` — feature column list and SAP thresholds

### Step 5 — Train the model

**Option A: Train with default hyperparameters** (fastest, ~30–60 min)

```bash
uv run python -m src.model.train --full
```

**Option B: Run Optuna hyperparameter search first, then train** (recommended, ~2–4 hours total)

```bash
uv run python -m src.model.train --search --full
```

The `--search` flag runs 50 Optuna trials on a 2-million-row stratified sample before training on the full dataset. The best parameters are automatically used for `--full` training.

After training completes, the script runs a threshold calibration step on the first 100K test rows and saves calibrated grade boundaries to `feature_meta.json`.

Outputs:
- `data/models/lgbm_epc.txt` — trained LightGBM model (5,000 trees)
- `data/models/feature_meta.json` — updated with category maps and calibrated thresholds

### Step 6 — Evaluate the model

```bash
uv run python -m src.model.evaluate
```

Outputs to `data/models/eval/`:
- `metrics.json` — MAE, exact grade accuracy (raw and calibrated), within-1-band accuracy, per-property-type breakdown
- `confusion_matrix.png` — 7×7 grade confusion matrix
- `shap_summary.png` — SHAP feature importance plot (top 20 features)

Expected results on the 2024–2026 test set:

| Metric | Value |
|--------|-------|
| MAE | ~3.1 SAP points |
| Exact grade accuracy (calibrated) | ~77.4% |
| Within-1-band accuracy | ~98.7% |

### Step 7 — Run the API

```bash
uv run uvicorn api.main:app --port 8000
```

The API loads the model at startup. Test it:

```bash
curl -X POST http://localhost:8000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"property_type":"House","built_form":"Semi-Detached","total_floor_area":85,"mains_gas_flag":"Y","construction_age_band":"1967-1975"}'
```

### Step 8 — Run the web app

```bash
cd web && pnpm dev
```

Open http://localhost:3000.

> **The API must be running (Step 7) before the web app will work.** The frontend calls `http://localhost:8000` by default.

---

## Frontend in detail

The web app lives in `web/` and is a Next.js 15 application with Tailwind CSS.

### Development

```bash
cd web
pnpm install      # first time only
pnpm dev
```

Open http://localhost:3000. The page hot-reloads on save.

### Pointing at a different API

By default the frontend calls `http://localhost:8000`. To point at a different API (e.g. a remote server), create `web/.env.local`:

```
NEXT_PUBLIC_API_URL=https://your-api-host.example.com
```

Then restart `pnpm dev`. For a production build the same variable applies.

### Production build

```bash
cd web
pnpm build    # compiles and optimises
pnpm start    # serves on http://localhost:3000
```

`pnpm build` performs a full TypeScript compile and outputs a static/server bundle to `web/.next/`. `pnpm start` serves it — suitable for running behind a reverse proxy (nginx, Caddy, etc.).

### Linting

```bash
cd web && pnpm lint
```

---

## Directory structure

```
epc/
├── domestic-csv/               # Raw source data (download separately, ~55 GB)
├── data/
│   ├── processed/
│   │   ├── train/              # Parquet files, 2012–2023
│   │   ├── test/               # Parquet files, 2024–2026
│   │   └── recommendations_lookup.parquet
│   └── models/
│       ├── lgbm_epc.txt        # Trained LightGBM model
│       ├── feature_meta.json   # Feature columns, category maps, thresholds
│       └── eval/               # Evaluation outputs (metrics, plots)
├── src/
│   ├── pipeline/
│   │   ├── loader.py           # CSV → Parquet pipeline (DuckDB)
│   │   ├── cleaner.py          # Data cleaning functions
│   │   └── features.py         # Feature definitions and encoding
│   ├── model/
│   │   ├── train.py            # LightGBM training + Optuna search
│   │   ├── predict.py          # Inference pipeline
│   │   └── evaluate.py         # Metrics, confusion matrix, SHAP
│   └── recommendations/
│       └── lookup.py           # Recommendations aggregation and lookup
├── api/
│   ├── main.py                 # FastAPI application
│   ├── routers/
│   │   ├── predict.py          # POST /api/predict
│   │   └── recommendations.py  # POST /api/recommendations
│   └── schemas.py              # Pydantic input/output models
├── web/                        # Next.js frontend
├── tests/                      # pytest unit and integration tests
├── pyproject.toml
├── REPORT.md                   # Full technical report
└── README.md                   # This file
```

---

## Running tests

```bash
uv run pytest tests/
```

---

## Expected runtimes

Timings below were measured on an Apple M-series MacBook with 32 GB RAM. Times will vary significantly depending on hardware — older Intel machines or machines with less RAM may take 2–4× longer, while machines with more CPU cores or higher clock speeds may be faster. The data processing step is I/O-bound (disk read speed matters); the training step is CPU-bound (core count and clock speed matter most).

| Step | Time (M-series, 32 GB) |
|------|------------------------|
| Data processing (Step 4) | 60–90 min |
| Optuna search on 2M rows (Step 5 `--search`) | 30–60 min |
| Full training on 19M rows (Step 5 `--full`) | 30–60 min |
| Evaluation with SHAP (Step 6) | 5–10 min |

---

## Production deployment

**CORS:** The API defaults to allowing `http://localhost:3000` only. For a public deployment, set the `ALLOWED_ORIGINS` environment variable:

```bash
ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com" uvicorn api.main:app --host 0.0.0.0 --port 8000
```

**Frontend API URL:** Set `NEXT_PUBLIC_API_URL` in your deployment environment (or in `web/.env.local` for local overrides):

```
NEXT_PUBLIC_API_URL=https://your-api-host.example.com
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

This project is licensed under the [MIT License](LICENSE).
