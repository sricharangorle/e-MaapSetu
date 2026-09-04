"""
Digital Certificate Management & Public Cryptographic Verification Router
"""
import os
import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import Certificate, Instrument, User, Inspection
from backend.app.auth import get_current_user
from backend.app.services.certificate_generator import CertificateService

router = APIRouter(prefix="/api/certificates", tags=["Certificates"])


@router.get("/")
def list_certificates(
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List certificates with RBAC scoping"""
    query = db.query(Certificate)

    if current_user.role == "trader":
        # Join instrument to check owner
        query = query.join(Instrument).filter(Instrument.owner_id == current_user.id)

    if status:
        query = query.filter(Certificate.status == status.upper())
    if search:
        s = f"%{search}%"
        query = query.filter(
            (Certificate.certificate_no.ilike(s)) |
            (Certificate.digital_seal_no.ilike(s))
        )

    certificates = query.order_by(Certificate.issue_date.desc()).all()

    results = []
    for cert in certificates:
        inst = db.query(Instrument).filter(Instrument.id == cert.instrument_id).first()
        officer = db.query(User).filter(User.id == cert.issued_by_id).first()
        owner = db.query(User).filter(User.id == inst.owner_id).first() if inst else None

        results.append({
            "id": cert.id,
            "certificate_no": cert.certificate_no,
            "digital_seal_no": cert.digital_seal_no,
            "issue_date": cert.issue_date.strftime("%d-%b-%Y"),
            "valid_until": cert.valid_until.strftime("%d-%b-%Y"),
            "status": cert.status,
            "accuracy_class": cert.accuracy_class,
            "verification_type": cert.verification_type,
            "instrument": {
                "id": inst.id if inst else None,
                "uid": inst.instrument_uid if inst else "N/A",
                "category_name": inst.category_name if inst else "Unknown",
                "make_model": f"{inst.make} {inst.model_name}" if inst else "N/A",
                "serial_number": inst.serial_number if inst else "N/A",
                "max_capacity": f"{inst.max_capacity} {inst.unit}" if inst else "N/A",
                "address": inst.installation_address if inst else "N/A"
            },
            "trader": {
                "name": owner.full_name if owner else "Unknown",
                "org": owner.organization_name if owner else "N/A"
            },
            "issued_by": {
                "name": officer.full_name if officer else "Legal Metrology Dept",
                "designation": officer.designation if officer else "LMO"
            }
        })

    return results


@router.get("/public-verify/{query_str}")
def public_verify_certificate(query_str: str, db: Session = Depends(get_db)):
    """
    Public Authentication & Verification Service (Accessible by Citizens / Consumers / Inspectors).
    Searchable by:
    - Certificate Number (e.g. CERT-DL-2026-00912)
    - Digital Seal Number (e.g. LM-DELHI-SEAL-2026-9812)
    - Instrument Serial Number (e.g. MT-2023-99812)
    """
    query_clean = query_str.strip()
    
    # Try finding by Certificate No or Seal No
    cert = db.query(Certificate).filter(
        (Certificate.certificate_no.ilike(query_clean)) |
        (Certificate.digital_seal_no.ilike(query_clean))
    ).first()

    # If not found, try searching by Instrument Serial Number
    if not cert:
        inst_match = db.query(Instrument).filter(Instrument.serial_number.ilike(query_clean)).first()
        if inst_match:
            cert = db.query(Certificate).filter(Certificate.instrument_id == inst_match.id).order_by(Certificate.issue_date.desc()).first()

    if not cert:
        return {
            "found": False,
            "verification_status": "RECORD_NOT_FOUND",
            "message": f"No official Legal Metrology verification certificate found matching '{query_clean}'."
        }

    inst = db.query(Instrument).filter(Instrument.id == cert.instrument_id).first()
    owner = db.query(User).filter(User.id == inst.owner_id).first() if inst else None
    officer = db.query(User).filter(User.id == cert.issued_by_id).first()
    insp = db.query(Inspection).filter(Inspection.id == cert.inspection_id).first()

    now = datetime.datetime.utcnow()
    is_expired = cert.valid_until < now

    # Verify cryptographic integrity
    cert_payload = {
        "certificate_no": cert.certificate_no,
        "serial_number": inst.serial_number if inst else "",
        "issue_date": cert.issue_date.strftime("%d-%b-%Y"),
        "valid_until": cert.valid_until.strftime("%d-%b-%Y"),
        "digital_seal_no": cert.digital_seal_no
    }
    recomputed_hash = CertificateService.generate_cryptographic_hash(cert_payload)
    is_tamper_proof_valid = (recomputed_hash == cert.cryptographic_hash)

    status_tag = "AUTHENTIC_VALID"
    if is_expired:
        status_tag = "EXPIRED"
    elif not is_tamper_proof_valid:
        status_tag = "TAMPERED_OR_INVALID"

    return {
        "found": True,
        "verification_status": status_tag,
        "is_authentic": is_tamper_proof_valid,
        "is_expired": is_expired,
        "certificate_no": cert.certificate_no,
        "digital_seal_no": cert.digital_seal_no,
        "issue_date": cert.issue_date.strftime("%d-%b-%Y"),
        "valid_until": cert.valid_until.strftime("%d-%b-%Y"),
        "days_remaining": (cert.valid_until - now).days,
        "verification_type": cert.verification_type,
        "cryptographic_hash": cert.cryptographic_hash,
        "instrument": {
            "uid": inst.instrument_uid if inst else "N/A",
            "category": inst.category_name if inst else "Unknown",
            "make_model": f"{inst.make} {inst.model_name}" if inst else "N/A",
            "serial_number": inst.serial_number if inst else "N/A",
            "model_approval_no": inst.model_approval_no if inst else "N/A",
            "accuracy_class": inst.accuracy_class if inst else "N/A",
            "capacity": f"Min {inst.min_capacity} to Max {inst.max_capacity} {inst.unit}" if inst else "N/A",
            "scale_interval_e": f"e = {inst.verification_scale_interval_e} {inst.unit}" if inst else "N/A",
            "trade_use": inst.trade_use if inst else "N/A",
            "installation_address": inst.installation_address if inst else "N/A"
        },
        "establishment": {
            "name": owner.organization_name if owner else "Unknown",
            "proprietor": owner.full_name if owner else "Unknown",
            "phone_masked": f"{owner.phone[:4]}***{owner.phone[-3:]}" if (owner and len(owner.phone) > 6) else "N/A",
            "gstin_masked": f"{owner.gstin_or_license[:3]}*****{owner.gstin_or_license[-3:]}" if (owner and owner.gstin_or_license and len(owner.gstin_or_license) > 6) else "N/A"
        },
        "inspection_details": {
            "inspection_no": insp.inspection_no if insp else "N/A",
            "standards_used": insp.working_standards_used if insp else "Verified Working Standards",
            "verified_by_officer": officer.full_name if officer else "Legal Metrology Officer",
            "officer_designation": officer.designation if officer else "Inspector",
            "jurisdiction": f"{officer.jurisdiction_circle or 'Circle 1'}, {officer.jurisdiction_district or 'Delhi'}" if officer else "Delhi"
        }
    }


@router.get("/{id}/download-pdf")
def download_certificate_pdf(id: int, db: Session = Depends(get_db)):
    """Download official Government Certificate PDF"""
    cert = db.query(Certificate).filter(Certificate.id == id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    if not cert.pdf_file_path or not os.path.exists(cert.pdf_file_path):
        # Regenerate if file missing
        inst = db.query(Instrument).filter(Instrument.id == cert.instrument_id).first()
        owner = db.query(User).filter(User.id == inst.owner_id).first() if inst else None
        officer = db.query(User).filter(User.id == cert.issued_by_id).first()

        cert_payload = {
            "certificate_no": cert.certificate_no,
            "digital_seal_no": cert.digital_seal_no,
            "issue_date": cert.issue_date.strftime("%d-%b-%Y"),
            "valid_until": cert.valid_until.strftime("%d-%b-%Y"),
            "jurisdiction": f"{officer.jurisdiction_circle or 'Circle 1'}, {officer.jurisdiction_district or 'Delhi'}" if officer else "Delhi",
            "trader_org_name": owner.organization_name if owner else "N/A",
            "trader_name": owner.full_name if owner else "N/A",
            "trader_phone": owner.phone if owner else "N/A",
            "gstin": owner.gstin_or_license if owner else "N/A",
            "installation_address": inst.installation_address if inst else "N/A",
            "instrument_uid": inst.instrument_uid if inst else "N/A",
            "category_name": inst.category_name if inst else "N/A",
            "make": inst.make if inst else "N/A",
            "model_name": inst.model_name if inst else "N/A",
            "model_approval_no": inst.model_approval_no if inst else "IND/09/2023/512",
            "serial_number": inst.serial_number if inst else "N/A",
            "accuracy_class": inst.accuracy_class if inst else "Class III",
            "max_capacity": inst.max_capacity if inst else 30.0,
            "min_capacity": inst.min_capacity if inst else 0.1,
            "verification_scale_interval_e": inst.verification_scale_interval_e if inst else 0.005,
            "unit": inst.unit if inst else "kg",
            "officer_name": officer.full_name if officer else "Legal Metrology Officer",
            "officer_designation": officer.designation if officer else "Inspector"
        }
        pdf_path, _ = CertificateService.generate_certificate_pdf(cert_payload)
        cert.pdf_file_path = pdf_path
        db.commit()

    return FileResponse(
        path=cert.pdf_file_path,
        filename=f"{cert.certificate_no}.pdf",
        media_type="application/pdf"
    )
