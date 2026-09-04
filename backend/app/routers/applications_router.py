"""
Verification & Re-verification Applications Workflow Router
"""
import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import Application, Instrument, User
from backend.app.auth import get_current_user
from backend.app.services.metrology_rules import MetrologyRulesEngine

router = APIRouter(prefix="/api/applications", tags=["Applications"])


class SubmitApplicationRequest(BaseModel):
    instrument_id: int
    application_type: str = "RE_VERIFICATION"  # INITIAL_VERIFICATION, RE_VERIFICATION
    preferred_date: Optional[str] = None       # "YYYY-MM-DD"
    assigned_to_type: Optional[str] = "LMO"    # LMO, GATC
    notes: Optional[str] = None


class AllocateApplicationRequest(BaseModel):
    assigned_officer_id: int
    assigned_to_type: str = "LMO"
    scheduled_date: str  # "YYYY-MM-DD"
    notes: Optional[str] = None


@router.get("/")
def list_applications(
    status: Optional[str] = None,
    app_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List applications according to RBAC role and status"""
    query = db.query(Application)

    if current_user.role == "trader":
        query = query.filter(Application.trader_id == current_user.id)
    elif current_user.role in ["lmo", "gatc"]:
        # Show assigned to this officer OR unassigned in their jurisdiction
        query = query.filter(
            (Application.assigned_officer_id == current_user.id) |
            ((Application.assigned_officer_id == None) & (Application.status.in_(["SUBMITTED", "FEE_PAID"])))
        )

    if status:
        query = query.filter(Application.status == status.upper())
    if app_type:
        query = query.filter(Application.application_type == app_type.upper())

    applications = query.order_by(Application.created_at.desc()).all()

    results = []
    for app in applications:
        inst = db.query(Instrument).filter(Instrument.id == app.instrument_id).first()
        trader = db.query(User).filter(User.id == app.trader_id).first()
        officer = db.query(User).filter(User.id == app.assigned_officer_id).first() if app.assigned_officer_id else None

        results.append({
            "id": app.id,
            "application_no": app.application_no,
            "application_type": app.application_type,
            "status": app.status,
            "statutory_fee": app.statutory_fee,
            "late_fee": app.late_fee,
            "total_fee": app.total_fee,
            "payment_status": app.payment_status,
            "payment_reference": app.payment_reference,
            "preferred_date": app.preferred_date.strftime("%d-%b-%Y") if app.preferred_date else None,
            "scheduled_date": app.scheduled_date.strftime("%d-%b-%Y") if app.scheduled_date else None,
            "notes": app.notes,
            "created_at": app.created_at.strftime("%d-%b-%Y"),
            "instrument": {
                "id": inst.id if inst else None,
                "uid": inst.instrument_uid if inst else "N/A",
                "category_name": inst.category_name if inst else "Unknown",
                "serial_number": inst.serial_number if inst else "Unknown",
                "accuracy_class": inst.accuracy_class if inst else "N/A",
                "max_capacity": f"{inst.max_capacity} {inst.unit}" if inst else "N/A",
                "address": inst.installation_address if inst else "N/A"
            },
            "trader": {
                "id": trader.id if trader else None,
                "name": trader.full_name if trader else "Unknown",
                "org": trader.organization_name if trader else "N/A",
                "phone": trader.phone if trader else "N/A"
            },
            "assigned_officer": {
                "id": officer.id if officer else None,
                "name": officer.full_name if officer else "Unassigned",
                "role": officer.role.upper() if officer else "N/A",
                "designation": officer.designation if officer else "Pending Allocation"
            }
        })

    return results


@router.post("/")
def submit_application(
    req: SubmitApplicationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit application for instrument verification or re-verification"""
    inst = db.query(Instrument).filter(Instrument.id == req.instrument_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Instrument not found")

    if current_user.role == "trader" and inst.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only apply for your own instruments")

    # Check if instrument is overdue
    is_overdue = False
    if inst.next_due_date and inst.next_due_date < datetime.datetime.utcnow():
        is_overdue = True

    # Calculate statutory fees
    fee_calc = MetrologyRulesEngine.calculate_statutory_fee(
        instrument_type=inst.instrument_type,
        max_capacity=inst.max_capacity,
        unit=inst.unit,
        is_overdue=is_overdue
    )

    app_count = db.query(Application).count() + 1
    app_no = f"APP-2026-{app_count:04d}"

    preferred_dt = None
    if req.preferred_date:
        try:
            preferred_dt = datetime.datetime.strptime(req.preferred_date, "%Y-%m-%d")
        except ValueError:
            pass

    new_app = Application(
        application_no=app_no,
        trader_id=current_user.id,
        instrument_id=inst.id,
        application_type=req.application_type.upper(),
        status="SUBMITTED",
        statutory_fee=fee_calc["base_fee"],
        late_fee=fee_calc["late_fee"],
        total_fee=fee_calc["total_fee"],
        payment_status="COMPLETED",  # Auto-complete simulated statutory fee payment
        payment_reference=f"TXN-BHARATKOSH-{app_count:04d}",
        assigned_to_type=req.assigned_to_type,
        preferred_date=preferred_dt,
        notes=req.notes
    )

    inst.status = "UNDER_INSPECTION"

    db.add(new_app)
    db.commit()
    db.refresh(new_app)

    return {
        "message": "Application submitted successfully",
        "application_no": new_app.application_no,
        "total_fee": new_app.total_fee,
        "payment_ref": new_app.payment_reference,
        "id": new_app.id
    }


@router.put("/{id}/allocate")
def allocate_application(
    id: int,
    req: AllocateApplicationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin / Controller allocates application to a designated officer or GATC"""
    if current_user.role not in ["admin", "lmo"]:
        raise HTTPException(status_code=403, detail="Only administrators or supervisory officers can allocate applications")

    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    officer = db.query(User).filter(User.id == req.assigned_officer_id).first()
    if not officer or officer.role not in ["lmo", "gatc"]:
        raise HTTPException(status_code=400, detail="Invalid officer or test centre ID")

    try:
        scheduled_dt = datetime.datetime.strptime(req.scheduled_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, expected YYYY-MM-DD")

    app.assigned_officer_id = officer.id
    app.assigned_to_type = req.assigned_to_type
    app.scheduled_date = scheduled_dt
    app.status = "SCHEDULED"
    if req.notes:
        app.notes = f"{app.notes or ''} | Allocation Note: {req.notes}"

    db.commit()
    return {
        "message": f"Application {app.application_no} allocated to {officer.full_name} for {scheduled_dt.strftime('%d-%b-%Y')}",
        "status": app.status
    }
