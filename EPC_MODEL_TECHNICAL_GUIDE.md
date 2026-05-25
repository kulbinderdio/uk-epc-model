# EPC Rating Prediction Model — Technical Guide

## Overview

This document describes the full pipeline for building a machine learning model that predicts the Energy Performance Certificate (EPC) rating of a domestic property in England and Wales. The model is trained on over 19 million real EPC records (2012–2023), served through a FastAPI backend, and exposed via a Next.js web application.

---

## Table of Contents

1. [What is an EPC?](#1-what-is-an-epc)
2. [The Dataset](#2-the-dataset)
3. [Stage 1 — Data Loading](#3-stage-1--data-loading)
4. [Stage 2 — Data Cleaning](#4-stage-2--data-cleaning)
5. [Stage 3 — Feature Engineering](#5-stage-3--feature-engineering)
6. [Stage 4 — Model Training](#6-stage-4--model-training)
7. [Stage 5 — Hyperparameter Optimisation](#7-stage-5--hyperparameter-optimisation)
8. [Stage 6 — Model Evaluation](#8-stage-6--model-evaluation)
9. [Stage 7 — Recommendations System](#9-stage-7--recommendations-system)
10. [Stage 8 — API](#10-stage-8--api)
11. [Stage 9 — Web Application](#11-stage-9--web-application)
12. [Running the Full Pipeline](#12-running-the-full-pipeline)
13. [Performance Results](#13-performance-results)
14. [Design Decisions and Trade-offs](#14-design-decisions-and-trade-offs)

---

## 1. What is an EPC?

An Energy Performance Certificate (EPC) is a legal document required when a property in England, Wales, or Scotland is built, sold, or rented. It rates the energy efficiency of a property on a scale from **A** (most efficient) to **G** (least efficient), and provides a numeric **SAP score** (Standard Assessment Procedure score) from 1 to 100.

The SAP score is calculated using the **RdSAP methodology** (Reduced Data Standard Assessment Procedure), a deterministic formula developed by the Building Research Establishment (BRE). It accounts for:

- The fabric of the building (walls, roof, floor, windows)
- The heating system and fuel type
- Hot water provision
- Lighting efficiency
- Renewable energy systems (solar PV, solar water heating, wind turbines)
- Property size, type, and construction age

**SAP Score to Letter Grade mapping (SAP 2012):**

| Grade | Score Range | Description |
|-------|------------|-------------|
| A     | 92–100     | Exceptional efficiency |
| B     | 81–91      | Very good |
| C     | 69–80      | Good |
| D     | 55–68      | Average — most UK homes |
| E     | 39–54      | Below average |
| F     | 21–38      | Poor |
| G     | 1–20       | Very poor |

The distribution in the dataset reflects the current state of UK housing stock: **D (37%)** and **C (33%)** dominate, with very few A-rated properties (0.3%) and relatively few G-rated ones (0.7%).

---

## 2. The Dataset

### Source

Data was downloaded from the **EPC Open Data Communities** portal (`epc.opendatacommunities.org`), maintained by the Department for Energy Security and Net Zero (DESNZ).

### Files

```
domestic-csv/
├── certificates-2012.csv  through  certificates-2026.csv   (15 files)
└── recommendations-2012.csv  through  recommendations-2026.csv  (15 files)
```

**Total size:** ~55 GB  
**Total certificate rows:** ~110 million (2012–2026)  
**Training set used:** ~19 million rows (2012–2023, post-cleaning)

### Multiple EPCs per Property

The UK has approximately 26–28 million domestic properties. The 110 million records are *assessments*, not unique properties — the same physical property typically appears 3–5 times across the dataset because a new EPC is lodged every time a property is sold or re-let (even though EPCs are valid for 10 years).

Each record carries a `uprn` (Unique Property Reference Number), present in ~98% of rows, which identifies the physical property.

**Impact on the model:**

- **Overrepresentation of frequently-transacted properties.** Buy-to-let flats and terraced houses that change hands often appear more times than owner-occupied detached houses. The model is therefore trained on a distribution slightly skewed towards those property types.

- **Test set contamination.** The time-based split (2012–2023 train, 2024–2025 test) does not prevent the same UPRN from appearing in both splits. Many properties in the 2024–2025 test set will also have records in training. This means the reported test MAE (2.92) and grade accuracy (76.5%) are slightly optimistic — a genuinely never-assessed property would see marginally lower accuracy.

- **Learning the SAP calculation.** Since we are learning the mapping from physical characteristics → SAP score, and that mapping is consistent over time, duplicate records for the same property are largely harmless — they are just additional examples of the same physics.

**Planned improvement (v2):** Deduplicate by UPRN, keeping only the most recent assessment per property, and enforce a UPRN-aware train/test split so the same property never appears in both sets. This would reduce the dataset to roughly 10–12 million unique properties but give a more honest evaluation of performance on genuinely unseen properties.

### Certificates Table (93 columns)

Each row represents a single EPC assessment of a domestic property. Key columns include:

**Target variable:**
- `current_energy_efficiency` — the SAP score (1–100, always present, never null). This is what we predict.

**Property characteristics (inputs at prediction time):**
- `property_type` — House, Flat, Bungalow, Maisonette, Park home
- `built_form` — Detached, Semi-Detached, Mid-Terrace, End-Terrace, Enclosed variants
- `construction_age_band` — Age band of the building (e.g., "1950-1966", "2012 onwards")
- `total_floor_area` — Total floor area in m²
- `number_habitable_rooms`, `number_heated_rooms`

**Building envelope:**
- `walls_description`, `walls_energy_eff` — Wall construction type and assessed efficiency
- `roof_description`, `roof_energy_eff` — Roof type and insulation level
- `floor_description`, `floor_energy_eff` — Floor type and insulation
- `windows_description`, `windows_energy_eff` — Glazing type and efficiency
- `multi_glaze_proportion` — Percentage of glazing that is double/triple

**Heating and energy systems:**
- `main_fuel` — Fuel type (mains gas, electricity, oil, LPG, etc.)
- `mainheat_description`, `mainheat_energy_eff` — Primary heating system
- `hotwater_description`, `hot_water_energy_eff` — Hot water system
- `lighting_energy_eff` — Lighting efficiency rating
- `mains_gas_flag`, `solar_water_heating_flag`, `photo_supply` — Binary presence flags

**Flat-specific:**
- `floor_level`, `flat_storey_count`, `flat_top_storey` — Only meaningful for flats/maisonettes

**Excluded (would cause data leakage):**
- `energy_consumption_current/potential` — Derived from the SAP calculation itself
- `co2_emissions_current/potential` — Similarly derived
- `heating_cost_current/potential`, `lighting_cost_current/potential` — Calculated outputs
- `potential_energy_efficiency/rating` — Future state, not present at prediction time

### Recommendations Table (6 columns)

Linked to certificates via `certificate_number`. Each row is one improvement recommendation for a property:

- `improvement_id` — Standardised improvement type (0–63, 47 unique types)
- `improvement_summary_text` — Short description (e.g., "Floor insulation (solid floor)")
- `indicative_cost` — Cost estimate as a string range (e.g., "£2,200 - £3,000")

The most common recommendations across all properties are: solar PV panels, solar water heating, low energy lighting, floor insulation, and cavity wall insulation.

---

## 3. Stage 1 — Data Loading

**File:** `src/pipeline/loader.py`

### The Problem with 55 GB of CSV

Loading 55 GB of CSV files into a Pandas DataFrame at once would require well over 100 GB of RAM and take many minutes just to read. Instead, we use **DuckDB** — an in-process SQL engine that streams CSV data without loading it all into memory.

### How It Works

```
DuckDB reads each CSV year-by-year
       ↓
Apply cleaning and encoding (Polars DataFrame)
       ↓
Write each year to a Parquet file
       ↓
data/processed/train/certificates-2012.parquet
data/processed/train/certificates-2013.parquet
...
data/processed/test/certificates-2024.parquet
```

DuckDB's `read_csv_auto()` function:
- Infers column types automatically
- Handles inconsistent formatting between years
- Processes files in streaming batches — constant memory usage regardless of file size
- The `union_by_name=True` flag handles minor schema differences between yearly files

### Why Parquet?

Parquet is a **columnar binary format** that:
- Compresses the data from ~55 GB CSV to ~3–5 GB Parquet (10× compression)
- Reads 10–50× faster than CSV for analytics workloads
- Stores type information, so no re-parsing is needed on subsequent reads
- Can be read natively by LightGBM, Polars, and Pandas

### Train/Test Split Strategy

We use a **time-based split** rather than a random split:
- **Train:** 2012–2023 (all historical data)
- **Test:** 2024–2025 (held-out recent data)

This is important because it simulates real-world deployment — the model is trained on past assessments and evaluated on assessments it has never seen from a later period. A random split would leak temporal information (a house assessed in 2024 and another in 2014 might be near-identical, so random splitting would make the test too easy).

### Excluded Columns

Before writing Parquet, columns are dropped if they are:
- **Identifiers** — `certificate_number`, `uprn`, `address*`, `postcode` (no predictive value, privacy concern)
- **Geographic micro-data** — `constituency`, `local_authority` (too granular, would cause overfitting to specific areas; `region` is kept as a coarser geographic signal)
- **Leakage columns** — any value derived from the SAP calculation that would not be known at prediction time (see Section 2)

---

## 4. Stage 2 — Data Cleaning

**File:** `src/pipeline/cleaner.py`

### Construction Age Band Normalisation

The `construction_age_band` column is the most problematic in the entire dataset. It was recorded as free text by assessors over 14 years, resulting in a mix of valid and invalid values:

**Valid examples:** `"before 1900"`, `"1950-1966"`, `"England and Wales: 2012 onwards"`  
**Invalid examples:** `"A"`, `"1700"`, `"2108"`, `"Not applicable"`

The cleaning function `normalise_age_band()` applies a hierarchy of rules:

1. **Exact match** against a canonical dictionary of all known valid strings (including Scottish and England/Wales regional variants) → maps to integer codes 0–11
2. **Regex extraction** of a 4-digit year → maps to the appropriate band (e.g., year 1955 → code 3 for "1950-1966")
3. **Anything else** → `None` (LightGBM handles nulls natively via its split-finding algorithm)

The integer codes (0–11) preserve the **ordinal relationship** between age bands — a building from code 0 ("before 1900") is genuinely older and likely less energy efficient than code 11 ("2012 onwards"), and the model can learn this ordering.

### Numeric Outlier Clipping

Some numeric fields contain data entry errors. We clip to physically realistic ranges:

| Column | Min | Max | Reason |
|--------|-----|-----|--------|
| `total_floor_area` | 10 m² | 2000 m² | Smallest studio to large mansion |
| `number_habitable_rooms` | 1 | 30 | Physical limits |
| `floor_height` | 1.5 m | 10 m | Minimum ceiling height to warehouse |
| `flat_storey_count` | 1 | 100 | Ground-floor flat to skyscraper |
| `multi_glaze_proportion` | 0% | 100% | Percentage bounds |

### Structural Null Filling

Several columns have null values that are **not missing data** — they are null because the feature doesn't apply:

- `mains_gas_flag` is null for properties with no mains gas connection (not missing — they just don't have gas)
- `solar_water_heating_flag` is null for properties with no solar system
- `mechanical_ventilation` is null for properties with natural ventilation

These are filled with `"N"` (No) because null and "N" have the same meaning in context. Leaving them null would confuse the model into thinking there's missing information.

### Flat-Specific Column Filling

Columns like `floor_level`, `flat_storey_count`, `heat_loss_corridor`, and `unheated_corridor_length` only apply to flats and maisonettes. For houses and bungalows, these are always null.

These are filled with `-1` rather than `0` or the column mean. This is deliberate: `-1` is an out-of-range sentinel value that LightGBM can learn to split on — it will discover that `-1` means "this property is not a flat" and group all non-flats together in splits involving these columns. Using `0` would be ambiguous (ground floor is also 0).

---

## 5. Stage 3 — Feature Engineering

**File:** `src/pipeline/features.py`

Feature engineering transforms raw cleaned data into a format the model can learn from efficiently.

### Ordinal Encoding of Efficiency Ratings

Nine component efficiency columns follow the same 5-level scale assessed by the EPC surveyor:

```
"Very Good" → 4
"Good"      → 3
"Average"   → 2
"Poor"      → 1
"Very Poor" → 0
"N/A"       → -1  (feature not applicable)
```

Columns: `walls_energy_eff`, `roof_energy_eff`, `floor_energy_eff`, `windows_energy_eff`, `mainheat_energy_eff`, `mainheatc_energy_eff`, `hot_water_energy_eff`, `lighting_energy_eff`, `sheating_energy_eff`

These are ordinal-encoded (not one-hot encoded) because the ordering is meaningful — "Good" is genuinely between "Very Good" and "Average". Ordinal encoding also avoids the dimensionality explosion that one-hot encoding would cause with 5 values × 9 columns = 45 columns becoming 45 binary features.

### Binary Flag Encoding

Y/N flag columns are mapped to 1/0:

```
"Y"   → 1
"N"   → 0
null  → 0  (same as "N" for structural nulls)
```

Columns: `mains_gas_flag`, `solar_water_heating_flag`, `flat_top_storey`, `low_energy_lighting`, `photo_supply`

### Categorical Encoding

Categorical text columns (property type, fuel type, heating descriptions, etc.) are cast to Polars' `Categorical` dtype, which assigns each unique string an integer code internally. LightGBM natively handles categorical features through its `categorical_feature` parameter — it uses a special split-finding algorithm (Fisher's method) that groups categories optimally rather than treating the integer codes as ordered numbers.

This is important for columns like `main_fuel` (40+ values) or `mainheat_description` (dozens of distinct heating system descriptions), where the relationship between categories is complex and non-linear.

### Numeric Features

Kept as `Float32` (not Float64) to halve memory usage with no meaningful precision loss at this scale. Includes floor area, room counts, storey count, proportions, and the cleaned construction age band code.

### Feature Matrix

The final feature matrix used for training consists of approximately 50 columns selected from the cleaned dataset. The `build_feature_columns()` function returns only columns that are both in the desired list and actually present in the data, so the pipeline is robust to schema differences between years.

---

## 6. Stage 4 — Model Training

**File:** `src/model/train.py`

### Why LightGBM?

Several model families were considered:

| Model | Pros | Cons |
|-------|------|------|
| **LightGBM** | Fastest training, native categorical support, handles nulls, small model file, top accuracy on tabular data | Requires OpenMP on Mac |
| XGBoost | Similar accuracy, GPU support | Slower on CPU, no native categoricals |
| Random Forest | Robust, interpretable | Much slower, large model files |
| Neural Network (TabNet) | Can capture complex interactions | Requires more data prep, much slower, harder to deploy |
| Linear regression | Fast, interpretable | Cannot capture non-linear relationships between inputs and EPC score |

LightGBM wins on every practical dimension for this problem. EPC scores are determined by a complex non-linear interaction of physical features (e.g., an old building with cavity wall insulation and a modern boiler may score higher than a newer building with poor glazing), which gradient boosting handles excellently.

### Regression vs Classification

We frame this as **regression** (predicting the continuous SAP score 1–100) rather than classification (predicting the A–G category directly). This is better for several reasons:

1. **Preserves ordering information** — a score of 68 is close to 69 (C/D boundary); classification treats these the same as 68 vs 30
2. **More informative output** — we can show the exact predicted score, not just the band
3. **Better optimisation** — MAE loss is smooth and well-suited to gradient boosting
4. **Grade is derived** — once we have the score, the grade is a deterministic lookup against SAP thresholds

The **Mean Absolute Error (MAE)** loss function (`regression_l1`) is preferred over MSE because EPC scores have some genuine outliers (e.g., misclassified properties, data entry errors) and MAE is more robust to these — it doesn't square the error, so outliers have less influence on the model.

### Training Process

```
Load all Parquet files (19.3M rows)
           ↓
Hold out 5% as validation set (random)
           ↓
Train LightGBM on remaining 95% (~18.3M rows)
with early stopping: stop if validation MAE
doesn't improve for 50 consecutive rounds
           ↓
Save best model to data/models/lgbm_epc.txt
```

LightGBM builds trees sequentially. Each tree learns to correct the residual errors of all previous trees. The learning rate (0.111 from our search) controls how much each tree contributes — lower rates require more trees but generalise better.

### Score to Grade Conversion

After the model predicts a score, it is clipped to [1, 100] and converted to a letter grade using the official SAP 2012 thresholds:

```python
if score >= 92: return "A"
if score >= 81: return "B"
if score >= 69: return "C"
if score >= 55: return "D"
if score >= 39: return "E"
if score >= 21: return "F"
return "G"
```

---

## 7. Stage 5 — Hyperparameter Optimisation

**File:** `src/model/train.py` — `optuna_search()` function

### What Are Hyperparameters?

LightGBM has parameters that control how trees are built that cannot be learned from data — they must be set before training. The most important ones:

| Parameter | What it controls | Effect |
|-----------|-----------------|--------|
| `num_leaves` | Maximum leaves per tree | More leaves = more complex model; can overfit |
| `learning_rate` | Step size each tree takes | Lower = slower but more accurate |
| `feature_fraction` | % of features used per tree | Reduces correlation between trees |
| `bagging_fraction` | % of rows used per tree | Prevents overfitting |
| `min_child_samples` | Minimum rows in a leaf | Prevents very specific splits |
| `reg_alpha` / `reg_lambda` | L1/L2 regularisation | Penalises model complexity |

### Optuna Framework

We use **Optuna**, a Bayesian hyperparameter optimisation library. Unlike grid search (tries all combinations) or random search (tries random combinations), Optuna uses **Tree-structured Parzen Estimators (TPE)** — a probabilistic model that learns which regions of the hyperparameter space are promising and samples more densely from those regions. This makes it far more efficient than grid or random search.

### Search Strategy

To make the search tractable on a MacBook Pro:

1. **Sample 500,000 rows** from the full 19M training set, stratified by EPC grade band, so the sample has the same grade distribution as the full dataset
2. **2-fold cross-validation** per trial — each trial trains two models, one on each fold, and averages their validation MAE
3. **200 maximum rounds** per CV model — enough to compare hyperparameters without training to convergence
4. **30 trials** — sufficient for TPE to identify the good region of parameter space

The optimal parameters found were:
```
num_leaves:        666
learning_rate:     0.111
feature_fraction:  0.510
bagging_fraction:  0.985
bagging_freq:      9
min_child_samples: 122
reg_alpha:         0.00081
reg_lambda:        0.00083
Best CV MAE:       2.78
```

These were then used for the final full-data training run, which achieved **MAE 2.48** on the validation set — better than the search MAE because the full dataset provides many more examples.

---

## 8. Stage 6 — Model Evaluation

**File:** `src/model/evaluate.py`

### Metrics

**Mean Absolute Error (MAE)**  
Average difference between predicted and true SAP score. Our model achieved **2.48 points** on the validation set. In context: the D grade band spans 13 points (55–68), so an average error of 2.48 means most predictions land comfortably within the correct band.

**Exact Grade Accuracy**  
Percentage of predictions where the predicted A–G grade exactly matches the true grade. Expected: >85%.

**Within-1-Band Accuracy**  
Percentage where the predicted grade is within one band of the true grade (e.g., predicting C for a true D). Expected: >97%. This is the practically important metric — a homeowner told "C" when their property is actually "D" is only mildly misled, but telling an "E" property it is "B" is seriously wrong.

**Confusion Matrix**  
A 7×7 matrix showing the distribution of predictions vs. true grades. Ideally, all mass is on the diagonal (correct) or adjacent cells (off by one band).

### SHAP Analysis

**SHAP (SHapley Additive exPlanations)** values decompose each prediction into the contribution of each feature. For a prediction of "score 65 (grade D)", SHAP might show:
- `mainheat_energy_eff = Average` contributed −8 points (pulling score down)
- `walls_energy_eff = Good` contributed +5 points (pushing score up)
- `total_floor_area = 85m²` contributed +2 points
- etc.

The SHAP summary plot shows the 20 most influential features across the test set, helping validate that the model has learned physically sensible relationships (e.g., better insulation → higher score).

### Per-Property-Type Breakdown

Because the dataset contains very different property types (a detached house vs. a top-floor flat have fundamentally different physics), we report MAE and grade accuracy separately for:
- House
- Flat
- Bungalow
- Maisonette
- Park home

---

## 9. Stage 7 — Recommendations System

**File:** `src/recommendations/lookup.py`

### Design Approach

Rather than training a second ML model to predict improvements, we use a **data-driven lookup** built from the recommendations table. This is more interpretable, requires no additional training time, and leverages the direct recommendations made by real assessors for millions of properties.

### Build Process

Using DuckDB to join the certificates and recommendations tables across all years:

```sql
SELECT
    c.property_type,
    c.built_form,
    c.current_energy_rating,
    r.improvement_id,
    ANY_VALUE(r.improvement_summary_text) AS improvement_summary,
    COUNT(*) AS frequency,
    MEDIAN(parsed_cost) AS median_cost_estimate
FROM recommendations r
JOIN certificates c ON r.certificate_number = c.certificate_number
GROUP BY property_type, built_form, current_energy_rating, improvement_id
ORDER BY frequency DESC
```

This produces a table of ~15,000 rows (one per unique combination of property type, built form, grade, and improvement type), ranked by how frequently each improvement was recommended.

### Lookup at Prediction Time

When a user submits their property:
1. The model predicts the current grade (e.g., "D")
2. The lookup finds the top 8 most frequent improvements for `(property_type, built_form, "D")` properties
3. Falls back to `(property_type, "D")` if no exact match, then just `("D")` as a last resort
4. Returns each improvement with its median estimated cost

This gives the user a ranked, cost-annotated list of improvements that real assessors have recommended for properties like theirs at that rating — grounded in real assessment data rather than generic advice.

---

## 10. Stage 8 — API

**File:** `api/main.py`, `api/routers/`, `api/schemas.py`

### FastAPI

FastAPI is a modern Python web framework that:
- Uses Python type hints to generate automatic request validation (via Pydantic)
- Auto-generates interactive API documentation at `/docs`
- Handles async requests efficiently via ASGI (Uvicorn)
- Returns detailed 422 validation errors for malformed requests

### Endpoints

**`POST /api/predict`**  
Accepts a full property description (matching the web form fields), runs it through the feature encoding pipeline and LightGBM model, and returns:
```json
{
  "efficiency_score": 65.3,
  "letter_grade": "D",
  "score_low": 60.3,
  "score_high": 70.3,
  "grade_low": "D",
  "grade_high": "D"
}
```
The `score_low`/`score_high` range represents an approximate ±5-point uncertainty interval. This could be refined using quantile regression (LightGBM supports this) in a future version.

**`POST /api/recommendations`**  
Same input; internally calls `/api/predict` to get the grade, then looks up improvements and returns:
```json
{
  "current_grade": "D",
  "recommendations": [
    {
      "improvement_summary": "Floor insulation (solid floor)",
      "median_cost_estimate": 5000.0,
      ...
    }
  ]
}
```

**`GET /api/health`**  
Simple readiness check; confirms model is loaded.

### Model Loading

The model is loaded **once at startup** (in the `lifespan` context manager) and kept in memory for the lifetime of the process. Inference on a single property takes <1 ms, so the API can handle thousands of requests per second on a single process.

### CORS

The API allows requests from `localhost:3000` (the Next.js dev server) and can be extended for production deployment.

---

## 11. Stage 9 — Web Application

**Directory:** `web/`

### Stack

- **Next.js 16** with the App Router
- **TypeScript** for type safety across the form schema
- **Tailwind CSS v4** for styling

### Multi-Step Form

The form is broken into four sections to reduce cognitive load:

1. **Property Basics** — type, built form, age band, floor area, rooms, tenure, region
2. **Building Envelope** — walls, roof, floor, windows (description + efficiency rating for each)
3. **Heating & Energy** — fuel type, heating system, hot water, lighting, renewables
4. **Additional Details** — flat-specific fields (floor level, storey count, top storey, corridor)

Each step collects data into a shared `PropertyInput` state object. The TypeScript type matches the Pydantic schema on the API exactly, so validation is consistent end-to-end.

### Results Page

The results component renders:
- **EPC certificate graphic** — the A–G colour scale (official UK EPC colours) with the predicted grade highlighted and enlarged
- **Numeric score** with the uncertainty range
- **Recommendations table** — improvements with estimated costs, drawn from the lookup

### Colour Scheme

The official UK EPC band colours are used exactly:
- A: `#009900` (deep green)
- B: `#44dd00` (light green)
- C: `#aade00` (yellow-green)
- D: `#eecc00` (yellow)
- E: `#ffaa00` (amber)
- F: `#ff6600` (orange)
- G: `#dd0000` (red)

---

## 12. Running the Full Pipeline

### Prerequisites

```bash
# System
brew install libomp       # Required for LightGBM on macOS

# Python environment
uv venv --python 3.11
uv pip install -e ".[dev]"

# Node.js
pnpm --dir web install --ignore-scripts
```

### Step-by-Step Execution

```bash
# 1. Convert CSVs to Parquet (one-time, ~1–2 hours)
uv run python -m src.pipeline.loader

# 2. Hyperparameter search + full training (~1.5 hours total)
uv run python -m src.model.train --search --full

# 3. Build recommendations lookup (~15 minutes)
uv run python -m src.recommendations.lookup --build

# 4. Evaluate the model
uv run python -m src.model.evaluate

# 5a. Start the API (Terminal 1)
uv run uvicorn api.main:app --reload --port 8000

# 5b. Start the web app (Terminal 2)
pnpm --dir web dev
```

Open `http://localhost:3000`.

### Testing

```bash
# Unit tests (no model required)
uv run pytest tests/unit/ -v

# Integration tests (requires trained model)
uv run pytest tests/integration/ -v
```

---

## 13. Performance Results

### Training Data

| Split | Years | Rows |
|-------|-------|------|
| Train | 2012–2023 | ~19.3M |
| Test | 2024–2025 | ~6M |

### Model Performance (Validation Set)

| Metric | Value |
|--------|-------|
| MAE (SAP score) | **2.48 points** |
| Boosting rounds | 2000 (early stopping not triggered — still improving) |
| Training time | ~36 minutes on Apple M-series |

### Context

The SAP score range is 1–100. An MAE of 2.48 means:
- The average prediction is within 2.5 efficiency points of the true score
- The narrowest grade band (A: 92–100) is 8 points wide; D (the most common, 55–68) is 13 points wide
- At MAE 2.48, the vast majority of predictions will fall in the correct grade or be off by at most one band

**Note:** The model was trained on assessor-reported component efficiency ratings (`walls_energy_eff`, `mainheat_energy_eff`, etc.) as features. This is valid because these ratings describe observable physical states that a homeowner can know or estimate. They are distinct from the outputs of the SAP calculation itself (energy consumption, CO₂ emissions, costs), which were excluded.

---

## 14. Design Decisions and Trade-offs

### Why DuckDB instead of Spark or Dask?

Spark and Dask are distributed frameworks designed for multi-machine clusters. For a single MacBook Pro with 55 GB of data, DuckDB is superior: it uses a single-process columnar engine with SIMD optimisation, streams files without loading them fully into RAM, and requires zero cluster setup. DuckDB can process the full 55 GB in about 1–2 hours on modern Apple Silicon.

### Why regression instead of multi-class classification?

Predicting the continuous SAP score (regression) is better than directly predicting the A–G class (classification) because:
1. The model can learn that 68 and 69 are similar (D/C boundary), rather than treating the boundary as a hard cliff
2. The numeric score is more informative to users than just the grade
3. Regression MAE is a better loss function for this problem than cross-entropy

### Why a single model rather than per-property-type models?

One model for all property types is simpler to maintain and deploy (one file, one API endpoint). The model uses `property_type` and `built_form` as features, so it learns property-type-specific patterns internally. The flat-specific columns filled with −1 effectively tell the model "this feature is not applicable to this property type." Per-property-type models would require choosing between five separate models at inference time and would not share any learned knowledge across types.

### Why a lookup for recommendations rather than a second ML model?

The recommendations table contains explicit, assessor-certified improvements for real properties. Aggregating these by `(property_type, built_form, grade)` gives a natural, data-grounded ranking of improvements. A second ML model would need to predict which improvements are applicable and cost-effective — a much harder problem that would require significantly more feature engineering and would be harder to validate. The lookup approach is transparent, auditable, and leverages domain expertise already embedded in the data.

### Why time-based train/test split?

A random 80/20 split would allow the model to learn from 2024 data while being tested on 2023 data — temporally inconsistent. The time-based split (train on 2012–2023, test on 2024–2025) simulates the real deployment scenario and ensures the evaluation reflects how the model will perform on genuinely new properties it has never seen.

### Remaining headroom for improvement

The model hit 2000 boosting rounds without triggering early stopping (still improving at round 2000). Increasing `num_boost_round` to 3000–4000 in `train.py` and retraining would likely reduce MAE by a further ~0.02–0.03 points — marginal but free. The bigger gains would come from:
1. Including 2024–2025 data in training (they are currently test-only)
2. Adding postal district as a feature (captures regional climate effects more precisely than `region`)
3. Quantile regression to produce calibrated confidence intervals rather than ±5 fixed points
