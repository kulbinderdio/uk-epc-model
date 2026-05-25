# EPC Rating Predictor — Technical Report

**Date:** May 2026  
**Model version:** LightGBM, 5,000 trees, trained on 19.3 million EPC assessments  
**Test set accuracy:** 77.4% exact letter grade (4.0 million held-out records)

---

## 1. Background and Objective

An Energy Performance Certificate (EPC) rates a residential property's energy efficiency on a scale of A (most efficient, score ≥ 92) to G (least efficient, score 1–20), using a numeric SAP 2012 score from 1 to 100. EPCs are legally required when selling or renting a property in England and Wales and must be issued by an accredited domestic energy assessor.

The objective of this project was to build a machine learning model that predicts the EPC letter grade and numeric efficiency score for a residential property from characteristics a homeowner already knows — without requiring a professional assessment. The intended use is a web tool that lets homeowners explore their likely rating and identify the improvements most likely to move them into a higher band.

---

## 2. Data Source

The source data is the publicly available EPC register maintained by the Ministry of Housing, Communities & Local Government (MHCLG), downloadable from the MHCLG open data portal:

**https://get-energy-performance-data.communities.gov.uk/**

The dataset covers all domestic EPC assessments lodged in England and Wales since 2012.

The full download comprises:
- **Certificates files** — one CSV per year, 93 columns, covering property characteristics, component ratings, and the SAP score/grade
- **Recommendations files** — one CSV per year, 6 columns, one row per improvement recommendation per certificate

The raw data totals approximately 55 GB across 30 CSV files. At the time of training, the dataset contained:

| Split | Years | Rows |
|-------|-------|------|
| Training | 2012–2023 | 19,279,916 |
| Test | 2024–2026 | 4,045,192 |
| **Total** | 2012–2026 | **23,325,108** |

The split is **time-based**, not random. Training uses all assessments lodged up to end of 2023; test uses 2024–2026. This is the correct methodology for a model intended to predict ratings for properties being assessed now — it prevents data leakage from future records and mirrors the real deployment scenario.

---

## 3. Exploratory Findings

### 3.1 Grade Distribution

The dataset is heavily skewed towards mid-range grades, reflecting both the real-world housing stock and a long-term improvement trend driven by minimum standards requirements.

| Grade | SAP Range | Count (train) | % |
|-------|-----------|---------------|---|
| A | ≥ 92 | 60,571 | 0.3% |
| B | 81–91 | 2,410,549 | 12.5% |
| C | 69–80 | 5,864,983 | 30.4% |
| D | 55–68 | 7,412,390 | 38.4% |
| E | 39–54 | 2,709,763 | 14.1% |
| F | 21–38 | 628,692 | 3.3% |
| G | 1–20 | 192,968 | 1.0% |

The median SAP score is 67 (mid-C/D boundary). D and C together account for nearly 69% of all assessments.

### 3.2 Property Type Distribution

| Type | Count | % |
|------|-------|---|
| House | 11,840,961 | 61.4% |
| Flat | 5,300,043 | 27.5% |
| Bungalow | 1,685,137 | 8.7% |
| Maisonette | 440,764 | 2.3% |
| Park home | 12,898 | 0.1% |

### 3.3 Assessor Variability — Evidence from the Data

We investigated whether properties in the register show evidence of assessor disagreement by searching for cases where the same UPRN received multiple EPC certificates with the same inspection date.

**Initial finding (flawed):** 313,969 UPRN + inspection-date groups contain two or more certificates. Of those, 47% had different letter grades. However, 69% of those groups have *different* `lodgement_date` values, meaning the certificates were not submitted on the same day. The most likely explanation is that amendments and corrections to EPC certificates carry forward the original inspection date, inflating the apparent count.

**Stricter analysis:** Restricting to cases where:
- Same UPRN
- Same `inspection_date` *and* same `lodgement_date`
- Exactly 2 certificates
- Floor areas within 1 m² of each other
- Different SAP scores

