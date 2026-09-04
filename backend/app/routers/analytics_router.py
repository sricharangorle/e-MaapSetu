"""
Analytics, GIS Heatmaps, Pendency Tracking & Alert Management Router
"""
import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.database import get_db
from backend.app.models import Instrument, Application, Certificate, Inspection, User, AlertLog, EnforcementLog
from backend.app.auth import get_current_user
from backend.app.services.alert_service import AlertScannerService

router = APIRouter(prefix="/api/analytics", tags=["Analytics & GIS"])


@router.get("/dashboard-summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns role-specific KPI summary and aggregated statistics
    """
    now = datetime.datetime.utcnow()

    if current_user.role == "trader":
        # Trader specific metrics
        instruments = db.query(Instrument).filter(Instrument.owner_id == current_user.id).all()
        inst_ids = [i.id for i in instruments]

        active_certs = db.query(Certificate).filter(
            Certificate.instrument_id.in_(inst_ids),
            Certificate.valid_until >= now
        ).count() if inst_ids else 0

        expiring_soon = db.query(Instrument).filter(
            Instrument.owner_id == current_user.id,
            Instrument.status.in_(["DUE_FOR_REVERIFICATION", "EXPIRED"])
        ).count()

        pending_apps = db.query(Application).filter(
            Application.trader_id == current_user.id,
            Application.status.in_(["SUBMITTED", "FEE_PAID", "SCHEDULED", "UNDER_INSPECTION"])
        ).count()

        return {
            "role": "trader",
            "kpis": {
                "total_instruments": len(instruments),
                "active_certificates": active_certs,
                "attention_required": expiring_soon,
                "pending_applications": pending_apps
            },
            "recent_alerts": [
                {
                    "id": a.id,
                    "type": a.alert_type,
                    "message": a.message_content,
                    "sent_at": a.sent_at.strftime("%d-%b-%Y %H:%M")
                }
                for a in db.query(AlertLog).filter(AlertLog.trader_id == current_user.id).order_by(AlertLog.sent_at.desc()).limit(5).all()
            ]
        }

    elif current_user.role in ["lmo", "gatc"]:
        # Officer / Test Centre specific metrics
        assigned_apps = db.query(Application).filter(
            Application.assigned_officer_id == current_user.id,
            Application.status.in_(["SCHEDULED", "UNDER_INSPECTION", "SUBMITTED"])
        ).count()

        completed_inspections = db.query(Inspection).filter(
            Inspection.officer_id == current_user.id
        ).count()

        certificates_issued = db.query(Certificate).filter(
            Certificate.issued_by_id == current_user.id
        ).count()

        return {
            "role": current_user.role,
            "kpis": {
                "pending_inspections": assigned_apps,
                "total_inspections_conducted": completed_inspections,
                "certificates_stamped": certificates_issued,
                "jurisdiction": f"{current_user.jurisdiction_circle or 'Circle 1'}, {current_user.jurisdiction_district or 'Delhi'}"
            }
        }

    else:
        # Admin / Controller macro metrics
        total_instruments = db.query(Instrument).count()
        active_instruments = db.query(Instrument).filter(Instrument.status == "ACTIVE").count()
        due_soon_instruments = db.query(Instrument).filter(Instrument.status == "DUE_FOR_REVERIFICATION").count()
        expired_instruments = db.query(Instrument).filter(Instrument.status == "EXPIRED").count()
        pending_verification = db.query(Instrument).filter(Instrument.status == "PENDING_VERIFICATION").count()

        total_certificates = db.query(Certificate).count()
        total_revenue = db.query(func.sum(Application.total_fee)).filter(Application.payment_status == "COMPLETED").scalar() or 0.0

        pending_apps_count = db.query(Application).filter(
            Application.status.in_(["SUBMITTED", "FEE_PAID", "SCHEDULED"])
        ).count()

        enforcement_cases_count = db.query(EnforcementLog).count()

        # Category distribution
        type_counts = db.query(Instrument.category_name, func.count(Instrument.id)).group_by(Instrument.category_name).all()
        categories_data = [{"name": name, "count": count} for name, count in type_counts]

        return {
            "role": "admin",
            "kpis": {
                "total_instruments": total_instruments,
                "active_instruments": active_instruments,
                "due_for_reverification": due_soon_instruments,
                "expired_instruments": expired_instruments,
                "pending_initial_verification": pending_verification,
                "total_certificates_issued": total_certificates,
                "total_revenue_inr": round(float(total_revenue), 2),
                "pending_applications": pending_apps_count,
                "enforcement_cases": enforcement_cases_count
            },
            "category_breakdown": categories_data
        }


@router.get("/gis-map-data")
def get_gis_map_data(db: Session = Depends(get_db)):
    """
    Returns geo-located instruments for GIS mapping & inspection heatmaps
    """
    instruments = db.query(Instrument).all()
    points = []

    for inst in instruments:
        if inst.latitude and inst.longitude:
            owner = db.query(User).filter(User.id == inst.owner_id).first()
            latest_cert = db.query(Certificate).filter(Certificate.instrument_id == inst.id).order_by(Certificate.issue_date.desc()).first()

            points.append({
                "id": inst.id,
                "uid": inst.instrument_uid,
                "category": inst.category_name,
                "make_model": f"{inst.make} {inst.model_name}",
                "serial_number": inst.serial_number,
                "accuracy_class": inst.accuracy_class,
                "capacity": f"{inst.max_capacity} {inst.unit}",
                "status": inst.status,
                "address": inst.installation_address,
                "latitude": inst.latitude,
                "longitude": inst.longitude,
                "owner_org": owner.organization_name if owner else "N/A",
                "owner_name": owner.full_name if owner else "N/A",
                "next_due_date": inst.next_due_date.strftime("%d-%b-%Y") if inst.next_due_date else "Not Stamped",
                "certificate_no": latest_cert.certificate_no if latest_cert else None
            })

    return points


@router.post("/trigger-alerts")
def trigger_alert_scanner(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Manually trigger the automated Legal Metrology validity expiration scanner"""
    return AlertScannerService.scan_and_generate_alerts(db)


@router.get("/alerts")
def list_alerts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """List sent alerts and notifications"""
    query = db.query(AlertLog)
    if current_user.role == "trader":
        query = query.filter(AlertLog.trader_id == current_user.id)

    alerts = query.order_by(AlertLog.sent_at.desc()).all()
    return [
        {
            "id": a.id,
            "type": a.alert_type,
            "channel": a.alert_channel,
            "recipient": a.recipient_contact,
            "message": a.message_content,
            "status": a.status,
            "sent_at": a.sent_at.strftime("%d-%b-%Y %H:%M")
        }
        for a in alerts
    ]
