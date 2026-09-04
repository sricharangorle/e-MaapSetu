#!/usr/bin/env python3
"""
e-MaapSetu Platform Launcher
Unified Online Verification, Digital Certification & Lifecycle Management System for Weighing and Measuring Instruments
"""
import os
import sys
import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")

    print("\n" + "=" * 70)
    print("  e-MaapSetu | Legal Metrology Verification & Certification Platform")
    print("  Under Legal Metrology Act, 2009 & General Rules, 2011")
    print("=" * 70)
    print(f"  • Web Portal & Mobile App : http://localhost:{port}")
    print(f"  • Public QR Verifier     : http://localhost:{port}/public-verify")
    print(f"  • Interactive API Docs   : http://localhost:{port}/docs")
    print("=" * 70 + "\n")

    uvicorn.run("backend.app.main:app", host=host, port=port, reload=True)
