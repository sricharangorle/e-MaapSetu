# e-MaapSetu REST API Specification

**Interactive Documentation available at:** `http://localhost:8000/docs` (Swagger UI)

---

## 1. Authentication & RBAC (`/api/auth`)

### `POST /api/auth/login`
- **Request**:
  ```json
  {
    "username": "admin",
    "password": "admin123"
  }
  ```
- **Response**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "username": "admin",
      "full_name": "Dr. Rajesh Sharma",
      "role": "admin",
      "organization_name": "Department of Legal Metrology, GNCTD"
    }
  }
  ```

### `POST /api/auth/switch-demo-user`
- **Request**: `{"role": "lmo"}` (Options: `admin`, `lmo`, `gatc`, `trader`, `trader_petrol`, `trader_weighbridge`)
- **Response**: Returns JWT token and profile for fast hackathon evaluation.

---

## 2. Instrument Registry (`/api/instruments`)

### `GET /api/instruments/`
- **Query Params**: `status` (`ACTIVE`, `EXPIRED`, `DUE_FOR_REVERIFICATION`), `search`
- **Response**: Array of instruments with UID, accuracy class, capacity, stamping due date, owner info.

### `POST /api/instruments/`
- **Request**:
  ```json
  {
    "instrument_type": "NAWI_CLASS_II",
    "category_name": "High Precision Bullion Balance",
    "make": "Mettler Toledo",
    "model_name": "ME303T",
    "model_approval_no": "IND/09/2023/419",
    "serial_number": "MT-2026-0091",
    "accuracy_class": "Class II",
    "max_capacity": 320.0,
    "min_capacity": 0.02,
    "verification_scale_interval_e": 0.001,
    "unit": "g",
    "trade_use": "Bullion & Jewellery Retail Sales",
    "installation_address": "Shop 14, Main Market, South Extension-1, New Delhi"
  }
  ```

---

## 3. Verification Applications (`/api/applications`)

### `POST /api/applications/`
- **Request**:
  ```json
  {
    "instrument_id": 1,
    "application_type": "RE_VERIFICATION",
    "preferred_date": "2026-09-15",
    "notes": "Annual statutory verification"
  }
  ```
- **Response**:
  ```json
  {
    "message": "Application submitted successfully",
    "application_no": "APP-2026-0104",
    "total_fee": 300.0,
    "payment_ref": "TXN-BHARATKOSH-0104",
    "id": 4
  }
  ```

### `PUT /api/applications/{id}/allocate`
- **Request**:
  ```json
  {
    "assigned_officer_id": 2,
    "scheduled_date": "2026-09-18",
    "notes": "Assigned to Hauz Khas Circle"
  }
  ```

---

## 4. Field Inspections & Stamping (`/api/inspections`)

### `POST /api/inspections/validate-test`
- Real-time MPE calculation and Pass/Fail verification for mobile field inspection app.

### `POST /api/inspections/submit`
- Records calibration observations, GPS coordinates, digital signatures, issues digital seal, and automatically generates Form VII Digital Certificate with QR code.

---

## 5. Digital Certificates & Public Verification (`/api/certificates`)

### `GET /api/certificates/public-verify/{query_str}`
- **Accessible to public without login**. Searchable by Certificate No, Digital Seal ID, or Serial No.
- Returns authenticity status (`AUTHENTIC_VALID`, `EXPIRED`, `TAMPERED_OR_INVALID`), cryptographic SHA-256 validation token, establishment details, and stamping officer name.

### `GET /api/certificates/{id}/download-pdf`
- Returns official Government-styled PDF certificate with security watermark, QR code, and dual signature boxes.

---

## 6. Analytics, GIS & Alerts (`/api/analytics`)

### `GET /api/analytics/dashboard-summary`
- Role-specific KPI metrics and chart aggregation data.

### `GET /api/analytics/gis-map-data`
- Geo-tagged coordinates of all instruments with color-coded compliance status for Leaflet GIS map.

### `POST /api/analytics/trigger-alerts`
- Executes background validity expiration scanner and records alerts in notification logs.

---

## 7. Enforcement & Grievances (`/api/enforcement`)

### `POST /api/enforcement/report-violation`
- Public citizen grievance reporting form for short delivery or tampered seals.

### `PUT /api/enforcement/{id}/action`
- LMO / Admin records surprise inspection raid results, compounding fines under Section 48, and seizure memos.
