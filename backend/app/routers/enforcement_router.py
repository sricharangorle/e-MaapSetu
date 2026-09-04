"""
Enforcement, Public Grievance Reporting & Seizure Memo Router
"""
import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import EnforcementLog, Instrument, User
from backend.app.auth import get_current_user

router = APIRouter(prefix="/api/enforcement", tags=["Enforcement & Grievance"])


class ReportViolationRequest(BaseModel):
    citizen_name: Optional[str] = "Concerned Citizen"
    citizen_phone: Optional[str] = None
    certificate_no: Optional[str] = None
    serial_number: Optional[str] = None
    premises_name: str
    location_address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    violation_category: str  # TAMPERED_SEAL, EXPIRED_STAMP, SHORT_DELIVERY, UNAPPROVED_MODEL, OVERCHARGING
    description: str
    photo_evidence_url: Optional[str] = None


class EnforcementActionRequest(BaseModel):
    status: str  # RAID_SCHEDULED, RAID_CONDUCTED, SEIZED, PENALTY_LEVIED, DISMISSED
    action_taken_summary: str
    penalty_amount_levied: Optional[float] = 0.0
    officer_assigned_id: Optional[int] = None


@router.post("/report-violation")
def report_violation(req: ReportViolationRequest, db: Session = Depends(get_db)):
    """
    Public Citizen / Consumer Portal: Report a legal metrology violation,
    tampered verification seal, expired stamping, or short measure delivery.
    """
    count = db.query(EnforcementLog).count() + 1
    case_no = f"CASE-2026-{count:04d}"

    matched_inst_id = None
    if req.serial_number:
        inst = db.query(Instrument).filter(Instrument.serial_number.ilike(req.serial_number.strip())).first()
        if inst:
            matched_inst_id = inst.id

    new_case = EnforcementLog(
        case_no=case_no,
        citizen_name=req.citizen_name,
        citizen_phone=req.citizen_phone,
        instrument_id=matched_inst_id,
        certificate_no=req.certificate_no,
        premises_name=req.premises_name,
        location_address=req.location_address,
        latitude=req.latitude,
        longitude=req.longitude,
        violation_category=req.violation_category,
        description=req.description,
        photo_evidence_url=req.photo_evidence_url,
        status="LOGGED"
    )
    db.add(new_case)
    db.commit()
    db.refresh(new_case)

    return {
        "message": "Grievance registered successfully with the Legal Metrology Enforcement Cell",
        "case_no": new_case.case_no,
        "id": new_case.id
    }


@router.get("/")
def list_enforcement_cases(
    status: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List enforcement and vigilance cases (Admin & LMO only)"""
    if current_user.role not in ["admin", "lmo"]:
        raise HTTPException(status_code=403, detail="Unauthorized to view enforcement logs")

    query = db.query(EnforcementLog)
    if status:
        query = query.filter(EnforcementLog.status == status.upper())
    if category:
        query = query.filter(EnforcementLog.violation_category == category.upper())

    cases = query.order_by(EnforcementLog.created_at.desc()).all()

    results = []
    for c in cases:
        officer = db.query(User).filter(User.id == c.officer_assigned_id).first() if c.officer_assigned_id else None
        results.append({
            "id": c.id,
            "case_no": c.case_no,
            "citizen_name": c.citizen_name,
            "citizen_phone": c.citizen_phone,
            "premises_name": c.premises_name,
            "location_address": c.location_address,
            "violation_category": c.violation_category,
            "description": c.description,
            "photo_evidence_url": c.photo_evidence_url,
            "status": c.status,
            "assigned_officer": officer.full_name if officer else "Unassigned",
            "action_taken_summary": c.action_taken_summary,
            "penalty_amount_levied": c.penalty_amount_levied,
            "created_at": c.created_at.strftime("%d-%b-%Y %H:%M")
        })

    return results


@router.put("/{id}/action")
def update_enforcement_action(
    id: int,
    req: EnforcementActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Record inspection raid findings, seizure memos, and penalties"""
    if current_user.role not in ["admin", "lmo"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    case = db.query(EnforcementLog).filter(EnforcementLog.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    case.status = req.status
    case.action_taken_summary = req.action_taken_summary
    case.penalty_amount_levied = req.penalty_amount_levied or 0.0
    if req.officer_assigned_id:
        case.officer_assigned_id = req.officer_assigned_id
    elif not case.officer_assigned_id:
        case.officer_assigned_id = current_user.id

    db.commit()
    return {
        "message": f"Action recorded for Case {case.case_no}",
        "status": case.status
    }
