#!/usr/bin/env python3
"""
e-MaapSetu Platform Launcher
Unified Online Verification, Digital Certification & Lifecycle Management System for Weighing and Measuring Instruments
"""
import os
import sys
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

import uvicorn
from backend.app.main import app

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    is_dev = os.getenv("ENV", "production").lower() == "development"

    print("\n" + "=" * 70)
    print("  e-MaapSetu | Legal Metrology Verification & Certification Platform")
    print("  Under Legal Metrology Act, 2009 & General Rules, 2011")
    print("=" * 70)
    print(f"  • Listening on        : http://{host}:{port}")
    print(f"  • Environment         : {'Development' if is_dev else 'Production'}")
    print("=" * 70 + "\n")

    uvicorn.run(
        app,
        host=host,
        port=port,
        reload=is_dev,
        proxy_headers=True,
        forwarded_allow_ips="*"
    )