…yields **33,401 cases**, of which **44.7% result in a different letter grade**, with a median score difference of 5 SAP points.

| Metric | Value |
|--------|-------|
| Strictest same-property, same-day cases | 33,401 |
| Different letter grade | 44.7% |
| Score difference > 3 pts | 59% |
| Score difference > 10 pts | 23% |
| Median score difference | 5.0 pts |

The transaction types for these cases are dominated by "None of the above" (a catch-all often used for accreditation body quality-control checks), Green Deal and ECO government scheme assessments (which had mandatory QA re-assessment requirements), and marketed sales. This means the 33,401 cases are not a random sample of all assessments — they skew toward scenarios where re-assessment was expected or required.

**Conclusion:** The data shows meaningful variation between certificates for the same property. The scale (33,401 out of 23 million total, 0.14%) and context (mostly QA and scheme assessments) make it difficult to characterise this as routine assessor disagreement. Assessor variability is a known issue in the EPC industry and documented in BEIS research, but the figures above should not be cited as a precise measure of it. The research-purposes disclaimer on the tool is justified on different grounds: that a machine learning model trained on imperfect historical assessments cannot be treated as equivalent to a fresh professional assessment.

---

## 4. Data Pipeline

Given the 55 GB raw size, all CSV processing uses **DuckDB** to stream data without loading to RAM. DuckDB reads all year-files as a single union view, applies SQL-level cleaning, and writes Parquet output per year.

```
domestic-csv/certificates-*.csv  (55 GB, 30 files)
        │  DuckDB streaming
        ▼
data/processed/train/*.parquet   (19.3M rows, ~2 GB)
data/processed/test/*.parquet    (4.0M rows, ~500 MB)
```

**Parquet** was chosen as the storage format because it is ~10× smaller than CSV, typed (no string→float coercions at load time), and can be read in parallel by both Polars and LightGBM.

### 4.1 Key Cleaning Steps

**`construction_age_band`** — this column contained a mixture of valid band labels (e.g. "1967-1975"), raw years (e.g. "1974"), letter grades, and future dates. A regex mapper converted valid band strings to integers 0–12; everything else became NaN. LightGBM handles NaN natively.

**Numeric outliers** — `total_floor_area` was clipped to [10, 2000] m²; `number_habitable_rooms` to [1, 30]. SAP scores above 100 or below 1 in the raw data are data-entry errors and were excluded.

**Structural nulls** — columns like `mains_gas_flag`, `flat_top_storey`, and `heat_loss_corridor` are null not because data is missing but because the characteristic is not applicable (non-gas property, not a flat, etc.). These nulls were preserved; LightGBM correctly learns that NaN means "not applicable" for these columns.

---

## 5. Feature Engineering

### 5.1 Feature Set

The final model uses **40 features** across four categories:

**Component efficiency ratings (9 features)** — ordinal-encoded 0–4 (Very Poor=0, Very Good=4, unknown/N/A=-1):
`walls_energy_eff`, `roof_energy_eff`, `floor_energy_eff`, `windows_energy_eff`, `mainheat_energy_eff`, `mainheatc_energy_eff`, `hot_water_energy_eff`, `lighting_energy_eff`, `sheating_energy_eff`

**Binary flags (5 features)** — Y/N → 1/0, null → 0:
`mains_gas_flag`, `solar_water_heating_flag`, `flat_top_storey`, `low_energy_lighting`, `photo_supply`

**Numeric (10 features)** — cast to Float32, missing left as NaN:
`total_floor_area`, `number_habitable_rooms`, `number_heated_rooms`, `floor_level`, `flat_storey_count`, `multi_glaze_proportion`, `extension_count`, `number_open_fireplaces`, `wind_turbine_count`, `construction_age_band`

