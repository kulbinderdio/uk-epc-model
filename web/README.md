# EPC Web App

Next.js 15 frontend for the EPC Rating Predictor.

See the [project README](../README.md) for full setup and reproduction instructions.

## Quick start

```bash
pnpm install
pnpm dev        # development server at http://localhost:3000
```

The API server must be running at `http://localhost:8000` (or set `NEXT_PUBLIC_API_URL` in `.env.local`).

## Scripts

| Command | What it does |
|---------|-------------|
| `pnpm dev` | Development server with hot reload |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | ESLint check |

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Base URL of the FastAPI backend |

Create `web/.env.local` to override locally (not committed to version control).
