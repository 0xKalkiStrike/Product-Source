import io
from typing import List, Dict, Any
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT

def generate_pdf_report(project_name: str, project_id: str, report_data: List[Dict[str, Any]]) -> bytes:
    """
    Generates a valid, professional PDF document for MarketLens Verified Results.
    Returns binary PDF bytes.
    """
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
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0f172a'),
        alignment=TA_LEFT
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#475569'),
        alignment=TA_LEFT
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1e293b'),
        spaceBefore=10,
        spaceAfter=6
    )

    cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#334155')
    )

    cell_bold_style = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#0f172a')
    )

    header_cell_style = ParagraphStyle(
        'HeaderCell',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white,
        alignment=TA_LEFT
    )

    story = []

    # Title & Header Banner
    story.append(Paragraph("MarketLens Verification & Intelligence Report", title_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph(f"Project: <b>{project_name}</b> (ID: {project_id[:8]}) &nbsp;|&nbsp; Total Records: <b>{len(report_data)}</b>", subtitle_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#2563eb'), spaceAfter=12))

    # Summary KPI Cards Table
    verified_count = sum(1 for r in report_data if r.get("Verification Status") == "VERIFIED")
    diff_count = sum(1 for r in report_data if r.get("Verification Status") == "PRICE_DIFFERENCE")
    
    kpi_data = [
        [
            Paragraph(f"<b>Total Products</b><br/><font size=14 color='#0f172a'><b>{len(report_data)}</b></font>", cell_style),
            Paragraph(f"<b>Verified Matches</b><br/><font size=14 color='#16a34a'><b>{verified_count}</b></font>", cell_style),
            Paragraph(f"<b>Price Variances</b><br/><font size=14 color='#dc2626'><b>{diff_count}</b></font>", cell_style)
        ]
    ]
    kpi_table = Table(kpi_data, colWidths=[180, 180, 180])
    kpi_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')),
        ('INNERGRID', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 14))

    # Section Header
    story.append(Paragraph("Verified Product Records Matrix", h2_style))

    # Table Headers
    headers = ["SKU", "Product Name", "Excel Price", "Source Price", "Status", "Source"]
    table_raw_data = [[Paragraph(h, header_cell_style) for h in headers]]

    # Fill Table Rows
    for item in report_data:
        sku = str(item.get("SKU", "N/A"))
        name = str(item.get("Product Name", "Unnamed"))
        if len(name) > 35:
            name = name[:32] + "..."
        
        excel_price = f"${item.get('Excel Price ($)', 0.0):.2f}"
        source_price = f"${item.get('Source Price ($)', 0.0):.2f}"
        status = str(item.get("Verification Status", "UNVERIFIED"))
        source = str(item.get("Source", "Public Source"))

        status_color = "#16a34a" if status == "VERIFIED" else "#dc2626"
        status_para = Paragraph(f"<font color='{status_color}'><b>{status}</b></font>", cell_style)

        table_raw_data.append([
            Paragraph(sku, cell_bold_style),
            Paragraph(name, cell_style),
            Paragraph(excel_price, cell_style),
            Paragraph(source_price, cell_style),
            status_para,
            Paragraph(source, cell_style)
        ])

    data_table = Table(table_raw_data, colWidths=[75, 175, 65, 65, 80, 80])
    
    t_style = [
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f172a')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
    ]
    for i in range(1, len(table_raw_data)):
        bg = colors.HexColor('#f8fafc') if i % 2 == 0 else colors.white
        t_style.append(('BACKGROUND', (0, i), (-1, i), bg))

    data_table.setStyle(TableStyle(t_style))
    story.append(data_table)

    story.append(Spacer(1, 16))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#cbd5e1'), spaceAfter=8))
    story.append(Paragraph("Generated by MarketLens Product Verification & Market Intelligence Platform", subtitle_style))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
