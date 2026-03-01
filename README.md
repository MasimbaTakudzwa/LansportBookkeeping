# Lansport Analytics

Financial Data Analysis & Visualisation Platform for Lansport Investments.

Transforms the Excel accounting workbook into interactive dashboards with
per-unit profitability analysis, revenue trends, expense breakdowns, and
cash flow tracking across the 17-unit rental portfolio.

## Quick Start

**Requirements:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac/Linux)

**Windows:**
1. Double-click `START_LANSPORT.bat`
2. Open [http://localhost](http://localhost) in your browser
3. Upload `Bookkeeping Lansport Main (1).xlsx` via the Upload page

**Linux / Mac:**
```bash
chmod +x start.sh
./start.sh
```

To stop all services: run `STOP_LANSPORT.bat` (Windows) or `./stop.sh`.

## Development Status

See `DEVLOG.md` for current sprint status, completed milestones, and next steps.

## Architecture

| Layer         | Technology                          |
|---------------|-------------------------------------|
| Frontend      | Next.js 14 + TypeScript + Tailwind  |
| API           | Next.js API Routes                  |
| ETL           | Python 3.12 + FastAPI + openpyxl    |
| Database      | PostgreSQL 16 (Prisma ORM)          |
| Cache         | Redis 7                             |
| Reverse Proxy | Nginx                               |
| Runtime       | Docker Compose                      |

## Project Structure

```
apps/web/    — Next.js frontend + API routes
apps/etl/    — Python ETL service (Excel → PostgreSQL)
nginx/       — Reverse proxy configuration
data/        — Upload staging directory
```
