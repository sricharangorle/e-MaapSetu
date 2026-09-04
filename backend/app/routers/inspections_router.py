"""
Field Inspection, Calibration Observation & Stamping Router
"""
import json
import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import Inspection, Application, Instrument, User, Certificate
from backend.app.auth import get_current_user
from backend.app.services.metrology_rules import MetrologyRulesEngine
from backend.app.services.certificate_generator import CertificateService

router = APIRouter(prefix="/api/inspections", tags=["Inspections"])


class ValidateTestRequest(BaseModel):
    accuracy_class: str
    verification_scale_interval_e: float
    unit: str
    repeatability_readings: Optional[List[float]] = None
    repeatability_load: Optional[float] = None
    eccentricity_load: Optional[float] = None
    eccentricity_readings: Optional[List[Dict[str, Any]]] = None
    linearity_test_points: Optional[List[Dict[str, float]]] = None
    fuel_dispenser_test: Optional[Dict[str, float]] = None


class SubmitInspectionRequest(BaseModel):
    application_id: int
    working_standards_used: str
    standards_validity_date: str
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None
    inspection_location: Optional[str] = None
    
    # Test Observations
    repeatability_data: Optional[Dict[str, Any]] = None
    eccentricity_data: Optional[List[Dict[str, Any]]] = None
    linearity_data: Optional[List[Dict[str, Any]]] = None
    
    visual_inspection_passed: bool = True
    overall_result: str = "PASS"  # PASS, FAIL
    rejection_reason: Optional[str] = None
    officer_remarks: Optional[str] = None
    digital_seal_number: Optional[str] = None

    # Signatures & Media
    photo_instrument_url: Optional[str] = None
    photo_serial_plate_url: Optional[str] = None
    photo_seal_url: Optional[str] = None
    officer_signature_data: Optional[str] = None
    trader_signature_data: Optional[str] = None


@router.post("/validate-test")
def validate_test_calculations(req: ValidateTestRequest):
    """
    Live real-time calculation & statutory MPE evaluation for mobile field test wizard
    """
    results = {}
    overall_passed = True

    # 1. Linearity check
    if req.linearity_test_points:
        lin_pass, lin_details = MetrologyRulesEngine.evaluate_weighing_linearity(
            accuracy_class=req.accuracy_class,
            e_value=req.verification_scale_interval_e,
            unit=req.unit,
            test_points=req.linearity_test_points
        )
        results["linearity"] = {"passed": lin_pass, "details": lin_details}
        if not lin_pass:
            overall_passed = False

    # 2. Repeatability check
    if req.repeatability_readings and req.repeatability_load:
        rep_pass, rep_details = MetrologyRulesEngine.evaluate_repeatability(
            accuracy_class=req.accuracy_class,
            e_value=req.verification_scale_interval_e,
            test_load=req.repeatability_load,
            readings=req.repeatability_readings
        )
        results["repeatability"] = rep_details
        if not rep_pass:
            overall_passed = False

    # 3. Eccentricity check
    if req.eccentricity_readings and req.eccentricity_load:
        ecc_pass, ecc_details = MetrologyRulesEngine.evaluate_eccentricity(
            accuracy_class=req.accuracy_class,
            e_value=req.verification_scale_interval_e,
            corner_load=req.eccentricity_load,
            corner_readings=req.eccentricity_readings
        )
        results["eccentricity"] = {"passed": ecc_pass, "details": ecc_details}
        if not ecc_pass:
            overall_passed = False

    # 4. Fuel dispenser check
    if req.fuel_dispenser_test:
        test_vol = req.fuel_dispenser_test.get("test_volume_L", 5.0)
        deliv_vol = req.fuel_dispenser_test.get("delivered_volume_L", 5.0)
        fuel_pass, fuel_details = MetrologyRulesEngine.evaluate_fuel_dispenser(test_vol, deliv_vol)
        results["fuel_dispenser"] = fuel_details
        if not fuel_pass:
            overall_passed = False

    results["overall_passed"] = overall_passed
    return results


