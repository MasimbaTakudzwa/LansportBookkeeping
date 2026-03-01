"""
Lansport Analytics — ETL Service
=================================
FastAPI service that processes Excel accounting workbooks and loads
structured data into PostgreSQL for the Lansport Analytics dashboards.

Endpoints:
  GET  /health   — Health check
  POST /process  — Trigger ETL pipeline for an uploaded workbook
"""

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel

from parsers.excel_parser import ExcelParser
from db.loader import DataLoader

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Lansport ETL Service starting up")
    yield
    logger.info("Lansport ETL Service shutting down")


app = FastAPI(
    title="Lansport ETL Service",
    description="Processes Excel accounting workbooks for Lansport Analytics",
    version="0.1.0",
    lifespan=lifespan,
)


# ─────────────────────────────────────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────────────────────────────────────

class ProcessRequest(BaseModel):
    file_path: str
    checksum: str


class ProcessResponse(BaseModel):
    status: str
    message: str
    job_id: str | None = None


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    import datetime
    return {
        "status": "ok",
        "service": "lansport-etl",
        "timestamp": datetime.datetime.utcnow().isoformat(),
    }


@app.post("/process", response_model=ProcessResponse)
async def process_workbook(
    request: ProcessRequest,
    background_tasks: BackgroundTasks,
):
    """Trigger ETL processing for an uploaded Excel workbook.

    The file is processed asynchronously in the background.
    Returns immediately with status="processing".
    """
    file_path = Path(request.file_path)

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"File not found: {request.file_path}",
        )

    if file_path.suffix.lower() != ".xlsx":
        raise HTTPException(
            status_code=400,
            detail="Only .xlsx files are supported",
        )

    background_tasks.add_task(
        run_etl_pipeline, str(file_path), request.checksum
    )

    return ProcessResponse(
        status="processing",
        message=f"ETL pipeline started for {file_path.name}",
        job_id=request.checksum[:8],
    )


# ─────────────────────────────────────────────────────────────────────────────
# ETL pipeline
# ─────────────────────────────────────────────────────────────────────────────

def run_etl_pipeline(file_path: str, checksum: str) -> None:
    """Execute the full Extract → Transform → Load pipeline."""
    logger.info(f"ETL pipeline starting: {file_path}")
    try:
        # Extract
        parser = ExcelParser(file_path)
        workbook_data = parser.parse()
        logger.info(
            f"Parsed workbook: {len(workbook_data.accounts)} accounts, "
            f"{len(workbook_data.journal_entries)} journal entries"
        )

        # Load
        loader = DataLoader()
        loader.load(
            workbook_data,
            checksum=checksum,
            filename=Path(file_path).name,
        )

        logger.info(f"ETL pipeline completed successfully: {file_path}")

    except Exception as exc:
        logger.error(f"ETL pipeline failed: {exc}", exc_info=True)
        raise


# ─────────────────────────────────────────────────────────────────────────────
# Entry point (for local dev outside Docker)
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=False,
    )