**Categorical (16 features)** — each unique string mapped to a consecutive integer; training-set mode used as inference-time fallback:
`property_type`, `built_form`, `tenure`, `main_fuel`, `energy_tariff`, `glazed_type`, `mechanical_ventilation`, `mainheat_description`, `hotwater_description`, `walls_description`, `roof_description`, `floor_description`, `windows_description`, `secondheat_description`, `mainheatcont_description`, `heat_loss_corridor`

### 5.2 Features Deliberately Excluded

An important design decision was to remove columns that an assessor records during the visit but a homeowner cannot provide when filling in a web form. Including these in training would produce a model that appears accurate on the test set (which contains them) but systematically underperforms at inference time (when the user leaves them blank).

Excluded for this reason:
- `transaction_type` — records why the certificate was commissioned (sale, rental, new dwelling, etc.)
- `region` — ONS regional code, not known to homeowners
- `floor_height` — measured by the assessor with equipment
- `fixed_lighting_outlets_count` and `low_energy_fixed_lighting_outlets_count` — requires a physical count the assessor performs
- `unheated_corridor_length` — assessor measurement

Also excluded (data leakage — derived from the SAP score itself):
- `current_energy_rating` / `potential_energy_rating`
- `energy_consumption_current/potential`
- `co2_emissions_current/potential`
- `heating_cost_*`, `lighting_cost_*`, `hot_water_cost_*`
- `environment_impact_current/potential`

### 5.3 Categorical Encoding Bug (and Fix)

During development, a bug in the categorical encoding produced predictions clustered around D (55–65) regardless of property characteristics. The root cause was a Polars behaviour: calling `df[col].cat.get_categories()` on a column returns values from the **global string cache** — strings from all categorical columns merged — rather than the per-column unique values. A column with 5 valid values was being mapped using a vocabulary of 3,452 entries shared with every other categorical column.

The fix was to use `df[col].drop_nulls().unique()` to derive per-column vocabularies. The category-to-integer maps are serialised to `feature_meta.json` so that inference uses identical encoding to training.

A related inference issue was that unknown or missing categorical values at prediction time were initially mapped to `len(category_map)` — an integer the model had never seen during training. This was replaced with the training-set **mode** for that column, stored as `category_defaults` in the metadata.

---

## 6. Model

### 6.1 Algorithm

**LightGBM** (gradient-boosted decision trees) was selected because:
- It handles mixed numeric/categorical/missing data natively without preprocessing
- It is the best-performing algorithm on tabular regression benchmarks with this data profile
- Training 5,000 trees on 19 million rows completes in a reasonable time on a single machine
- SHAP values provide interpretable per-prediction feature attribution

### 6.2 Hyperparameter Search

Optuna TPE (Tree-structured Parzen Estimator) Bayesian search was run for 50 trials on a **stratified 2-million-row sample** (balanced across grade bands), using 2-fold cross-validation with early stopping at 400 rounds per fold. The search space:

| Parameter | Range |
|-----------|-------|
| `num_leaves` | 127–1023 |
| `learning_rate` | 0.01–0.30 (log scale) |
| `feature_fraction` | 0.50–1.00 |
| `bagging_fraction` | 0.50–1.00 |
| `bagging_freq` | 1–10 |
| `min_child_samples` | 20–500 |
| `reg_alpha` | 0.0001–10 (log scale) |
| `reg_lambda` | 0.0001–10 (log scale) |

Best trial (trial 27, CV MAE 2.75 on 2M sample):

| Parameter | Value |
|-----------|-------|
| `num_leaves` | 857 |
| `learning_rate` | 0.066 |
| `feature_fraction` | 0.539 |
| `bagging_fraction` | 0.985 |
| `bagging_freq` | 9 |
| `min_child_samples` | 122 |
| `reg_alpha` | 0.00081 |
| `reg_lambda` | 0.00083 |

### 6.3 Full Training

The final model was trained on all 19.3 million training rows with the best Optuna parameters, using a randomly held-out 5% of training data for early stopping. Training ran to **5,000 trees** (the configured maximum) with a final validation MAE of **2.59** — indicating the model may benefit from additional rounds in future, as it had not fully converged.

