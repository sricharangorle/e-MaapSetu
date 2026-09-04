"""
SQLAlchemy ORM Database Models for e-MaapSetu
"""
import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum
)
from sqlalchemy.orm import relationship
from backend.app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)
    full_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    role = Column(String(20), nullable=False)  # 'admin', 'lmo', 'gatc', 'trader', 'public'
    organization_name = Column(String(150), nullable=True)
    gstin_or_license = Column(String(50), nullable=True)
    designation = Column(String(100), nullable=True)
    jurisdiction_state = Column(String(50), nullable=True, default="Delhi")
    jurisdiction_district = Column(String(50), nullable=True, default="South Delhi")
    jurisdiction_circle = Column(String(50), nullable=True, default="Hauz Khas Circle")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    owned_instruments = relationship("Instrument", back_populates="owner", foreign_keys="Instrument.owner_id")
    submitted_applications = relationship("Application", back_populates="trader", foreign_keys="Application.trader_id")
    assigned_applications = relationship("Application", back_populates="assigned_officer", foreign_keys="Application.assigned_officer_id")
    conducted_inspections = relationship("Inspection", back_populates="officer", foreign_keys="Inspection.officer_id")
    issued_certificates = relationship("Certificate", back_populates="issued_by", foreign_keys="Certificate.issued_by_id")


class Instrument(Base):
    __tablename__ = "instruments"

    id = Column(Integer, primary_key=True, index=True)
    instrument_uid = Column(String(50), unique=True, index=True, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    instrument_type = Column(String(50), nullable=False)  # e.g., NAWI_CLASS_II, NAWI_CLASS_III, FUEL_DISPENSER, WEIGHBRIDGE
    category_name = Column(String(100), nullable=False)   # e.g., "Bullion Precision Scale", "Commercial Counter Scale"
    make = Column(String(100), nullable=False)
    model_name = Column(String(100), nullable=False)
    model_approval_no = Column(String(100), nullable=False)  # e.g., "IND/09/2023/512"
    serial_number = Column(String(100), unique=True, index=True, nullable=False)
    accuracy_class = Column(String(20), nullable=False)     # "Class I", "Class II", "Class III", "Class IV", "Flowmeter"
    max_capacity = Column(Float, nullable=False)
    min_capacity = Column(Float, nullable=False)
    verification_scale_interval_e = Column(Float, nullable=False)  # 'e' value
    unit = Column(String(10), nullable=False, default="kg")        # "g", "kg", "ton", "L", "m"
    trade_use = Column(String(150), nullable=False)               # "Jewellery Trade", "Retail Grocery", "Petrol Pump"
    installation_address = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    status = Column(String(30), default="ACTIVE")  # ACTIVE, DUE_FOR_REVERIFICATION, EXPIRED, UNDER_INSPECTION, REJECTED
    last_verified_date = Column(DateTime, nullable=True)
    next_due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="owned_instruments", foreign_keys=[owner_id])
    applications = relationship("Application", back_populates="instrument")
    inspections = relationship("Inspection", back_populates="instrument")
    certificates = relationship("Certificate", back_populates="instrument")
    alerts = relationship("AlertLog", back_populates="instrument")


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    application_no = Column(String(50), unique=True, index=True, nullable=False)
    trader_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    instrument_id = Column(Integer, ForeignKey("instruments.id"), nullable=False)
    application_type = Column(String(30), default="INITIAL_VERIFICATION")  # INITIAL_VERIFICATION, RE_VERIFICATION
    status = Column(String(30), default="SUBMITTED")  # SUBMITTED, FEE_PAID, SCHEDULED, UNDER_INSPECTION, COMPLETED, REJECTED
    statutory_fee = Column(Float, default=0.0)
    late_fee = Column(Float, default=0.0)
    total_fee = Column(Float, default=0.0)
    payment_status = Column(String(20), default="COMPLETED")  # PENDING, COMPLETED
    payment_reference = Column(String(50), nullable=True)
    assigned_to_type = Column(String(20), default="LMO")  # LMO, GATC
    assigned_officer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    preferred_date = Column(DateTime, nullable=True)
    scheduled_date = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    trader = relationship("User", back_populates="submitted_applications", foreign_keys=[trader_id])
    assigned_officer = relationship("User", back_populates="assigned_applications", foreign_keys=[assigned_officer_id])
    instrument = relationship("Instrument", back_populates="applications")
    inspection = relationship("Inspection", back_populates="application", uselist=False)
    certificate = relationship("Certificate", back_populates="application", uselist=False)


