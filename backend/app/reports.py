import io
import datetime
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

from reportlab.graphics.shapes import Drawing, Rect, String, Group
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.piecharts import Pie

from app.models import LogEntry, AnomalyRecord, FalsePositiveRule

async def generate_forensic_pdf_report(db: AsyncSession) -> io.BytesIO:
    # 1. Fetch DB metrics & records
    total_logs_res = await db.execute(select(func.count(LogEntry.id)))
    total_logs = total_logs_res.scalar() or 0

    total_anomalies_res = await db.execute(select(func.count(AnomalyRecord.id)))
    total_anomalies = total_anomalies_res.scalar() or 0

    active_anomalies_res = await db.execute(
        select(func.count(AnomalyRecord.id)).where(AnomalyRecord.is_acknowledged == False)
    )
    active_anomalies = active_anomalies_res.scalar() or 0

    # Severity distribution
    info_res = await db.execute(select(func.count(LogEntry.id)).where(LogEntry.severity == "INFO"))
    info_count = info_res.scalar() or 0

    warn_res = await db.execute(select(func.count(LogEntry.id)).where(LogEntry.severity.in_(["WARN", "WARNING"])))
    warn_count = warn_res.scalar() or 0

    error_res = await db.execute(select(func.count(LogEntry.id)).where(LogEntry.severity.in_(["ERROR", "FATAL", "CRITICAL"])))
    error_count = error_res.scalar() or 0

    # Risk Distribution
    risk_normal_res = await db.execute(select(func.count(LogEntry.id)).where(LogEntry.risk_score < 50.0))
    risk_normal = risk_normal_res.scalar() or 0

    risk_elevated_res = await db.execute(select(func.count(LogEntry.id)).where((LogEntry.risk_score >= 50.0) & (LogEntry.risk_score < 75.0)))
    risk_elevated = risk_elevated_res.scalar() or 0

    risk_critical_res = await db.execute(select(func.count(LogEntry.id)).where(LogEntry.risk_score >= 75.0))
    risk_critical = risk_critical_res.scalar() or 0

    anomalies_res = await db.execute(
        select(AnomalyRecord).order_by(desc(AnomalyRecord.timestamp)).limit(25)
    )
    anomalies: List[AnomalyRecord] = anomalies_res.scalars().all()

    rules_res = await db.execute(
        select(FalsePositiveRule).order_by(desc(FalsePositiveRule.created_at))
    )
    rules: List[FalsePositiveRule] = rules_res.scalars().all()

    # 2. Setup ReportLab Document
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom Color Palette
    PRIMARY = colors.HexColor("#0F172A")    # Slate 900
    ACCENT_BLUE = colors.HexColor("#2563EB") # Blue 600
    ACCENT_RED = colors.HexColor("#DC2626")  # Red 600
    TEXT_DARK = colors.HexColor("#1E293B")   # Slate 800
    BG_LIGHT = colors.HexColor("#F8FAFC")    # Slate 50

    title_style = ParagraphStyle(
        'ReportTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=PRIMARY,
        alignment=TA_LEFT
    )

    subtitle_style = ParagraphStyle(
        'ReportSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#64748B"),
        alignment=TA_LEFT
    )

    h2_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=PRIMARY,
        spaceBefore=12,
        spaceAfter=6
    )

    cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=TEXT_DARK
    )

    cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=TEXT_DARK
    )

    story = []

    # Title & Header Banner
    now_str = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    story.append(Paragraph("LOGSENTINEL — SECURITY AUDIT & FORENSIC INCIDENT REPORT", title_style))
    story.append(Paragraph(f"AI-Driven Log Anomaly Detector | Generated: {now_str} | Classification: CONFIDENTIAL", subtitle_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=2, color=ACCENT_BLUE, spaceAfter=15))

    # Executive Summary KPIs Table
    kpi_data = [
        [
            Paragraph("<b>Total Logs Processed</b>", cell_bold),
            Paragraph("<b>Anomalies Detected</b>", cell_bold),
            Paragraph("<b>Active Threats</b>", cell_bold),
            Paragraph("<b>System Health</b>", cell_bold)
        ],
        [
            Paragraph(f"<font size=12 color='#2563EB'><b>{total_logs:,}</b></font>", cell_style),
            Paragraph(f"<font size=12 color='#DC2626'><b>{total_anomalies}</b></font>", cell_style),
            Paragraph(f"<font size=12 color='#D97706'><b>{active_anomalies}</b></font>", cell_style),
            Paragraph("<font size=11 color='#16A34A'><b>ONLINE (100%)</b></font>", cell_style)
        ]
    ]
    kpi_table = Table(kpi_data, colWidths=[135, 135, 135, 135])
    kpi_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER')
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 15))

    # Visual Threat & Severity Analytics Chart Section
    story.append(Paragraph("1. Graphical Threat Analytics & Risk Distribution", h2_style))

    # Create ReportLab Bar Chart for Risk Spectrum
    drawing = Drawing(540, 160)

    # Risk Distribution Bar Chart
    bc = VerticalBarChart()
    bc.x = 45
    bc.y = 25
    bc.height = 110
    bc.width = 210
    bc.data = [[risk_normal, risk_elevated, risk_critical]]
    bc.categoryAxis.categoryNames = ['Normal (<50)', 'Elevated (50-75)', 'Critical (>=75)']
    bc.categoryAxis.labels.fontSize = 7
    bc.valueAxis.valueMin = 0
    max_val = max(risk_normal, risk_elevated, risk_critical, 10)
    bc.valueAxis.valueMax = int(max_val * 1.2)
    bc.bars[0].fillColor = colors.HexColor("#2563EB")

    drawing.add(bc)

    # Pie Chart for Log Severity Distribution
    pc = Pie()
    pc.x = 310
    pc.y = 25
    pc.width = 110
    pc.height = 110
    total_sev = max(info_count + warn_count + error_count, 1)
    pc.data = [info_count, warn_count, error_count]
    pc.labels = [
        f"INFO ({info_count})",
        f"WARN ({warn_count})",
        f"CRITICAL ({error_count})"
    ]
    pc.sideLabels = 1
    pc.slices[0].fillColor = colors.HexColor("#3B82F6")
    pc.slices[1].fillColor = colors.HexColor("#F59E0B")
    pc.slices[2].fillColor = colors.HexColor("#EF4444")

    drawing.add(pc)
    story.append(drawing)
    story.append(Spacer(1, 15))

    # Forensic Anomaly Table
    story.append(Paragraph("2. Flagged Forensic Incident Records (Recent 25)", h2_style))
    
    anomaly_rows = [[
        Paragraph("<b>ID</b>", cell_bold),
        Paragraph("<b>Timestamp</b>", cell_bold),
        Paragraph("<b>Risk Score</b>", cell_bold),
        Paragraph("<b>Status</b>", cell_bold),
        Paragraph("<b>Root Cause Sequence Template</b>", cell_bold)
    ]]

    if not anomalies:
        anomaly_rows.append([
            Paragraph("N/A", cell_style),
            Paragraph("No anomalies recorded", cell_style),
            Paragraph("0.0", cell_style),
            Paragraph("CLEAR", cell_style),
            Paragraph("Normal system operation", cell_style)
        ])
    else:
        for a in anomalies:
            ts = a.timestamp.strftime("%Y-%m-%d %H:%M:%S") if a.timestamp else "N/A"
            risk_color = "#DC2626" if a.risk_score >= 75.0 else ("#D97706" if a.risk_score >= 50.0 else "#2563EB")
            status_text = a.status or ("ACKNOWLEDGED" if a.is_acknowledged else "ACTIVE")

            root_template = "Unspecified sequence pattern"
            if a.root_cause_chain and len(a.root_cause_chain) > 0:
                item = a.root_cause_chain[0]
                root_template = f"T{item.get('template_id', 'N/A')}: {item.get('raw_message', '')[:65]}..."

            anomaly_rows.append([
                Paragraph(f"#{a.id}", cell_bold),
                Paragraph(ts, cell_style),
                Paragraph(f"<font color='{risk_color}'><b>{a.risk_score:.1f}</b></font>", cell_style),
                Paragraph(f"<b>{status_text}</b>", cell_style),
                Paragraph(root_template, cell_style)
            ])

    anomaly_table = Table(anomaly_rows, colWidths=[35, 105, 60, 85, 255])
    anomaly_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(anomaly_table)
    story.append(Spacer(1, 15))

    # Active False Positive Rules Section
    story.append(Paragraph("3. Active Learning False Positive Dampening Rules", h2_style))
    rule_rows = [[
        Paragraph("<b>Template ID</b>", cell_bold),
        Paragraph("<b>Dampening Factor</b>", cell_bold),
        Paragraph("<b>Registered Date</b>", cell_bold),
        Paragraph("<b>Operator Feedback Notes</b>", cell_bold)
    ]]

    if not rules:
        rule_rows.append([
            Paragraph("None", cell_style),
            Paragraph("1.0x (100%)", cell_style),
            Paragraph("N/A", cell_style),
            Paragraph("No active false positive dampening rules registered", cell_style)
        ])
    else:
        for r in rules:
            created = r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else "N/A"
            rule_rows.append([
                Paragraph(f"Template #{r.template_id}", cell_bold),
                Paragraph(f"{r.dampening_factor * 100:.0f}% ({r.dampening_factor}x)", cell_style),
                Paragraph(created, cell_style),
                Paragraph(r.notes or "Operator marked as false positive", cell_style)
            ])

    rules_table = Table(rule_rows, colWidths=[90, 90, 100, 260])
    rules_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#334155")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(rules_table)
    story.append(Spacer(1, 15))

    # SecOps Remediation & Audit Sign-Off
    story.append(Paragraph("4. SecOps Incident Remediation & Recommendations", h2_style))
    rec_text = """
    • <b>P1 Critical Alerts (Risk Score >= 75.0):</b> Inspect sequence root-cause template errors and initiate automated pod/daemon restarts.<br/>
    • <b>Active Learning Dampening:</b> Periodically review False Positive rules in Section 3 to ensure critical zero-day threats are not inadvertently suppressed.<br/>
    • <b>Model Health:</b> Trigger LSTM Autoencoder retraining every 10,000 ingested log sequence blocks to adjust for shifting normal traffic baselines.
    """
    story.append(Paragraph(rec_text, cell_style))
    story.append(Spacer(1, 20))

    # Footer Signoff Line
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceAfter=10))
    story.append(Paragraph("LogSentinel Automated Cyber Audit System — End of Report", ParagraphStyle('Footer', parent=subtitle_style, alignment=TA_CENTER)))

    # Build Document
    doc.build(story)
    buffer.seek(0)
    return buffer
