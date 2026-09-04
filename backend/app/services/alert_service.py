"""
Automated Expiry Scanner and Notification Dispatch Service
"""
import datetime
from sqlalchemy.orm import Session
from backend.app.models import Instrument, Certificate, AlertLog, User


class AlertScannerService:

    @classmethod
    def scan_and_generate_alerts(cls, db: Session) -> dict:
        """
        Scan all active instruments and certificates for upcoming or expired verification validity.
        Generates simulated SMS/Email/In-App alerts and updates instrument status.
        """
        now = datetime.datetime.utcnow()
        instruments = db.query(Instrument).all()

        alerts_created = 0
        status_updates = 0

        for inst in instruments:
            if not inst.next_due_date:
                continue

            delta_days = (inst.next_due_date - now).days
            owner = db.query(User).filter(User.id == inst.owner_id).first()
            if not owner:
                continue

            alert_type = None
            msg = None

            if delta_days < 0:
                # Instrument has expired
                if inst.status != "EXPIRED":
                    inst.status = "EXPIRED"
                    status_updates += 1

                alert_type = "EXPIRED_NOTICE"
                msg = (
                    f"URGENT: Legal Metrology Verification for {inst.category_name} (S/N: {inst.serial_number}) "
                    f"has EXPIRED on {inst.next_due_date.strftime('%d-%b-%Y')}. Continued commercial use without "
                    f"re-verification is an offence under Section 24 of the Legal Metrology Act, 2009. "
                    f"Please submit an online re-verification application immediately."
                )

            elif delta_days <= 7:
                if inst.status not in ["DUE_FOR_REVERIFICATION", "UNDER_INSPECTION"]:
                    inst.status = "DUE_FOR_REVERIFICATION"
                    status_updates += 1

                alert_type = "7_DAYS_URGENT"
                msg = (
                    f"FINAL NOTICE: Verification for {inst.category_name} (S/N: {inst.serial_number}) expires in "
                    f"{delta_days} days ({inst.next_due_date.strftime('%d-%b-%Y')}). Submit re-verification online "
                    f"on e-MaapSetu to avoid late fees and stamping lapses."
                )

            elif delta_days <= 15:
                if inst.status not in ["DUE_FOR_REVERIFICATION", "UNDER_INSPECTION"]:
                    inst.status = "DUE_FOR_REVERIFICATION"
                    status_updates += 1

                alert_type = "15_DAYS_NOTICE"
                msg = (
                    f"Reminder: Verification for {inst.category_name} (S/N: {inst.serial_number}) is due in "
                    f"{delta_days} days ({inst.next_due_date.strftime('%d-%b-%Y')}). Please schedule an inspection."
                )

            elif delta_days <= 30:
                alert_type = "30_DAYS_NOTICE"
                msg = (
                    f"Advance Notice: Statutory verification for {inst.category_name} (S/N: {inst.serial_number}) "
                    f"will expire on {inst.next_due_date.strftime('%d-%b-%Y')}. Early application ensures hassle-free compliance."
                )

            if alert_type and msg:
                # Check if this alert was already sent in the last 3 days to avoid duplicates
                three_days_ago = now - datetime.timedelta(days=3)
                existing = db.query(AlertLog).filter(
                    AlertLog.instrument_id == inst.id,
                    AlertLog.alert_type == alert_type,
                    AlertLog.sent_at >= three_days_ago
                ).first()

                if not existing:
                    # Find latest certificate if any
                    latest_cert = db.query(Certificate).filter(
                        Certificate.instrument_id == inst.id
                    ).order_by(Certificate.issue_date.desc()).first()

                    alert_record = AlertLog(
                        instrument_id=inst.id,
                        certificate_id=latest_cert.id if latest_cert else None,
                        trader_id=owner.id,
                        alert_type=alert_type,
                        alert_channel="SMS & Email",
                        recipient_contact=f"{owner.phone} | {owner.email}",
                        message_content=msg,
                        sent_at=now,
                        status="DELIVERED"
                    )
                    db.add(alert_record)
                    alerts_created += 1

        db.commit()
        return {
            "scanned_instruments_count": len(instruments),
            "new_alerts_generated": alerts_created,
            "status_updates_count": status_updates,
            "timestamp": now.isoformat()
        }