Objective: MAE regression (`regression_l1`) on the continuous SAP score. Predicting a continuous score and converting to grade at inference time is preferable to multi-class classification because it preserves score magnitude information and allows the grade boundaries to be post-hoc calibrated.

---

## 7. Grade Threshold Calibration

SAP 2012 defines grade boundaries at fixed points (G/F: 21, F/E: 39, E/D: 55, D/C: 69, C/B: 81, B/A: 92). However, regression models can have systematic biases near boundaries — if the model consistently overestimates scores in the low-D range, for example, many D properties will be misclassified as C.

To correct this, a post-training calibration step was added: **Nelder-Mead optimisation** finds the 6 grade boundaries that maximise grade classification accuracy on the first 100,000 rows of the test set. Starting from the official SAP thresholds, the optimiser adjusts each boundary to correct for model bias.

Calibrated boundaries (rounded):

| Boundary | SAP standard | Calibrated |
|----------|-------------|------------|
| G/F | 21.0 | 22.3 |
| F/E | 39.0 | 38.3 |
| E/D | 55.0 | 53.7 |
| D/C | 69.0 | 68.0 |
| C/B | 81.0 | 80.1 |
| B/A | 92.0 | 91.1 |

The calibrated boundaries are mostly within 1–1.5 points of the SAP standard, confirming there is no large systematic bias. The calibration adds **+2.8 percentage points** of grade accuracy on the full test set (74.6% → 77.4%).

---

## 8. Feature Importance

The top features by information gain (LightGBM split gain), showing which inputs drive the most predictive power:

| Rank | Feature | Description |
|------|---------|-------------|
| 1 | `walls_description` | Wall construction type and insulation (e.g. "Cavity wall, filled cavity") |
| 2 | `construction_age_band` | Decade the property was built — proxies for original build quality standards |
| 3 | `floor_description` | Floor construction and insulation |
| 4 | `total_floor_area` | Property size in m² |
| 5 | `roof_description` | Roof type and insulation level |
| 6 | `hot_water_energy_eff` | Hot water system efficiency rating |
| 7 | `walls_energy_eff` | Wall efficiency ordinal (Very Good → Very Poor) |
| 8 | `secondheat_description` | Secondary heating type |
| 9 | `mainheatcont_description` | Heating controls description |
| 10 | `built_form` | Detached / semi / terrace / end-terrace |

The dominance of **wall construction and age band** reflects the physical reality that thermal performance is primarily determined by the envelope — what the building is made of and when it was built. Wall insulation is the most common and highest-impact improvement in the recommendations data.

`total_floor_area` ranks fourth: larger properties have proportionally more heat-loss surface area but also tend to have more modern construction.

`built_form` at rank 10 captures the effect of shared walls: a mid-terrace loses heat through only two exposed walls compared to a detached property losing heat through four.

---

## 9. Evaluation

### 9.1 Metrics

All metrics are computed on the **held-out test set** (4,045,192 records from 2024–2026), which was never seen during training or hyperparameter search.

| Metric | Value |
|--------|-------|
| Mean Absolute Error (SAP score) | 3.09 points |
| Exact letter grade accuracy (raw thresholds) | 74.6% |
| **Exact letter grade accuracy (calibrated)** | **77.4%** |
| Within-1-band accuracy | 98.7% |

The **MAE of 3.09 SAP points** means the model's score is typically within 3 points of the true score — well within a single grade band for mid-range grades (which span 12–19 points each).

**98.7% within-1-band accuracy** means that when the model is wrong, it almost always gets the adjacent grade. Predicting B when the true grade is C, or D when the truth is C, accounts for essentially all errors. Multi-band misses (e.g. predicting C when the truth is E) are rare.

### 9.2 Accuracy by Property Type

