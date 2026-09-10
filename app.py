#!/usr/bin/env python3
"""
Root Application Entrypoint for e-MaapSetu
Compatible with Render, Gunicorn, Uvicorn, and Docker
"""
import os
import sys
from pathlib import Path

# Ensure root is in python module search path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from backend.app.main import app

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    is_dev = os.getenv("ENV", "production").lower() == "development"

    uvicorn.run(
        "app:app",
        host=host,
        port=port,
        reload=is_dev,
        proxy_headers=True,
        forwarded_allow_ips="*"
    )
