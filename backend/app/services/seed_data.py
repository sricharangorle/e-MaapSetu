"""
Seed data generator for e-MaapSetu Platform
Populates multi-stakeholder users, realistic instruments, applications, inspections, certificates, and enforcement cases.
"""
import datetime
import json
from sqlalchemy.orm import Session
from backend.app.models import User, Instrument, Application, Inspection, Certificate, EnforcementLog, AlertLog
from backend.app.auth import hash_password
from backend.app.services.certificate_generator import CertificateService


def populate_seed_data(db: Session, base_url: str = "http://localhost:8000"):
    """Check if database already contains users; if not, seed realistic data"""
    if db.query(User).first():
        return  # Database already seeded

    print("Initializing seed data for e-MaapSetu...")

    # 1. Create Stakeholder Users
    admin_user = User(
        username="admin",
        email="controller@delhi.gov.in",
        hashed_password=hash_password("admin123"),
        full_name="Dr. Rajesh Sharma",
        phone="+91-9811200001",
        role="admin",
        organization_name="Department of Legal Metrology, GNCTD",
        designation="Controller of Legal Metrology",
        jurisdiction_state="Delhi",
        jurisdiction_district="All Districts",
        jurisdiction_circle="Headquarters",
        is_active=True
    )
    db.add(admin_user)

    lmo_user1 = User(
        username="lmo_verma",
        email="sk.verma@legalmetrology.gov.in",
        hashed_password=hash_password("lmo123"),
        full_name="Shri S. K. Verma",
        phone="+91-9876543210",
        role="lmo",
        organization_name="State Legal Metrology Department",
        designation="Inspector of Legal Metrology",
        jurisdiction_state="Delhi",
        jurisdiction_district="South Delhi",
        jurisdiction_circle="Hauz Khas & Saket Circle",
        is_active=True
    )
    db.add(lmo_user1)

    lmo_user2 = User(
        username="lmo_anita",
        email="anita.deshmukh@legalmetrology.gov.in",
        hashed_password=hash_password("lmo123"),
        full_name="Smt. Anita Deshmukh",
        phone="+91-9876543211",
        role="lmo",
        organization_name="State Legal Metrology Department",
        designation="Inspector of Legal Metrology",
        jurisdiction_state="Delhi",
        jurisdiction_district="Central Delhi",
        jurisdiction_circle="Connaught Place Circle",
        is_active=True
    )
    db.add(lmo_user2)

    gatc_user = User(
        username="gatc_apex",
        email="director@apexmetrology.org",
        hashed_password=hash_password("gatc123"),
        full_name="Dr. Vikram Malhotra",
        phone="+91-9810099887",
        role="gatc",
        organization_name="Apex Calibration & Metrology Lab (GATC-NABL-0412)",
        gstin_or_license="07AAAAA0000A1Z5",
        designation="Technical Director",
        jurisdiction_state="Delhi",
        jurisdiction_district="Okhla Industrial Area",
        jurisdiction_circle="Special Calibration Zone",
        is_active=True
    )
    db.add(gatc_user)

    trader_jeweler = User(
        username="prem_jewellers",
        email="contact@premjewellers.com",
        hashed_password=hash_password("trader123"),
        full_name="Shri Prem Chand Gupta",
        phone="+91-9810123456",
        role="trader",
        organization_name="Prem Jewellers Pvt. Ltd.",
        gstin_or_license="07AAACP1234F1Z8",
        designation="Managing Director",
        jurisdiction_state="Delhi",
        jurisdiction_district="South Delhi",
        jurisdiction_circle="South Extension Part-1",
        is_active=True
    )
    db.add(trader_jeweler)

    trader_petrol = User(
        username="delhi_fuels",
        email="manager@delhifuels.com",
        hashed_password=hash_password("trader123"),
        full_name="Shri Amit Bakshi",
        phone="+91-9899112233",
        role="trader",
        organization_name="Delhi Fuels Auto Retail Outlet",
        gstin_or_license="07BBBCD5678K1Z2",
        designation="Dealer / Franchisee",
        jurisdiction_state="Delhi",
        jurisdiction_district="South Delhi",
        jurisdiction_circle="Mehrauli Badarpur Road",
        is_active=True
    )
    db.add(trader_petrol)

    trader_logistics = User(
        username="metro_freight",
        email="ops@metrofreight.in",
        hashed_password=hash_password("trader123"),
        full_name="Capt. R. S. Narula",
        phone="+91-9818877665",
        role="trader",
        organization_name="Metro Freight Logistics & Weighbridge Corp.",
        gstin_or_license="07CCCCF9012M1Z0",
        designation="Chief Operations Officer",
        jurisdiction_state="Delhi",
        jurisdiction_district="South Delhi",
        jurisdiction_circle="Tughlakabad Inland Depot",
        is_active=True
    )
    db.add(trader_logistics)

    db.commit()

    # 2. Create Instruments
    now = datetime.datetime.utcnow()
    
    # Active Jewel Scale
    inst1 = Instrument(
        instrument_uid="INST-2026-0081",
        owner_id=trader_jeweler.id,
        instrument_type="NAWI_CLASS_II",
        category_name="High Precision Gold & Bullion Balance",
        make="Mettler Toledo",
        model_name="ME303T Analytical",
        model_approval_no="IND/09/2023/419",
        serial_number="MT-2023-99812",
        accuracy_class="Class II",
        max_capacity=320.0,
        min_capacity=0.02,
        verification_scale_interval_e=0.001,
        unit="g",
        trade_use="Bullion & Jewellery Retail Sales",
        installation_address="Shop 14, Main Market, South Extension-1, New Delhi",
        latitude=28.5684,
        longitude=77.2217,
        status="ACTIVE",
        last_verified_date=now - datetime.timedelta(days=60),
        next_due_date=now + datetime.timedelta(days=305)
    )
    db.add(inst1)

    # Weighbridge due soon (in 5 days)
    inst2 = Instrument(
        instrument_uid="INST-2026-0082",
        owner_id=trader_logistics.id,
        instrument_type="WEIGHBRIDGE",
        category_name="Electronic Pitless Truck Weighbridge",
        make="Essae Teraoka",
        model_name="DS-415 Road Weighbridge",
        model_approval_no="IND/11/2022/881",
        serial_number="ESSAE-WB-60T-441",
        accuracy_class="Class III",
        max_capacity=60000.0,
        min_capacity=200.0,
        verification_scale_interval_e=10.0,
        unit="kg",
        trade_use="Commercial Freight & Container Weighing",
        installation_address="Gate 4, ICD Tughlakabad Container Freight Station, Delhi",
        latitude=28.5144,
        longitude=77.2912,
        status="DUE_FOR_REVERIFICATION",
        last_verified_date=now - datetime.timedelta(days=360),
        next_due_date=now + datetime.timedelta(days=5)
    )
    db.add(inst2)

    # Petrol Dispenser expired (12 days ago)
    inst3 = Instrument(
        instrument_uid="INST-2026-0083",
        owner_id=trader_petrol.id,
        instrument_type="FUEL_DISPENSER",
        category_name="Multi-Product Fuel Dispenser (MS / HSD)",
        make="Midco Supreme",
        model_name="Avanti MPD 4-Nozzle",
        model_approval_no="IND/05/2021/302",
        serial_number="MIDCO-MPD-2021-081",
        accuracy_class="Flowmeter",
        max_capacity=60.0,
        min_capacity=5.0,
        verification_scale_interval_e=0.01,
        unit="L",
        trade_use="Automotive Fuel Retail Delivery",
        installation_address="Indian Oil COCO Station, MB Road, Saket, New Delhi",
        latitude=28.5204,
        longitude=77.2155,
        status="EXPIRED",
        last_verified_date=now - datetime.timedelta(days=377),
        next_due_date=now - datetime.timedelta(days=12)
    )
    db.add(inst3)

    # Supermarket Counter Scale (Fresh Verification pending)
    inst4 = Instrument(
        instrument_uid="INST-2026-0084",
        owner_id=trader_jeweler.id,
        instrument_type="NAWI_CLASS_III",
        category_name="Digital Price Computing Retail Scale",
        make="Eagle Scales",
        model_name="EPS-30 Commercial",
        model_approval_no="IND/08/2024/112",
        serial_number="EAGLE-30K-9018",
        accuracy_class="Class III",
        max_capacity=30.0,
        min_capacity=0.1,
        verification_scale_interval_e=0.005,
        unit="kg",
        trade_use="Retail Packaged Produce & Sweet Confectionery",
        installation_address="Counter 2, Ground Floor, Defence Colony Market, New Delhi",
        latitude=28.5733,
        longitude=77.2319,
        status="PENDING_VERIFICATION",
        last_verified_date=None,
        next_due_date=None
    )
    db.add(inst4)

    db.commit()

    # 3. Create Applications
    app1 = Application(
        application_no="APP-2026-0101",
        trader_id=trader_jeweler.id,
        instrument_id=inst1.id,
        application_type="RE_VERIFICATION",
        status="COMPLETED",
        statutory_fee=300.0,
        late_fee=0.0,
        total_fee=300.0,
        payment_status="COMPLETED",
        payment_reference="PAY-UPI-982103991",
        assigned_to_type="LMO",
        assigned_officer_id=lmo_user1.id,
        preferred_date=now - datetime.timedelta(days=62),
        scheduled_date=now - datetime.timedelta(days=60),
        notes="Annual periodic re-verification for high accuracy bullion scale."
    )
    db.add(app1)

    app2 = Application(
        application_no="APP-2026-0102",
        trader_id=trader_logistics.id,
        instrument_id=inst2.id,
        application_type="RE_VERIFICATION",
        status="SCHEDULED",
        statutory_fee=2500.0,
        late_fee=0.0,
        total_fee=2500.0,
        payment_status="COMPLETED",
        payment_reference="PAY-NETBANK-7721893",
        assigned_to_type="LMO",
        assigned_officer_id=lmo_user1.id,
        preferred_date=now + datetime.timedelta(days=2),
        scheduled_date=now + datetime.timedelta(days=2),
        notes="Heavy weighbridge re-verification. Requires standard test truck (20T dead weights)."
    )
    db.add(app2)

    app3 = Application(
        application_no="APP-2026-0103",
        trader_id=trader_jeweler.id,
        instrument_id=inst4.id,
        application_type="INITIAL_VERIFICATION",
        status="SUBMITTED",
        statutory_fee=100.0,
        late_fee=0.0,
        total_fee=100.0,
        payment_status="COMPLETED",
        payment_reference="PAY-UPI-11029348",
        assigned_to_type="LMO",
        assigned_officer_id=None,
        preferred_date=now + datetime.timedelta(days=4),
        notes="Newly procured digital counter scale. Initial stamping required before putting into trade."
    )
    db.add(app3)

    db.commit()

    # 4. Completed Inspection & Certificate for inst1
    insp1 = Inspection(
        inspection_no="INSP-2026-0041",
        application_id=app1.id,
        instrument_id=inst1.id,
        officer_id=lmo_user1.id,
        inspection_date=now - datetime.timedelta(days=60),
        inspection_location=inst1.installation_address,
        gps_latitude=inst1.latitude,
        gps_longitude=inst1.longitude,
        working_standards_used="OIML Class F1 Standard Weight Set (ID: STD-F1-DELHI-202)",
        standards_validity_date="Valid until 31-Dec-2026",
        repeatability_data=json.dumps({"test_load": 150.0, "readings": [150.000, 150.001, 150.000], "max_diff": 0.001, "passed": True}),
        eccentricity_data=json.dumps([
            {"position": "Center", "applied": 100.0, "indicated": 100.000, "passed": True},
            {"position": "Front-Left", "applied": 100.0, "indicated": 100.001, "passed": True},
            {"position": "Front-Right", "applied": 100.0, "indicated": 100.000, "passed": True},
            {"position": "Back-Left", "applied": 100.0, "indicated": 100.000, "passed": True},
            {"position": "Back-Right", "applied": 100.0, "indicated": 100.001, "passed": True},
        ]),
        linearity_data=json.dumps([
            {"applied": 10.0, "indicated": 10.000, "error": 0.000, "mpe": 0.001, "passed": True},
            {"applied": 50.0, "indicated": 50.000, "error": 0.000, "mpe": 0.001, "passed": True},
            {"applied": 150.0, "indicated": 150.001, "error": 0.001, "mpe": 0.001, "passed": True},
            {"applied": 300.0, "indicated": 300.001, "error": 0.001, "mpe": 0.0015, "passed": True},
        ]),
        visual_inspection_passed=True,
        overall_result="PASS",
        digital_seal_number="LM-DELHI-SEAL-2026-9812",
        officer_remarks="Balance verified in ambient temperature 23°C. Found compliant with Class II limits.",
        photo_instrument_url="/static/img/sample_scale.png",
        photo_seal_url="/static/img/sample_seal.png"
    )
    db.add(insp1)
    db.commit()

    # Generate real PDF & Certificate for inst1
    cert_no = "CERT-DL-2026-00912"
    issue_d = (now - datetime.timedelta(days=60)).strftime("%d-%b-%Y")
    valid_d = (now + datetime.timedelta(days=305)).strftime("%d-%b-%Y")
    
    cert_payload = {
        "certificate_no": cert_no,
        "digital_seal_no": "LM-DELHI-SEAL-2026-9812",
        "issue_date": issue_d,
        "valid_until": valid_d,
        "jurisdiction": "South Delhi Circle, Delhi",
        "trader_org_name": trader_jeweler.organization_name,
        "trader_name": trader_jeweler.full_name,
        "trader_phone": trader_jeweler.phone,
        "gstin": trader_jeweler.gstin_or_license,
        "installation_address": inst1.installation_address,
        "instrument_uid": inst1.instrument_uid,
        "category_name": inst1.category_name,
        "make": inst1.make,
        "model_name": inst1.model_name,
        "model_approval_no": inst1.model_approval_no,
        "serial_number": inst1.serial_number,
        "accuracy_class": inst1.accuracy_class,
        "max_capacity": inst1.max_capacity,
        "min_capacity": inst1.min_capacity,
        "verification_scale_interval_e": inst1.verification_scale_interval_e,
        "unit": inst1.unit,
        "officer_name": lmo_user1.full_name,
        "officer_designation": lmo_user1.designation
    }
    
    pdf_path, crypto_hash = CertificateService.generate_certificate_pdf(cert_payload, base_url)
    
    cert1 = Certificate(
        certificate_no=cert_no,
        application_id=app1.id,
        instrument_id=inst1.id,
        inspection_id=insp1.id,
        issued_by_id=lmo_user1.id,
        issue_date=now - datetime.timedelta(days=60),
        valid_until=now + datetime.timedelta(days=305),
        digital_seal_no="LM-DELHI-SEAL-2026-9812",
        verification_type="Annual Periodic Verification & Stamping",
        accuracy_class="Class II",
        status="VALID",
        qr_code_content=f"{base_url}/verify/{cert_no}",
        cryptographic_hash=crypto_hash,
        pdf_file_path=pdf_path
    )
    db.add(cert1)

    # 5. Create Enforcement Cases
    enf1 = EnforcementLog(
        case_no="CASE-2026-0034",
        citizen_name="Vikas Malhotra",
        citizen_phone="+91-9988776655",
        instrument_id=inst3.id,
        certificate_no=None,
        premises_name="Delhi Fuels Auto Retail Outlet",
        location_address="Indian Oil COCO Station, MB Road, Saket, New Delhi",
        latitude=28.5204,
        longitude=77.2155,
        violation_category="EXPIRED_STAMP",
        description="Dispenser nozzle MS-02 calibration stamp expired. Display reading seemed erratic during 10L filling.",
        status="INVESTIGATION_PENDING",
        officer_assigned_id=lmo_user1.id,
        action_taken_summary="Inspection notice served. Dispenser sealed pending re-verification.",
        penalty_amount_levied=5000.0
    )
    db.add(enf1)

    # 6. Create Alert Logs
    alert1 = AlertLog(
        instrument_id=inst2.id,
        certificate_id=None,
        trader_id=trader_logistics.id,
        alert_type="7_DAYS_URGENT",
        alert_channel="SMS & Email",
        recipient_contact=f"{trader_logistics.phone} | {trader_logistics.email}",
        message_content="FINAL NOTICE: Verification for Electronic Pitless Truck Weighbridge (S/N: ESSAE-WB-60T-441) expires in 5 days.",
        sent_at=now - datetime.timedelta(days=2),
        status="DELIVERED"
    )
    db.add(alert1)

    db.commit()
    print("Seed data successfully populated!")
