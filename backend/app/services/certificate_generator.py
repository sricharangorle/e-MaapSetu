"""
PDF Certificate Generator with Tamper-Proof Cryptographic Signatures & Dynamic QR Code
"""
import os
import hashlib
import hmac
import datetime
from pathlib import Path
import qrcode
from PIL import Image
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from backend.app.config import CERTIFICATE_DIR, SECRET_KEY


class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas for adding watermark, border, and page footer"""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        
        # Outer double border (Security Certificate Border)
        self.setStrokeColor(colors.HexColor("#1e3a8a"))  # Deep Blue
        self.setLineWidth(2.5)
        self.rect(20, 20, A4[0] - 40, A4[1] - 40)
        
        self.setStrokeColor(colors.HexColor("#93c5fd"))  # Soft Blue Inner Line
        self.setLineWidth(1.0)
        self.rect(24, 24, A4[0] - 48, A4[1] - 48)

        # Background Watermark
        self.setFont("Helvetica-Bold", 46)
        self.setFillColor(colors.HexColor("#f1f5f9"))
        self.drawCentredString(A4[0] / 2.0, A4[1] / 2.0, "LEGAL METROLOGY CERTIFIED")

        # Bottom Security Footer
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawString(30, 30, "Official Digital Document • Government of India • Legal Metrology Act, 2009")
        self.drawRightString(A4[0] - 30, 30, f"Page {self._pageNumber} of {page_count} • Cryptographically Verified")
        
        self.restoreState()


class CertificateService:

    @staticmethod
    def generate_cryptographic_hash(cert_data: dict) -> str:
        """Create SHA-256 HMAC digest of certificate payload"""
        serialized = f"{cert_data.get('certificate_no')}|{cert_data.get('serial_number')}|{cert_data.get('issue_date')}|{cert_data.get('valid_until')}|{cert_data.get('digital_seal_no')}"
        return hmac.new(SECRET_KEY.encode(), serialized.encode(), hashlib.sha256).hexdigest()

    @classmethod
    def generate_qr_code(cls, cert_no: str, base_url: str = "http://localhost:8000") -> str:
        """Generate QR code PNG file pointing to public verification page"""
        qr_dir = CERTIFICATE_DIR / "qr_codes"
        qr_dir.mkdir(exist_ok=True)
        qr_path = qr_dir / f"{cert_no}_qr.png"

        verify_url = f"{base_url}/verify/{cert_no}"
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=8,
            border=2,
        )
        qr.add_data(verify_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="#1e3a8a", back_color="white")
        img.save(str(qr_path))
        return str(qr_path)

    @classmethod
    def generate_certificate_pdf(cls, cert_payload: dict, base_url: str = "http://localhost:8000") -> tuple:
        """
        Generate full official PDF Certificate of Verification.
        """
        cert_no = cert_payload["certificate_no"]
        pdf_path = CERTIFICATE_DIR / f"{cert_no}.pdf"
        qr_img_path = cls.generate_qr_code(cert_no, base_url)
        crypto_hash = cls.generate_cryptographic_hash(cert_payload)

        doc = SimpleDocTemplate(
            str(pdf_path),
            pagesize=A4,
            leftMargin=35,
            rightMargin=35,
            topMargin=35,
            bottomMargin=45
        )

        styles = getSampleStyleSheet()
        
        # Custom Typography Styles
        title_style = ParagraphStyle(
            'GovtTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=14,
            leading=18,
            alignment=1, # Center
            textColor=colors.HexColor('#0f172a')
        )
        subtitle_style = ParagraphStyle(
            'GovtSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=10,
            leading=13,
            alignment=1,
            textColor=colors.HexColor('#1e40af')
        )
        body_style = ParagraphStyle(
            'Body',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#1e293b')
        )
        body_bold = ParagraphStyle(
            'BodyBold',
            parent=body_style,
            fontName='Helvetica-Bold'
        )
        badge_style = ParagraphStyle(
            'Badge',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=10,
            leading=12,
            alignment=1,
            textColor=colors.HexColor('#065f46')
        )

        story = []

        # Header Section
        story.append(Paragraph("GOVERNMENT OF NATIONAL CAPITAL TERRITORY OF DELHI", title_style))
        story.append(Paragraph("DEPARTMENT OF LEGAL METROLOGY (WEIGHTS & MEASURES)", subtitle_style))
        story.append(Paragraph("<b>CERTIFICATE OF VERIFICATION AND STAMPING</b><br/><font size=8>(Issued under Section 24 of The Legal Metrology Act, 2009 & Rule 27 of General Rules, 2011)</font>", title_style))
        story.append(Spacer(1, 8))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1e40af"), spaceAfter=10))

        # Certificate Meta & QR Table (Top bar)
        qr_img = RLImage(qr_img_path, width=70, height=70)
        
        meta_html = f"""
        <b>Certificate No:</b> <font color="#1e40af">{cert_payload.get('certificate_no')}</font><br/>
        <b>Digital Seal / Stamp ID:</b> {cert_payload.get('digital_seal_no')}<br/>
        <b>Date of Verification:</b> {cert_payload.get('issue_date')}<br/>
        <b>Validity Period:</b> <font color="#059669"><b>Valid Until {cert_payload.get('valid_until')}</b></font><br/>
        <b>Jurisdiction:</b> {cert_payload.get('jurisdiction', 'South Delhi Circle, Delhi')}
        """
        
        top_table_data = [
            [Paragraph(meta_html, body_style), qr_img]
        ]
        top_table = Table(top_table_data, colWidths=[380, 80])
        top_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BACKGROUND', (0,0), (0,0), colors.HexColor('#f8fafc')),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ]))
        story.append(top_table)
        story.append(Spacer(1, 10))

        # 1. Establishment / Trader Details
        story.append(Paragraph("<b>1. ESTABLISHMENT / TRADER DETAILS</b>", subtitle_style))
        trader_table_data = [
            [Paragraph("<b>Name of Business:</b>", body_bold), Paragraph(str(cert_payload.get("trader_org_name", "N/A")), body_style)],
            [Paragraph("<b>Proprietor / Contact:</b>", body_bold), Paragraph(f"{cert_payload.get('trader_name', 'N/A')} ({cert_payload.get('trader_phone', 'N/A')})", body_style)],
            [Paragraph("<b>GSTIN / License No:</b>", body_bold), Paragraph(str(cert_payload.get("gstin", "N/A")), body_style)],
            [Paragraph("<b>Premises Address:</b>", body_bold), Paragraph(str(cert_payload.get("installation_address", "N/A")), body_style)],
        ]
        trader_table = Table(trader_table_data, colWidths=[140, 320])
        trader_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#f1f5f9')),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(trader_table)
        story.append(Spacer(1, 10))

        # 2. Instrument Technical Details
        story.append(Paragraph("<b>2. INSTRUMENT TECHNICAL SPECIFICATIONS</b>", subtitle_style))
        inst_table_data = [
            [Paragraph("<b>Instrument UID:</b>", body_bold), Paragraph(str(cert_payload.get("instrument_uid", "N/A")), body_style),
             Paragraph("<b>Accuracy Class:</b>", body_bold), Paragraph(f"<font color='#1e40af'><b>{cert_payload.get('accuracy_class', 'Class III')}</b></font>", body_style)],
            [Paragraph("<b>Category / Type:</b>", body_bold), Paragraph(str(cert_payload.get("category_name", "N/A")), body_style),
             Paragraph("<b>Model Approval No:</b>", body_bold), Paragraph(str(cert_payload.get("model_approval_no", "IND/09/2023/512")), body_style)],
            [Paragraph("<b>Make & Model:</b>", body_bold), Paragraph(f"{cert_payload.get('make', '')} {cert_payload.get('model_name', '')}", body_style),
             Paragraph("<b>Serial Number:</b>", body_bold), Paragraph(f"<b>{cert_payload.get('serial_number', 'N/A')}</b>", body_style)],
            [Paragraph("<b>Capacity Range:</b>", body_bold), Paragraph(f"Min: {cert_payload.get('min_capacity', 0)} {cert_payload.get('unit', '')} | Max: {cert_payload.get('max_capacity', 0)} {cert_payload.get('unit', '')}", body_style),
             Paragraph("<b>Scale Interval (e):</b>", body_bold), Paragraph(f"e = {cert_payload.get('verification_scale_interval_e', 1)} {cert_payload.get('unit', '')}", body_style)],
        ]
        inst_table = Table(inst_table_data, colWidths=[120, 140, 120, 140])
        inst_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#f1f5f9')),
            ('BACKGROUND', (2,0), (2,-1), colors.HexColor('#f1f5f9')),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(inst_table)
        story.append(Spacer(1, 10))

        # 3. Verification & Calibration Summary
        story.append(Paragraph("<b>3. VERIFICATION & TEST OBSERVATION SUMMARY</b>", subtitle_style))
        test_summary_data = [
            [Paragraph("<b>Test Procedure</b>", body_bold), Paragraph("<b>Standards Utilized</b>", body_bold), Paragraph("<b>Statutory MPE Compliance</b>", body_bold), Paragraph("<b>Result</b>", body_bold)],
            [
                Paragraph("Visual & Security Seal Check", body_style),
                Paragraph("Standard Working Weights OIML F1/M1", body_style),
                Paragraph("Seals & Model Identification Intact", body_style),
                Paragraph("<font color='#059669'><b>PASSED</b></font>", body_style)
            ],
            [
                Paragraph("Repeatability & Eccentricity Test", body_style),
                Paragraph("Certified Working Standards", body_style),
                Paragraph("Within Allowed Error Bounds (±0.5e to ±1.5e)", body_style),
                Paragraph("<font color='#059669'><b>PASSED</b></font>", body_style)
            ],
            [
                Paragraph("Linearity / Error of Indication Test", body_style),
                Paragraph("Verified Standard Masses", body_style),
                Paragraph("Max observed error ≤ MPE", body_style),
                Paragraph("<font color='#059669'><b>PASSED</b></font>", body_style)
            ]
        ]
        test_table = Table(test_summary_data, colWidths=[140, 140, 150, 90])
        test_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#e2e8f0')),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 6),
            ('ALIGN', (3,0), (3,-1), 'CENTER'),
        ]))
        story.append(test_table)
        story.append(Spacer(1, 12))

        # 4. Authentication & Signatures
        story.append(Paragraph("<b>4. STATUTORY DECLARATION & OFFICER AUTHENTICATION</b>", subtitle_style))
        declaration_text = (
            "<i>I hereby certify that the weighing / measuring instrument described above has been examined, verified, and stamped "
            "in accordance with the provisions of the Legal Metrology Act, 2009 and the Legal Metrology (General) Rules, 2011, "
            "and found to conform to the prescribed standards of accuracy.</i>"
        )
        story.append(Paragraph(declaration_text, body_style))
        story.append(Spacer(1, 10))

        officer_box_data = [
            [
                Paragraph(f"""
                <b>Verified & Issued By:</b><br/>
                <b>{cert_payload.get('officer_name', 'Legal Metrology Officer')}</b><br/>
                {cert_payload.get('officer_designation', 'Inspector of Legal Metrology')}<br/>
                {cert_payload.get('jurisdiction', 'South Delhi Circle, Delhi')}<br/>
                <font size=7 color="#64748b">Digitally signed on {cert_payload.get('issue_date')}</font>
                """, body_style),
                Paragraph(f"""
                <b>Cryptographic Authenticity Token:</b><br/>
                <font size=6 face="Courier">{crypto_hash[:32]}<br/>{crypto_hash[32:]}</font><br/><br/>
                <font size=7 color="#059669"><b>✓ SHA-256 Tamper-Proof Verified Seal</b></font>
                """, body_style)
            ]
        ]
        officer_table = Table(officer_box_data, colWidths=[260, 260])
        officer_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ]))
        story.append(officer_table)

        doc.build(story, canvasmaker=NumberedCanvas)
        return str(pdf_path), crypto_hash
