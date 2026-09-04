"""
End-to-End API and Workflow Integration Tests for e-MaapSetu
"""
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import init_db, SessionLocal
from backend.app.services.seed_data import populate_seed_data

client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    init_db()
    db = SessionLocal()
    try:
        populate_seed_data(db)
    finally:
        db.close()


def test_auth_login():
    """Test login for admin and trader"""
    resp = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["role"] == "admin"

    trader_resp = client.post("/api/auth/login", json={"username": "prem_jewellers", "password": "trader123"})
    assert trader_resp.status_code == 200
    assert trader_resp.json()["user"]["role"] == "trader"


def test_switch_demo_user():
    """Test fast demo role switcher"""
    resp = client.post("/api/auth/switch-demo-user", json={"role": "lmo"})
    assert resp.status_code == 200
    assert resp.json()["user"]["role"] == "lmo"


def test_instruments_listing_and_filtering():
    """Test instrument retrieval and role scoping"""
    # Admin login
    admin_auth = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"}).json()
    token = admin_auth["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/instruments/", headers=headers)
    assert resp.status_code == 200
    instruments = resp.json()
    assert len(instruments) >= 4

    # Search filter
    search_resp = client.get("/api/instruments/?search=Mettler", headers=headers)
    assert search_resp.status_code == 200
    assert len(search_resp.json()) >= 1


def test_submit_application_workflow():
    """Test trader registering a new instrument and applying for verification"""
    trader_auth = client.post("/api/auth/login", json={"username": "prem_jewellers", "password": "trader123"}).json()
    token = trader_auth["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Register new instrument
    import uuid
    test_serial = f"SART-TEST-{uuid.uuid4().hex[:6]}"
    inst_resp = client.post("/api/instruments/", headers=headers, json={
        "instrument_type": "NAWI_CLASS_II",
        "category_name": "Diamond Carat Balance",
        "make": "Sartorius",
        "model_name": "Entris II",
        "model_approval_no": "IND/04/2024/991",
        "serial_number": test_serial,
        "accuracy_class": "Class II",
        "max_capacity": 220.0,
        "min_capacity": 0.01,
        "verification_scale_interval_e": 0.001,
        "unit": "g",
        "trade_use": "Diamond & Gemstone Weighing",
        "installation_address": "Shop 14B, South Extension-1, New Delhi"
    })
    assert inst_resp.status_code == 200
    inst_id = inst_resp.json()["id"]

    # 2. Submit application
    app_resp = client.post("/api/applications/", headers=headers, json={
        "instrument_id": inst_id,
        "application_type": "INITIAL_VERIFICATION",
        "preferred_date": "2026-09-10",
        "notes": "Urgent verification for newly acquired diamond scale"
    })
    assert app_resp.status_code == 200
    app_data = app_resp.json()
    assert "APP-2026-" in app_data["application_no"]
    assert app_data["total_fee"] == 300.0


def test_field_inspection_and_auto_certificate():
    """Test LMO submitting a passing field inspection and receiving digital certificate"""
    lmo_auth = client.post("/api/auth/login", json={"username": "lmo_verma", "password": "lmo123"}).json()
    token = lmo_auth["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch pending applications
    apps_resp = client.get("/api/applications/", headers=headers)
    assert apps_resp.status_code == 200
    apps = apps_resp.json()
    target_app = next((a for a in apps if a["status"] == "SUBMITTED"), apps[0])

    # Submit inspection with test observations
    insp_resp = client.post("/api/inspections/submit", headers=headers, json={
        "application_id": target_app["id"],
        "working_standards_used": "Class F1 Standard Mass Box #998",
        "standards_validity_date": "31-Dec-2026",
        "inspection_location": "On-Site Shop Premises",
        "visual_inspection_passed": True,
        "overall_result": "PASS",
        "repeatability_data": {"test_load": 100.0, "readings": [100.0, 100.001, 100.0], "passed": True},
        "officer_remarks": "Seals placed. Instrument passed all tests."
    })
    assert insp_resp.status_code == 200
    insp_data = insp_resp.json()
    assert insp_data["overall_result"] == "PASS"
    assert insp_data["certificate_no"] is not None


def test_public_qr_verification():
    """Test public lookup endpoint with authentic certificate number"""
    # Public lookup for pre-seeded certificate
    resp = client.get("/api/certificates/public-verify/CERT-DL-2026-00912")
    assert resp.status_code == 200
    data = resp.json()
    assert data["found"] is True
    assert data["verification_status"] == "AUTHENTIC_VALID"
    assert data["is_authentic"] is True
    assert data["instrument"]["category"] == "High Precision Gold & Bullion Balance"

    # Public lookup for non-existent certificate
    resp_fake = client.get("/api/certificates/public-verify/FAKE-CERT-99999")
    assert resp_fake.status_code == 200
    assert resp_fake.json()["found"] is False


def test_enforcement_and_alert_trigger():
    """Test public reporting of violation and triggering expiry scanner"""
    # 1. Citizen reports violation
    report_resp = client.post("/api/enforcement/report-violation", json={
        "citizen_name": "Rahul Verma",
        "citizen_phone": "+91-9871122334",
        "premises_name": "City General Store",
        "location_address": "Shop 9, Lajpat Nagar Central Market",
        "violation_category": "TAMPERED_SEAL",
        "description": "Lead verification seal on electronic counter scale was found cut and tampered with."
    })
    assert report_resp.status_code == 200
    assert "CASE-2026-" in report_resp.json()["case_no"]

    # 2. Trigger automated alert scanner
    admin_auth = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"}).json()
    headers = {"Authorization": f"Bearer {admin_auth['access_token']}"}
    alert_resp = client.post("/api/analytics/trigger-alerts", headers=headers)
    assert alert_resp.status_code == 200
    assert "scanned_instruments_count" in alert_resp.json()
