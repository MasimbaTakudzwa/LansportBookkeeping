# Lansport Analytics

Financial data analysis and visualisation platform for Lansport Investments.

Transforms the Excel accounting workbook into interactive dashboards with per-unit
profitability analysis, revenue trends, expense breakdowns, cash flow tracking, a
searchable general ledger, and key financial ratios — across the 17-unit rental portfolio.

---

## Features

| Module | Description |
|---|---|
| **Executive Dashboard** | KPI cards (revenue, expenses, net income, cash, margin, occupancy) + 3 charts + date range filter |
| **Per-Unit Profitability** | Sortable table showing revenue, R&M, levy, net income and margin % per unit |
| **Revenue Analytics** | Month-on-month trend chart, revenue-by-unit horizontal bar chart, league table |
| **Expense Analytics** | Expense trend chart, donut breakdown by account, sortable category table |
| **Cash Flow** | Running balance chart + full transaction history for the cash account |
| **General Ledger** | Searchable, paginated ledger with account/type filters and per-page totals |
| **Financial Ratios** | 8 ratios across Profitability, Liquidity and Leverage with health indicators |
| **Upload History** | Audit log of every workbook upload with status and entry count |
| **CSV Export** | Download filtered data from Per-Unit, Ledger and Ratios pages |
| **Auth (optional)** | Single shared password via `APP_PASSWORD` — no accounts needed |
| **Redis Caching** | Dashboard summary cached for 5 minutes; auto-invalidated on upload |

---

## Quick Start

**Requirements:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac/Linux)

### Windows

1. Double-click **`START_LANSPORT.bat`**
2. Open [http://localhost](http://localhost) in your browser
3. Click **Upload Workbook** in the sidebar and upload `Bookkeeping Lansport Main (1).xlsx`
4. All dashboards populate automatically within a few seconds

To stop all services, run **`STOP_LANSPORT.bat`**.

### Linux / Mac

```bash
chmod +x start.sh
./start.sh
```

To stop: `./stop.sh`

### First-time setup notes

- The `START_LANSPORT.bat` script copies `.env.example` → `.env` automatically on first run.
- Docker images are built on first launch (~2-5 minutes). Subsequent starts are fast.
- The database persists in a Docker volume (`postgres_data`) — data survives restarts.

---

## Configuration

All settings live in `.env` (copied from `.env.example` on first run).

| Variable | Default | Description |
|---|---|---|
| `APP_PASSWORD` | *(blank)* | Optional password protection. Leave blank for open access. Set to a strong password to require login. |
| `APP_PORT` | `80` | External port for the Nginx reverse proxy. Change if port 80 is taken. |
| `DB_PASSWORD` | `lansport_dev` | PostgreSQL password. Change before any network exposure. |
| `NEXTAUTH_SECRET` | *(see file)* | Random secret for session tokens. Generate with `openssl rand -base64 32`. |
| `NEXTAUTH_URL` | `http://localhost` | Public URL of the app — used for auth redirects. |

**Important:** After editing `.env`, restart the stack for changes to take effect.

---

## Enabling Password Protection

To require a login password before anyone can view the dashboards:

1. Open `.env`
2. Set `APP_PASSWORD=your-strong-password-here`
3. Restart the stack (`STOP_LANSPORT.bat` then `START_LANSPORT.bat`)

The login screen appears automatically. To disable, clear `APP_PASSWORD=` and restart.

---

## Uploading a New Workbook

1. Open the app and click **Upload Workbook** in the sidebar (or visit `/upload`)
2. Drag and drop, or click to select, the Excel file (`.xlsx`)
3. The ETL service parses the workbook, validates it, and loads all journal entries
4. Visit any dashboard page — data updates immediately

The upload page shows real-time progress. Previous uploads are listed on the **Upload History** page with their status and entry counts.

---

## Exporting Data

CSV exports are available on three pages:

- **Per-Unit Profitability** → exports all 17 units with full financials
- **General Ledger** → exports all entries matching the current search/filters (no pagination limit)
- **Financial Ratios** → exports all 8 ratios with category and unit

Click the **Export CSV** button in the page header. The file downloads immediately.

---

## Sharing Externally (Cloudflare Tunnel)

To expose the app to the internet without port forwarding or a static IP, see
**[CLOUDFLARE_TUNNEL.md](CLOUDFLARE_TUNNEL.md)** for a step-by-step guide using
a free Cloudflare Tunnel.

Recommended: always enable `APP_PASSWORD` before sharing externally.

---

## Architecture

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| API | Next.js API Routes (App Router) |
| ETL | Python 3.12 + FastAPI + openpyxl |
| Database | PostgreSQL 16 (Prisma ORM) |
| Cache | Redis 7 (ioredis, graceful degradation) |
| Reverse Proxy | Nginx (Alpine) |
| Auth | Middleware + httpOnly cookie (`lansport_auth`) |
| Runtime | Docker Compose (5 services) |

### Services

```
nginx      — public entry point on APP_PORT (default :80)
web        — Next.js app (port 3000, internal only)
etl        — FastAPI ETL service (port 8000, internal only)
postgres   — PostgreSQL 16 (persistent volume)
redis      — Redis 7 (persistent volume)
```

### Project layout

```
apps/
  web/                  Next.js frontend + API routes
    src/
      app/
        (dashboard)/    All analytics pages + shared sidebar layout
        api/            API routes (dashboard, upload, export, auth, health)
        login/          Login page
        upload/         Upload workbook page
      components/       Shared UI components (charts, skeletons, error boundary)
      lib/              Utilities (db, redis, csv, utils)
      middleware.ts     Optional auth middleware
  etl/                  Python ETL service
    main.py             FastAPI entry point
    parser.py           Excel workbook parser
nginx/
  nginx.conf            Reverse proxy config
data/                   Upload staging directory (gitignored)
```

---

## Development

### Prerequisites

- Node.js 18+ and npm/pnpm
- Python 3.12+
- PostgreSQL (or run via Docker Compose)
- Redis (optional — app degrades gracefully without it)

### Running locally (without Docker)

```bash
# 1. Start PostgreSQL and Redis via Docker
docker compose up postgres redis -d

# 2. Web app
cd apps/web
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev   # http://localhost:3000

# 3. ETL service (separate terminal)
cd apps/etl
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Database migrations

```bash
cd apps/web
npx prisma migrate dev --name <migration-name>
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| App won't start | Ensure Docker Desktop is running. Check `docker compose ps` for unhealthy services. |
| Blank dashboard after upload | Wait a few seconds and refresh — ETL processing may still be in progress. |
| Port 80 already in use | Set `APP_PORT=8080` (or any free port) in `.env`, then restart. |
| "No data loaded yet" on all pages | Upload the Excel workbook via the Upload page. |
| Login page always shown | `APP_PASSWORD` is set in `.env`. Clear it and restart to disable auth. |
| Upload fails with 413 | Increase `client_max_body_size` in `nginx/nginx.conf` (default 50 MB). |
| Redis connection errors in logs | Safe to ignore — the app operates normally without Redis. |

---

## Development Log

See **[DEVLOG.md](DEVLOG.md)** for the full sprint-by-sprint development history,
architectural decisions, and what was built in each phase.
