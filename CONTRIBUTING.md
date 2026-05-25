# Contributing

Contributions are welcome. Please read this before opening a pull request.

## What we welcome

- Bug fixes
- Accuracy improvements (better features, hyperparameter tuning, calibration)
- Documentation improvements
- Additional property type support or edge-case handling
- Frontend UX improvements

## What we don't accept

- Changes that add dependencies without a clear justification
- Model files or raw data committed to the repository (see below)

## Do not commit data or model files

The `data/` directory and `domestic-csv/` are in `.gitignore` and must stay that way. The trained model (`lgbm_epc.txt`) is 449 MB and should never be committed. See the README for how to reproduce them from scratch.

## Getting started

```bash
git clone https://github.com/<org>/epc.git
cd epc
uv sync
cd web && pnpm install && cd ..
```

You'll need to follow Steps 4–5 in the README to generate the processed data and train the model before running the API locally.

## Running tests

```bash
uv run pytest tests/
```

All tests must pass before a PR can be merged.

## Code style

Python: [Ruff](https://docs.astral.sh/ruff/) is configured in `pyproject.toml`.

```bash
uv run ruff check .
uv run ruff format .
```

TypeScript: ESLint via Next.js defaults.

```bash
cd web && pnpm lint
```

## Submitting a pull request

1. Fork the repository and create a branch from `main`.
2. Make your changes with tests where applicable.
3. Run `uv run pytest tests/` and `cd web && pnpm lint` — both must pass.
4. Open a PR with a clear description of what changed and why.

## Reporting issues

Please open a GitHub issue with:
- What you expected to happen
- What actually happened
- Steps to reproduce (including OS, Python version, and relevant command output)