@router.post("/submit")
def submit_inspection(
    req: SubmitInspectionRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submit completed inspection by LMO or GATC.
    If passed, automatically issues cryptographically stamped Digital Certificate & PDF.
    """
    if current_user.role not in ["lmo", "gatc", "admin"]:
        raise HTTPException(status_code=403, detail="Only verified officers or test centres can submit inspection records")

    app = db.query(Application).filter(Application.id == req.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    inst = db.query(Instrument).filter(Instrument.id == app.instrument_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Instrument not found")

    trader = db.query(User).filter(User.id == app.trader_id).first()

    now = datetime.datetime.utcnow()
    insp_count = db.query(Inspection).count() + 1
    insp_no = f"INSP-2026-{insp_count:04d}"

    # Generate Digital Seal Number if passed
    seal_no = req.digital_seal_number or f"LM-SEAL-DL-2026-{insp_count:04d}"

    new_inspection = Inspection(
        inspection_no=insp_no,
        application_id=app.id,
        instrument_id=inst.id,
        officer_id=current_user.id,
        inspection_date=now,
        inspection_location=req.inspection_location or inst.installation_address,
        gps_latitude=req.gps_latitude or inst.latitude,
        gps_longitude=req.gps_longitude or inst.longitude,
        working_standards_used=req.working_standards_used,
        standards_validity_date=req.standards_validity_date,
        repeatability_data=json.dumps(req.repeatability_data) if req.repeatability_data else None,
        eccentricity_data=json.dumps(req.eccentricity_data) if req.eccentricity_data else None,
        linearity_data=json.dumps(req.linearity_data) if req.linearity_data else None,
        visual_inspection_passed=req.visual_inspection_passed,
        overall_result=req.overall_result.upper(),
        rejection_reason=req.rejection_reason,
        officer_remarks=req.officer_remarks,
        digital_seal_number=seal_no if req.overall_result.upper() == "PASS" else None,
        photo_instrument_url=req.photo_instrument_url,
        photo_serial_plate_url=req.photo_serial_plate_url,
        photo_seal_url=req.photo_seal_url,
        officer_signature_data=req.officer_signature_data,
        trader_signature_data=req.trader_signature_data
    )
    db.add(new_inspection)
    db.commit()
    db.refresh(new_inspection)

    cert_obj = None

    if req.overall_result.upper() == "PASS":
        # Calculate validity dates
        issue_date, valid_until = MetrologyRulesEngine.calculate_validity_dates(inst.instrument_type, now)
        
        cert_count = db.query(Certificate).count() + 1
        cert_no = f"CERT-DL-2026-{cert_count:05d}"
        
        base_url = str(request.base_url).rstrip("/")
        
        cert_payload = {
            "certificate_no": cert_no,
            "digital_seal_no": seal_no,
            "issue_date": issue_date.strftime("%d-%b-%Y"),
            "valid_until": valid_until.strftime("%d-%b-%Y"),
            "jurisdiction": f"{current_user.jurisdiction_circle or 'Circle 1'}, {current_user.jurisdiction_district or 'Delhi'}",
            "trader_org_name": trader.organization_name or trader.full_name if trader else "N/A",
            "trader_name": trader.full_name if trader else "N/A",
            "trader_phone": trader.phone if trader else "N/A",
            "gstin": trader.gstin_or_license if trader else "N/A",
            "installation_address": inst.installation_address,
            "instrument_uid": inst.instrument_uid,
            "category_name": inst.category_name,
            "make": inst.make,
            "model_name": inst.model_name,
            "model_approval_no": inst.model_approval_no,
            "serial_number": inst.serial_number,
            "accuracy_class": inst.accuracy_class,
            "max_capacity": inst.max_capacity,
            "min_capacity": inst.min_capacity,
            "verification_scale_interval_e": inst.verification_scale_interval_e,
            "unit": inst.unit,
            "officer_name": current_user.full_name,
            "officer_designation": current_user.designation or "Inspector of Legal Metrology"
        }

        # Generate official PDF with QR code
        pdf_path, crypto_hash = CertificateService.generate_certificate_pdf(cert_payload, base_url)

        cert_obj = Certificate(
            certificate_no=cert_no,
            application_id=app.id,
            instrument_id=inst.id,
            inspection_id=new_inspection.id,
            issued_by_id=current_user.id,
            issue_date=issue_date,
            valid_until=valid_until,
            digital_seal_no=seal_no,
            verification_type="Periodic Verification & Stamping",
            accuracy_class=inst.accuracy_class,
            status="VALID",
            qr_code_content=f"{base_url}/verify/{cert_no}",
            cryptographic_hash=crypto_hash,
            pdf_file_path=pdf_path
        )
        db.add(cert_obj)

        # Update Instrument status
        inst.status = "ACTIVE"
        inst.last_verified_date = issue_date
        inst.next_due_date = valid_until

        # Update Application status
        app.status = "COMPLETED"

    else:
        inst.status = "REJECTED"
        app.status = "REJECTED"

    db.commit()

    return {
        "message": "Inspection recorded successfully",
        "inspection_no": new_inspection.inspection_no,
        "overall_result": new_inspection.overall_result,
        "certificate_no": cert_obj.certificate_no if cert_obj else None,
        "digital_seal_no": new_inspection.digital_seal_number
    }
