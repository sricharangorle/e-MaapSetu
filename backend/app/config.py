"""
Configuration and Legal Metrology Rules Parameters
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
UPLOAD_DIR = DATA_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
CERTIFICATE_DIR = DATA_DIR / "certificates"
CERTIFICATE_DIR.mkdir(exist_ok=True)

DATABASE_URL = f"sqlite:///{DATA_DIR / 'emaap_setu.db'}"

SECRET_KEY = os.getenv("SECRET_KEY", "emaap-setu-legal-metrology-cryptographic-key-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days for ease of demo

# Statutory Validity Periods (in months) as per Legal Metrology Rules
VALIDITY_PERIODS = {
    "NAWI_CLASS_I": 12,      # Bullion / Micro-balance (1 year)
    "NAWI_CLASS_II": 12,     # High precision / Jeweler (1 year)
    "NAWI_CLASS_III": 12,    # Commercial counter / platform (1 year)
    "NAWI_CLASS_IV": 12,     # Coarse / Ordinary (1 year)
    "WEIGHBRIDGE": 12,       # Electronic Weighbridge (1 year)
    "FUEL_DISPENSER": 12,    # Petrol/Diesel/CNG Flow Dispenser (1 year)
    "FLOWMETER_BULK": 12,    # Industrial Flowmeter (1 year)
    "STORAGE_TANK": 60,      # Calibration of Storage Tanks (5 years)
    "LENGTH_MEASURE": 24,    # Meter rules / Steel tapes (2 years)
    "VOLUME_MEASURE": 12,    # Conical / Cylindrical measures (1 year)
}

# Statutory Verification Fee Schedule (Legal Metrology General Rules - Schedule XII approx)
STATUTORY_FEE_SCHEDULE = {
    "NAWI_CLASS_I": 500.0,
    "NAWI_CLASS_II": 300.0,
    "NAWI_CLASS_III": {
        "up_to_50kg": 100.0,
        "up_to_1000kg": 300.0,
        "above_1000kg": 500.0
    },
    "NAWI_CLASS_IV": 100.0,
    "WEIGHBRIDGE": 2500.0,
    "FUEL_DISPENSER": 1000.0,  # per nozzle
    "FLOWMETER_BULK": 2000.0,
    "STORAGE_TANK": 5000.0,
    "LENGTH_MEASURE": 50.0,
    "VOLUME_MEASURE": 50.0
}
