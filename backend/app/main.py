"""
e-MaapSetu: Unified Online Verification & Digital Certification Platform
Main FastAPI Application Entrypoint
"""
import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse

from backend.app.config import BASE_DIR, DATA_DIR, UPLOAD_DIR
from backend.app.database import init_db, SessionLocal
from backend.app.services.seed_data import populate_seed_data
from backend.app.routers import (
    auth_router,
    instruments_router,
    applications_router,
    inspections_router,
    certificates_router,
    analytics_router,
    enforcement_router
)

app = FastAPI(
    title="e-MaapSetu API",
    description="Unified Online Verification, Digital Certification & Lifecycle Management Platform for Weighing and Measuring Instruments (under Legal Metrology Act, 2009 & General Rules, 2011)",
    version="2.0.0"
)

# Enable CORS for web and mobile clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth_router.router)
app.include_router(instruments_router.router)
app.include_router(applications_router.router)
app.include_router(inspections_router.router)
app.include_router(certificates_router.router)
app.include_router(analytics_router.router)
app.include_router(enforcement_router.router)

# Mount Static Directories
FRONTEND_DIR = BASE_DIR / "frontend"
FRONTEND_DIR.mkdir(exist_ok=True)
STATIC_DIR = FRONTEND_DIR / "static"
STATIC_DIR.mkdir(exist_ok=True)
IMG_DIR = STATIC_DIR / "img"
IMG_DIR.mkdir(exist_ok=True)

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
app.mount("/data/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.on_event("startup")
def on_startup():
    """Initialize SQLite database schema and seed initial demo dataset"""
    init_db()
    db = SessionLocal()
    try:
        populate_seed_data(db)
    finally:
        db.close()


@app.get("/verify/{certificate_no}")
def public_verify_page(certificate_no: str):
    """Serve the public verification page for QR code scans"""
    index_file = FRONTEND_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return HTMLResponse(f"<h3>Verifying Certificate: {certificate_no}</h3>")


@app.get("/{full_path:path}")
def serve_frontend_spa(full_path: str):
    """Serve Frontend Single Page Application"""
    file_path = FRONTEND_DIR / full_path
    if full_path and file_path.exists() and file_path.is_file():
        return FileResponse(str(file_path))
    
    index_file = FRONTEND_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    
    return HTMLResponse("<h2>e-MaapSetu Frontend Initializing...</h2>")
