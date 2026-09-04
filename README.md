# e-MaapSetu (ई-मापसेतु)

### Unified Online Verification, Digital Certification & Lifecycle Management Platform for Weighing and Measuring Instruments

> **Developed under the statutory provisions of the Legal Metrology Act, 2009 and the Legal Metrology (General) Rules, 2011.**

---

## 🌟 Key Highlights & Innovations

1. **5-in-1 Multi-Stakeholder Unified Ecosystem**:
   - **🏛️ State & Central Controllers (Admin)**: Real-time macro dashboards, district pendency tracking, revenue analytics, and inspector workload allocation.
   - **👮 Legal Metrology Officers (LMOs)**: Mobile-optimized on-site inspection wizard, live Legal Metrology Rules (2011) Maximum Permissible Error (MPE) calculator, digital stamping seal issuance, GPS tagging, and HTML5 canvas signature capture.
   - **🔬 Government Approved Test Centres (GATCs)**: Testing and calibration lab queues for high-capacity standards.
   - **🏪 Traders & Instrument Users**: Jewelers, petrol pump owners, supermarket chains, and logistics weighbridges manage their entire instrument registry, apply for verification/re-verification, and pay statutory fees.
   - **🔍 Citizens & Public Consumers**: Public QR-code scanner and instant certificate verification portal + Vigilance grievance cell to report short delivery and tampered seals.

2. **Automated Metrology Rules (2011) Calculation Engine**:
   - Precision evaluation of Non-Automatic Weighing Instruments (NAWI Class I, II, III, IV) based on scale intervals \(e\), Repeatability tests, and Eccentricity corner load checks.
   - ±0.5% volumetric tolerance testing on Fuel Dispensing Units (5L, 10L, 20L checks).
   - Automated fee calculations with late surcharge determination as per statutory schedules.

3. **Tamper-Proof Cryptographic Certificates & Dynamic QR Codes**:
   - Generates official **Form VII / Form VIII Digital Certificates of Verification** in high-resolution PDF format with Government security watermarks, dual signature boxes, and SHA-256 HMAC cryptographic tokens.
   - Instant live smartphone camera verification via dynamic QR codes.

4. **Spatial GIS Compliance Heatmap & Expiry Alert Scanner**:
   - Interactive Leaflet.js GIS map displaying verified, due-soon, and expired instruments across jurisdictions.
   - Automated background validity expiration scanner with simulated SMS/Email notices at 30 days, 15 days, 7 days, and expiration.

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+ (Tested on Python 3.14)
- Modern web browser (Chrome, Safari, Firefox, Edge)

### 1. Launch the Platform
```bash
# Run with the project virtual environment
./venv/bin/python start.py
```

### 2. Access Portals
- **Web Application & Dashboards**: [http://localhost:8000](http://localhost:8000)
- **Public QR Verification Gateway**: [http://localhost:8000/public-verify](http://localhost:8000/public-verify)
- **Interactive REST API Documentation (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 👥 Demo Stakeholder Accounts & Switcher

A quick **Active Role Dropdown** is available directly in the top navigation bar to seamlessly test all stakeholder views:

| Role | Username | Password | Organization / Jurisdiction |
| :--- | :--- | :--- | :--- |
| **🏛️ State Controller (Admin)** | `admin` | `admin123` | Department of Legal Metrology, GNCTD |
| **👮 LMO Officer (Inspector)** | `lmo_verma` | `lmo123` | South Delhi Circle, Hauz Khas & Saket |
| **🔬 GATC Lab In-Charge** | `gatc_apex` | `gatc123` | Apex Calibration Lab (NABL-0412) |
| **🏪 Trader (Gold Jeweler)** | `prem_jewellers` | `trader123` | Prem Jewellers Pvt. Ltd. (Class II Scale) |
| **⛽ Trader (Petrol Station)** | `delhi_fuels` | `trader123` | Delhi Fuels Auto Retail Outlet |
| **🚛 Trader (Logistics Weighbridge)** | `metro_freight` | `trader123` | Metro Freight Logistics (60T Weighbridge) |

---

## 🧪 Running Automated Tests

Run the complete test suite covering the Metrology Rules Engine, MPE calculations, API endpoints, and certificate generation:

```bash
./venv/bin/pytest tests/ -v
```

---

## 📂 Project Structure

```
├── backend/
│   └── app/
│       ├── config.py             # Statutory fee tables, validity rules, security keys
│       ├── database.py           # SQLite ORM database connection & session
│       ├── models.py             # Users, Instruments, Applications, Certificates, Logs
│       ├── auth.py               # JWT authentication & RBAC decorators
│       ├── main.py               # FastAPI application & static routing
│       ├── services/
│       │   ├── metrology_rules.py        # Legal Metrology 2011 MPE & fee calculation engine
│       │   ├── certificate_generator.py # ReportLab PDF generator & QR code signer
│       │   ├── alert_service.py         # Expiry scanner & notification dispatcher
│       │   └── seed_data.py             # Realistic multi-stakeholder seed dataset
│       └── routers/              # Modular REST API endpoints (Auth, Instruments, etc.)
├── frontend/
│   ├── index.html                # Single Page App shell with Government styling
│   └── static/js/
│       ├── app.js                # State management, router & API client
│       └── components/           # Modular UI components (Dashboard, Field App, etc.)
├── docs/
│   ├── ARCHITECTURE.md           # System architecture, RBAC matrix, security framework
│   ├── LEGAL_METROLOGY_COMPLIANCE.md # Regulatory mapping to Act 2009 & Rules 2011
│   └── API_SPECIFICATION.md      # Full REST API endpoints & payload specifications
├── tests/
│   ├── test_metrology_rules.py   # Unit tests for MPE accuracy classes & fee schedule
│   └── test_api.py               # End-to-end integration tests
├── start.py                      # One-click platform runner
└── pytest.ini                    # Pytest configuration
```

---

## 📜 Regulatory Reference
- **The Legal Metrology Act, 2009 (No. 1 of 2010)**
- **The Legal Metrology (General) Rules, 2011**
- **OIML International Recommendations R76 & R117**
