---
language:
- en
license: mit
tags:
- lightgbm
- tabular-regression
- energy
- epc
- uk
- property
datasets: []
metrics:
- mae
model-index:
- name: uk-epc-model
  results:
  - task:
      type: tabular-regression
    metrics:
    - type: mae
      value: 3.09
      name: MAE (SAP score, test set 2024–2026)
---

# UK EPC Rating Predictor

A LightGBM gradient-boosted tree model that predicts residential Energy Performance Certificate (EPC) ratings for properties in England and Wales.

Given property characteristics a homeowner already knows (wall type, heating system, floor area, age band, etc.), the model predicts:
- A numeric SAP 2012 efficiency score (1–100)
- A letter grade (A–G)

## Model details

| Detail | Value |
|--------|-------|
| Algorithm | LightGBM (gradient-boosted trees) |
| Objective | MAE regression (`regression_l1`) |
| Trees | 5,000 |
| Leaves per tree | up to 857 |
| Features | 40 |
| Training rows | 19,279,916 |
| Test rows | 4,045,192 |
| MAE (test set) | 3.09 SAP points |
| Exact grade accuracy | 77.4% (calibrated) |
| Within-1-band accuracy | 98.7% |

## Training data

Trained on the public EPC register maintained by MHCLG, covering all domestic EPC assessments lodged in England and Wales from 2012 to 2023.

- **Source:** https://get-energy-performance-data.communities.gov.uk/
- **Train split:** 2012–2023 (19.3M records)
- **Test split:** 2024–2026 (4.0M records) — time-based split to simulate real deployment

## Features

The model uses 40 features across four categories:
- **Component efficiency ratings** (9): walls, roof, floor, windows, main heating, heating controls, hot water, lighting, secondary heating
- **Binary flags** (5): mains gas, solar water heating, solar PV, low energy lighting, flat top storey
- **Numeric** (10): floor area, room counts, floor level, storey count, glazing proportion, age band, etc.
- **Categorical** (16): property type, built form, fuel type, heating system description, wall/roof/floor descriptions, etc.

Assessor-only fields not available to homeowners (transaction type, floor height, lighting outlet counts) are excluded from the feature set.

## Usage

```python
import lightgbm as lgb
import json
import numpy as np

# Load model
booster = lgb.Booster(model_file="lgbm_epc.txt")
meta = json.loads(open("feature_meta.json").read())

# See the full inference pipeline at:
# https://github.com/kulbinderdio/uk-epc-model/blob/main/src/model/predict.py
```

The full inference pipeline (including categorical encoding and grade threshold calibration) is in [`src/model/predict.py`](https://github.com/kulbinderdio/uk-epc-model/blob/main/src/model/predict.py) in the GitHub repository.

## Grade calibration

After training, grade boundaries are optimised using Nelder-Mead minimisation on the first 100K test rows. Calibrated boundaries (vs SAP 2012 standard):

| Boundary | SAP standard | Calibrated |
|----------|-------------|------------|
| G/F | 21.0 | 22.3 |
| F/E | 39.0 | 38.3 |
| E/D | 55.0 | 53.7 |
| D/C | 69.0 | 68.0 |
| C/B | 81.0 | 80.1 |
| B/A | 92.0 | 91.1 |

Calibrated thresholds are stored in `feature_meta.json`.

## Accuracy by property type

| Type | MAE | Exact grade accuracy |
|------|-----|----------------------|
| House | 2.99 | 75.3% |
| Flat | 3.04 | 74.6% |
| Maisonette | 3.13 | 75.3% |
| Park home | 3.84 | 76.8% |
| Bungalow | 3.92 | 70.0% |

## Top features (by gain)

1. `walls_description` — wall construction and insulation type
2. `construction_age_band` — decade the property was built
3. `floor_description` — floor construction and insulation
4. `total_floor_area` — property size in m²
5. `roof_description` — roof type and insulation level

## Limitations

- Predictions are estimates only — not a substitute for an official EPC from an accredited assessor
- Higher uncertainty near grade boundaries (±3 SAP points)
- Bungalows have lower accuracy (70%) due to higher variance in insulation setups
- Model trained on assessor-submitted data; self-reported inputs add a further layer of uncertainty

## Repository

Full source code, training pipeline, API, and web frontend:  
https://github.com/kulbinderdio/uk-epc-model

## License

MIT