class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(Integer, primary_key=True, index=True)
    inspection_no = Column(String(50), unique=True, index=True, nullable=False)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    instrument_id = Column(Integer, ForeignKey("instruments.id"), nullable=False)
    officer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    inspection_date = Column(DateTime, default=datetime.datetime.utcnow)
    inspection_location = Column(String(255), nullable=True)
    gps_latitude = Column(Float, nullable=True)
    gps_longitude = Column(Float, nullable=True)

    # Standards used
    working_standards_used = Column(String(255), nullable=True)
    standards_validity_date = Column(String(50), nullable=True)

    # Test Observation JSON strings
    repeatability_data = Column(Text, nullable=True)  # JSON string
    eccentricity_data = Column(Text, nullable=True)   # JSON string
    linearity_data = Column(Text, nullable=True)      # JSON string

    visual_inspection_passed = Column(Boolean, default=True)
    overall_result = Column(String(20), default="PASS")  # PASS, FAIL
    rejection_reason = Column(Text, nullable=True)
    officer_remarks = Column(Text, nullable=True)
    digital_seal_number = Column(String(100), nullable=True)

    # Media & Signatures
    photo_instrument_url = Column(String(255), nullable=True)
    photo_serial_plate_url = Column(String(255), nullable=True)
    photo_seal_url = Column(String(255), nullable=True)
    officer_signature_data = Column(Text, nullable=True)
    trader_signature_data = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    application = relationship("Application", back_populates="inspection")
    instrument = relationship("Instrument", back_populates="inspections")
    officer = relationship("User", back_populates="conducted_inspections", foreign_keys=[officer_id])
    certificate = relationship("Certificate", back_populates="inspection", uselist=False)


class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True)
    certificate_no = Column(String(50), unique=True, index=True, nullable=False)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    instrument_id = Column(Integer, ForeignKey("instruments.id"), nullable=False)
    inspection_id = Column(Integer, ForeignKey("inspections.id"), nullable=False)
    issued_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    issue_date = Column(DateTime, default=datetime.datetime.utcnow)
    valid_until = Column(DateTime, nullable=False)
    digital_seal_no = Column(String(100), nullable=False)
    verification_type = Column(String(50), default="Periodic Verification & Stamping")
    accuracy_class = Column(String(30), nullable=False)
    status = Column(String(20), default="VALID")  # VALID, EXPIRED, SUSPENDED, CANCELLED
    qr_code_content = Column(Text, nullable=False)
    cryptographic_hash = Column(String(128), nullable=False)  # SHA-256 digest
    pdf_file_path = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    application = relationship("Application", back_populates="certificate")
    instrument = relationship("Instrument", back_populates="certificates")
    inspection = relationship("Inspection", back_populates="certificate")
    issued_by = relationship("User", back_populates="issued_certificates", foreign_keys=[issued_by_id])


class EnforcementLog(Base):
    __tablename__ = "enforcement_logs"

    id = Column(Integer, primary_key=True, index=True)
    case_no = Column(String(50), unique=True, index=True, nullable=False)
    citizen_name = Column(String(100), nullable=True)
    citizen_phone = Column(String(20), nullable=True)
    instrument_id = Column(Integer, ForeignKey("instruments.id"), nullable=True)
    certificate_no = Column(String(50), nullable=True)
    premises_name = Column(String(150), nullable=False)
    location_address = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    violation_category = Column(String(50), nullable=False)  # TAMPERED_SEAL, EXPIRED_STAMP, SHORT_DELIVERY, UNAPPROVED_MODEL, OVERCHARGING
    description = Column(Text, nullable=False)
    photo_evidence_url = Column(String(255), nullable=True)
    status = Column(String(30), default="LOGGED")  # LOGGED, RAID_SCHEDULED, RAID_CONDUCTED, SEIZED, PENALTY_LEVIED, DISMISSED
    officer_assigned_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action_taken_summary = Column(Text, nullable=True)
    penalty_amount_levied = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class AlertLog(Base):
    __tablename__ = "alert_logs"

    id = Column(Integer, primary_key=True, index=True)
    instrument_id = Column(Integer, ForeignKey("instruments.id"), nullable=False)
    certificate_id = Column(Integer, ForeignKey("certificates.id"), nullable=True)
    trader_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    alert_type = Column(String(30), nullable=False)  # 30_DAYS_NOTICE, 15_DAYS_NOTICE, 7_DAYS_URGENT, EXPIRED_NOTICE
    alert_channel = Column(String(20), default="SMS_EMAIL")
    recipient_contact = Column(String(100), nullable=False)
    message_content = Column(Text, nullable=False)
    sent_at = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(20), default="DELIVERED")

    # Relationships
    instrument = relationship("Instrument", back_populates="alerts")
