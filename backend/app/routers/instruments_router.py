"""
Instrument Registry & Lifecycle Management Router
"""
import uuid
import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import Instrument, User, Application, Inspection, Certificate, AlertLog
from backend.app.auth import get_current_user
from backend.app.services.metrology_rules import MetrologyRulesEngine

router = APIRouter(prefix="/api/instruments", tags=["Instruments"])


class CreateInstrumentRequest(BaseModel):
    instrument_type: str  # NAWI_CLASS_I, NAWI_CLASS_II, NAWI_CLASS_III, NAWI_CLASS_IV, WEIGHBRIDGE, FUEL_DISPENSER, FLOWMETER_BULK, STORAGE_TANK
    category_name: str
    make: str
    model_name: str
    model_approval_no: str
    serial_number: str
    accuracy_class: str
    max_capacity: float
    min_capacity: float
    verification_scale_interval_e: float
    unit: str = "kg"
    trade_use: str
    installation_address: str
    latitude: Optional[float] = 28.6139
    longitude: Optional[float] = 77.2090


class UpdateInstrumentRequest(BaseModel):
    category_name: Optional[str] = None
    make: Optional[str] = None
    model_name: Optional[str] = None
    trade_use: Optional[str] = None
    installation_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


@router.get("/")
def list_instruments(
    status: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve instruments with RBAC filtering and multi-attribute search"""
    query = db.query(Instrument)

    # If trader, filter to own instruments
    if current_user.role == "trader":
        query = query.filter(Instrument.owner_id == current_user.id)

    if status:
        query = query.filter(Instrument.status == status.upper())
    if category:
        query = query.filter(Instrument.instrument_type == category)
    if search:
        s = f"%{search}%"
        query = query.filter(
            (Instrument.instrument_uid.ilike(s)) |
            (Instrument.serial_number.ilike(s)) |
            (Instrument.category_name.ilike(s)) |
            (Instrument.make.ilike(s)) |
            (Instrument.trade_use.ilike(s)) |
            (Instrument.installation_address.ilike(s))
        )

    instruments = query.order_by(Instrument.created_at.desc()).all()

    results = []
    for inst in instruments:
        owner = db.query(User).filter(User.id == inst.owner_id).first()
        latest_cert = db.query(Certificate).filter(Certificate.instrument_id == inst.id).order_by(Certificate.issue_date.desc()).first()

        results.append({
            "id": inst.id,
            "instrument_uid": inst.instrument_uid,
            "category_name": inst.category_name,
            "instrument_type": inst.instrument_type,
            "make": inst.make,
            "model_name": inst.model_name,
            "model_approval_no": inst.model_approval_no,
            "serial_number": inst.serial_number,
            "accuracy_class": inst.accuracy_class,
            "max_capacity": inst.max_capacity,
            "min_capacity": inst.min_capacity,
            "verification_scale_interval_e": inst.verification_scale_interval_e,
            "unit": inst.unit,
            "trade_use": inst.trade_use,
            "installation_address": inst.installation_address,
            "latitude": inst.latitude,
            "longitude": inst.longitude,
            "status": inst.status,
            "last_verified_date": inst.last_verified_date.strftime("%d-%b-%Y") if inst.last_verified_date else None,
            "next_due_date": inst.next_due_date.strftime("%d-%b-%Y") if inst.next_due_date else None,
            "owner": {
                "id": owner.id if owner else None,
                "name": owner.full_name if owner else "Unknown",
                "org": owner.organization_name if owner else "N/A",
                "phone": owner.phone if owner else "N/A"
            },
            "latest_certificate_no": latest_cert.certificate_no if latest_cert else None,
            "created_at": inst.created_at.strftime("%d-%b-%Y")
        })

    return results


@router.get("/fee-calculator")
def calculate_statutory_fee(
    instrument_type: str = Query(...),
    max_capacity: float = Query(...),
    unit: str = Query("kg"),
    is_overdue: bool = Query(False)
):
    """Real-time Legal Metrology fee calculation preview"""
    return MetrologyRulesEngine.calculate_statutory_fee(
        instrument_type=instrument_type,
        max_capacity=max_capacity,
        unit=unit,
        is_overdue=is_overdue
    )


@router.get("/{id}")
def get_instrument_detail(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive instrument details with complete lifecycle history"""
    inst = db.query(Instrument).filter(Instrument.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Instrument not found")

    if current_user.role == "trader" and inst.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to view this instrument")

    owner = db.query(User).filter(User.id == inst.owner_id).first()
    applications = db.query(Application).filter(Application.instrument_id == inst.id).order_by(Application.created_at.desc()).all()
    inspections = db.query(Inspection).filter(Inspection.instrument_id == inst.id).order_by(Inspection.inspection_date.desc()).all()
    certificates = db.query(Certificate).filter(Certificate.instrument_id == inst.id).order_by(Certificate.issue_date.desc()).all()
    alerts = db.query(AlertLog).filter(AlertLog.instrument_id == inst.id).order_by(AlertLog.sent_at.desc()).all()

    return {
        "instrument": {
            "id": inst.id,
            "instrument_uid": inst.instrument_uid,
            "category_name": inst.category_name,
            "instrument_type": inst.instrument_type,
            "make": inst.make,
            "model_name": inst.model_name,
            "model_approval_no": inst.model_approval_no,
            "serial_number": inst.serial_number,
            "accuracy_class": inst.accuracy_class,
            "max_capacity": inst.max_capacity,
            "min_capacity": inst.min_capacity,
            "verification_scale_interval_e": inst.verification_scale_interval_e,
            "unit": inst.unit,
            "trade_use": inst.trade_use,
            "installation_address": inst.installation_address,
            "latitude": inst.latitude,
            "longitude": inst.longitude,
            "status": inst.status,
            "last_verified_date": inst.last_verified_date.strftime("%d-%b-%Y") if inst.last_verified_date else None,
            "next_due_date": inst.next_due_date.strftime("%d-%b-%Y") if inst.next_due_date else None,
            "created_at": inst.created_at.strftime("%d-%b-%Y")
        },
        "owner": {
            "id": owner.id if owner else None,
            "name": owner.full_name if owner else "Unknown",
            "org": owner.organization_name if owner else "N/A",
            "phone": owner.phone if owner else "N/A",
            "email": owner.email if owner else "N/A",
            "gstin": owner.gstin_or_license if owner else "N/A"
        },
        "applications": [
            {
                "id": a.id,
                "application_no": a.application_no,
                "type": a.application_type,
                "status": a.status,
                "total_fee": a.total_fee,
                "created_at": a.created_at.strftime("%d-%b-%Y"),
                "scheduled_date": a.scheduled_date.strftime("%d-%b-%Y") if a.scheduled_date else None
            }
            for a in applications
        ],
        "certificates": [
            {
                "id": c.id,
                "certificate_no": c.certificate_no,
                "digital_seal_no": c.digital_seal_no,
                "issue_date": c.issue_date.strftime("%d-%b-%Y"),
                "valid_until": c.valid_until.strftime("%d-%b-%Y"),
                "status": c.status
            }
            for c in certificates
        ],
        "alerts": [
            {
                "id": al.id,
                "type": al.alert_type,
                "message": al.message_content,
                "sent_at": al.sent_at.strftime("%d-%b-%Y %H:%M")
            }
            for al in alerts
        ]
    }


@router.post("/")
def create_instrument(
    req: CreateInstrumentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Register a new weighing or measuring instrument"""
    existing_serial = db.query(Instrument).filter(Instrument.serial_number == req.serial_number).first()
    if existing_serial:
        raise HTTPException(status_code=400, detail="An instrument with this serial number is already registered")

    # Generate sequential or unique UID
    count = db.query(Instrument).count() + 1
    uid = f"INST-2026-{count:04d}"

    new_inst = Instrument(
        instrument_uid=uid,
        owner_id=current_user.id,
        instrument_type=req.instrument_type,
        category_name=req.category_name,
        make=req.make,
        model_name=req.model_name,
        model_approval_no=req.model_approval_no,
        serial_number=req.serial_number,
        accuracy_class=req.accuracy_class,
        max_capacity=req.max_capacity,
        min_capacity=req.min_capacity,
        verification_scale_interval_e=req.verification_scale_interval_e,
        unit=req.unit,
        trade_use=req.trade_use,
        installation_address=req.installation_address,
        latitude=req.latitude,
        longitude=req.longitude,
        status="PENDING_VERIFICATION"
    )
    db.add(new_inst)
    db.commit()
    db.refresh(new_inst)

    return {
        "message": "Instrument registered successfully",
        "instrument_uid": new_inst.instrument_uid,
        "id": new_inst.id
    }