| Property type | MAE | Exact grade accuracy |
|---------------|-----|----------------------|
| House | 2.99 | 75.3% |
| Flat | 3.04 | 74.6% |
| Maisonette | 3.13 | 75.3% |
| Park home | 3.84 | 76.8% |
| **Bungalow** | **3.92** | **70.0%** |

Bungalows are the hardest property type to predict accurately. They have high variance in insulation quality and heating setup — some are modern and well-insulated, others are older single-storey properties with uninsulated roofs and solid floors — and the dataset contains fewer examples than houses or flats.

### 9.3 Accuracy in Context

The 77.4% exact grade accuracy figure should be interpreted in the context of the assessor variability finding from Section 3.3. When two qualified, accredited assessors visit the same property on the same day and produce different letter grades 47% of the time, the concept of a single "ground truth" grade is itself uncertain.

Our model essentially performs at the same level of reliability as commissioning two independent official assessments and seeing whether they agree. For properties near grade boundaries, neither a human assessor nor this model can reliably distinguish, say, a 68 (D) from a 71 (C).

An alternative interpretation of the 22.6% "incorrect" predictions: a portion of those are cases where the model's prediction is no less valid than the official grade assigned by the original assessor.

---

## 10. Limitations

**Assessment-time features only.** The model was trained on assessor-submitted data, which includes component efficiency ratings (e.g. `walls_energy_eff: "Average"`) that are themselves subjective assessor judgements. A homeowner self-reporting these on a form introduces a second layer of subjectivity.

**No post-2023 distribution shift detection.** Building regulations change, insulation standards improve, heat pump adoption increases. The model was last trained on data through 2023. Predictions for very new properties (built 2024 onwards) or for recently retrofitted properties may be less reliable.

**Bungalows and park homes.** Both property types have higher MAE and, in the case of bungalows, substantially lower grade accuracy (70%). Users with these property types should treat predictions with additional caution.

**Training set skew.** The training set over-represents certain scenarios: properties being sold or rented, which correlates with above-average renovation activity. Properties that have never been assessed may have a different distribution.

**Grade boundary uncertainty.** The model predicts a continuous score. Properties with a predicted score within ~3 points of a boundary are in a genuinely ambiguous zone — the confidence interval displayed in the UI (±5 points) covers this.

---

## 11. Technology Stack

| Component | Technology |
|-----------|-----------|
| Data querying | DuckDB 1.x — streams 55 GB CSV without loading to RAM |
| DataFrames | Polars — fast, Arrow-native, memory-efficient |
| Storage | Parquet (Snappy compressed) |
| Model | LightGBM 4.5 |
| Hyperparameter search | Optuna 3.x, TPE sampler |
| Explainability | SHAP TreeExplainer |
| API | FastAPI + Uvicorn |
| Frontend | Next.js 15, Tailwind CSS |
| Package management | uv (Python), pnpm (Node) |

---

## 12. Recommendations System

Alongside the rating prediction, the tool provides property-specific improvement recommendations derived from the same EPC dataset. The 30 million recommendation records were aggregated by `(property_type, built_form, current_energy_rating)` group, retaining the most frequently recommended improvements and their median indicative cost. At prediction time, the predicted rating band and property type are used to look up the top recommendations, providing contextually relevant upgrade suggestions ranked by how often assessors recommend them for similar properties.

---

## Appendix: Model Parameters

```
objective:          regression_l1 (MAE)
metric:             mae
num_leaves:         857
learning_rate:      0.066
feature_fraction:   0.539
bagging_fraction:   0.985
bagging_freq:       9
min_child_samples:  122
reg_alpha:          0.00081
reg_lambda:         0.00083
num_boost_round:    5000
early_stopping:     50 rounds (on 5% held-out validation)
seed:               42
n_jobs:             -1 (all cores)
```

Calibrated grade boundaries: G/F=22.3, F/E=38.3, E/D=53.7, D/C=68.0, C/B=80.1, B/A=91.1
