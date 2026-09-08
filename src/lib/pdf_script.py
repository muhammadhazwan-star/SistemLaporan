#!/usr/bin/env python3
"""
Al Amin Edu Oasis — Course Report PDF generator.
Reads a JSON payload describing a report on stdin and writes a branded PDF.

Sections (per PRD §7):
  Header  -> turquoise band, logo, "Laporan Kursus"
  Course title + details (tarikh / masa / lokasi)
  Attendance stats (hadiran / jumlah + percentage bar)
  Ringkasan (executive summary, AI)
  Kelebihan (AI strengths, bullets)
  Kelemahan (AI weaknesses, bullets)
  Cadangan (AI suggestions, bullets)
  Maklum Balas (Google Form link + QR code)
  Galeri Gambar (uploaded photos, grid)
  Footer  -> page number, generation date, system name
"""
import sys
import json
import os
import io
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
    Image, KeepTogether, FrameBreak, PageBreak
)
from reportlab.platypus.flowables import HRFlowable
from reportlab.pdfgen import canvas as canvasmod
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

import qrcode
from PIL import Image as PILImage

# -------- Brand colours (PRD §9.1) --------
TURQUOISE = colors.HexColor("#0E8C96")
TURQUOISE_LIGHT = colors.HexColor("#14B8B8")
WHITE = colors.HexColor("#FFFFFF")
DARK = colors.HexColor("#333333")
BLACK = colors.HexColor("#111111")
LIGHT_TINT = colors.HexColor("#EAF5F6")   # very light turquoise tint
MID_GREY = colors.HexColor("#666666")

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm

# -------- Fonts: prefer DejaVu (ships with reportlab) for full glyph support --------
def _register_fonts():
    candidates = [
        ("DejaVuSans", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        ("DejaVuSans-Bold", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
        ("DejaVuSans-Oblique", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf"),
    ]
    registered = []
    for name, path in candidates:
        if os.path.exists(path):
            try:
                pdfmetrics.registerFont(TTFont(name, path))
                registered.append(name)
            except Exception:
                pass
    body = "DejaVuSans" if "DejaVuSans" in registered else "Helvetica"
    bold = "DejaVuSans-Bold" if "DejaVuSans-Bold" in registered else "Helvetica-Bold"
    italic = "DejaVuSans-Oblique" if "DejaVuSans-Oblique" in registered else "Helvetica-Oblique"
    return body, bold, italic

BODY, BOLD, ITALIC = _register_fonts()

# -------- Styles --------
def build_styles():
    s = {}
    s["course_title"] = ParagraphStyle("course_title", fontName=BOLD, fontSize=20, leading=24, textColor=DARK, spaceAfter=2)
    s["course_sub"] = ParagraphStyle("course_sub", fontName=BODY, fontSize=9, leading=12, textColor=MID_GREY, spaceAfter=2)
    s["section_h"] = ParagraphStyle("section_h", fontName=BOLD, fontSize=12, leading=15, textColor=WHITE, spaceAfter=0)
    s["body"] = ParagraphStyle("body", fontName=BODY, fontSize=10, leading=15, textColor=DARK, alignment=TA_JUSTIFY, spaceAfter=4)
    s["body_tight"] = ParagraphStyle("body_tight", fontName=BODY, fontSize=10, leading=13, textColor=DARK, spaceAfter=2)
    s["bullet"] = ParagraphStyle("bullet", fontName=BODY, fontSize=10, leading=14, textColor=DARK, leftIndent=12, bulletIndent=2, spaceAfter=3)
    s["label"] = ParagraphStyle("label", fontName=BOLD, fontSize=8, leading=10, textColor=TURQUOISE, spaceAfter=1)
    s["value"] = ParagraphStyle("value", fontName=BODY, fontSize=10, leading=12, textColor=DARK, spaceAfter=1)
    s["big_num"] = ParagraphStyle("big_num", fontName=BOLD, fontSize=26, leading=28, textColor=TURQUOISE, alignment=TA_CENTER)
    s["big_sub"] = ParagraphStyle("big_sub", fontName=BODY, fontSize=8, leading=10, textColor=MID_GREY, alignment=TA_CENTER)
    s["link"] = ParagraphStyle("link", fontName=BODY, fontSize=9, leading=12, textColor=TURQUOISE, alignment=TA_LEFT)
    s["gallery_cap"] = ParagraphStyle("gallery_cap", fontName=ITALIC, fontSize=7, leading=9, textColor=MID_GREY, alignment=TA_CENTER)
    s["footer"] = ParagraphStyle("footer", fontName=BODY, fontSize=7.5, leading=9, textColor=WHITE)
    return s

STYLES = build_styles()


def parse_bullets(text):
    """Split AI text into bullet lines. Accepts '- ' or '• ' prefixes."""
    if not text:
        return []
    lines = []
    for raw in text.split("\n"):
        line = raw.strip()
        if not line:
            continue
        # strip leading bullet markers
        for marker in ["- ", "• ", "* ", "– "]:
            if line.startswith(marker):
                line = line[len(marker):].strip()
                break
        # also strip leading '-'
        if line.startswith("-"):
            line = line.lstrip("-").strip()
        if line:
            lines.append(line)
    return lines


def section_header(title):
    """A turquoise band acting as a section header."""
    p = Paragraph(title, STYLES["section_h"])
    t = Table([[p]], colWidths=[PAGE_W - 2 * MARGIN])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), TURQUOISE),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LINEBELOW", (0, 0), (-1, -1), 2, BLACK),
    ]))
    return t


def make_qr_bytes(url):
    """Generate a QR code PNG as reportlab ImageData (bytes)."""
    if not url:
        return None
    qr = qrcode.QRCode(box_size=10, border=2, error_correction=qrcode.constants.ERROR_CORRECT_M)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#333333", back_color="white").convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


def _prepare_logo(logo_path):
    """Flatten the logo onto a white background and return a path ReportLab can draw reliably."""
    if not logo_path or not os.path.exists(logo_path):
        return None
    try:
        im = PILImage.open(logo_path).convert("RGBA")
        bg = PILImage.new("RGBA", im.size, (255, 255, 255, 255))
        bg.paste(im, (0, 0), im)
        bg = bg.convert("RGB")
        tmp = "/tmp/_alamin_logo_flat.png"
        bg.save(tmp, "PNG")
        return tmp
    except Exception:
        return None


def header_footer(canv, doc, report, _logo_cache={}):
    """Draw the branded header band + footer on every page."""
    canv.saveState()
    # ---- Header band ----
    band_h = 26 * mm
    canv.setFillColor(TURQUOISE)
    canv.rect(0, PAGE_H - band_h, PAGE_W, band_h, stroke=0, fill=1)
    # accent stripe
    canv.setFillColor(BLACK)
    canv.rect(0, PAGE_H - band_h - 2, PAGE_W, 2, stroke=0, fill=1)

    # Logo (real brand emblem — already contains "AL AMIN EDU OASIS SDN BHD" text,
    # so the logo IS the brand identity; no redundant company-name text needed)
    logo_path = report.get("logoPath", "")
    if "_path" not in _logo_cache or _logo_cache.get("_path") != logo_path:
        _logo_cache["_path"] = logo_path
        _logo_cache["_flat"] = _prepare_logo(logo_path)
    flat_logo = _logo_cache.get("_flat")
    logo_box = 20 * mm
    if flat_logo:
        # white plate behind the logo
        canv.setFillColor(WHITE)
        canv.rect(MARGIN, PAGE_H - band_h + 3 * mm, logo_box, logo_box, stroke=0, fill=1)
        canv.setStrokeColor(BLACK)
        canv.setLineWidth(1)
        canv.rect(MARGIN, PAGE_H - band_h + 3 * mm, logo_box, logo_box, stroke=1, fill=0)
        try:
            canv.drawImage(flat_logo, MARGIN + 1, PAGE_H - band_h + 3 * mm + 1,
                           width=logo_box - 2, height=logo_box - 2, preserveAspectRatio=True, anchor='c')
        except Exception:
            pass

    # Module/unit info next to the logo (the logo itself carries the brand name)
    canv.setFillColor(WHITE)
    canv.setFont(BOLD, 12)
    canv.drawString(MARGIN + logo_box + 3 * mm, PAGE_H - 9 * mm, "LAPORAN KURSUS")
    canv.setFont(BODY, 8)
    canv.setFillColor(colors.HexColor("#DDF4F5"))
    canv.drawString(MARGIN + logo_box + 3 * mm, PAGE_H - 14 * mm, "Unit Latihan & Pembangunan Guru & Staf")
    # Right side label
    canv.setFont(BOLD, 9)
    canv.setFillColor(WHITE)
    gen = report.get("tarikhDijana", "")
    canv.drawRightString(PAGE_W - MARGIN, PAGE_H - 15.5 * mm, f"Dijana: {gen}")

    # ---- Footer ----
    foot_h = 12 * mm
    canv.setFillColor(DARK)
    canv.rect(0, 0, PAGE_W, foot_h, stroke=0, fill=1)
    # turquoise accent stripe on top of footer
    canv.setFillColor(TURQUOISE)
    canv.rect(0, foot_h - 2, PAGE_W, 2, stroke=0, fill=1)
    canv.setFillColor(WHITE)
    canv.setFont(BODY, 7.5)
    canv.drawString(MARGIN, 4 * mm, "Sistem LMS Al Amin Edu Oasis  ·  Modul Penjanaan Laporan Kursus")
    canv.drawRightString(PAGE_W - MARGIN, 4 * mm, f"Halaman {doc.page}")
    canv.restoreState()


def build_pdf(report, out_path):
    logo_path = report.get("logoPath", "")
    photos = report.get("gambarUrls", []) or []

    doc = BaseDocTemplate(
        out_path,
        pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=32 * mm, bottomMargin=16 * mm,
        title=f"Laporan Kursus - {report.get('namaKursus','')}",
        author="Al Amin Edu Oasis Sdn Bhd",
    )

    frame = Frame(MARGIN, 16 * mm, PAGE_W - 2 * MARGIN, PAGE_H - 32 * mm - 16 * mm,
                  leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0, showBoundary=0)
    doc.addPageTemplates([
        PageTemplate(id="branded", frames=[frame], onPage=lambda c, d: header_footer(c, d, report))
    ])

    story = []

    # ---- Course title block ----
    story.append(Paragraph(report.get("namaKursus", "Kursus Latihan"), STYLES["course_title"]))
    penyedia = report.get("penyedia", "")
    if penyedia:
        story.append(Paragraph(f"Disediakan oleh: {penyedia}", STYLES["course_sub"]))
    story.append(HRFlowable(width="100%", thickness=2, color=BLACK, spaceBefore=3, spaceAfter=8))

    # ---- Course details (tarikh / masa / lokasi) ----
    def detail_cell(icon_color, label, value):
        inner = [
            Paragraph(label.upper(), STYLES["label"]),
            Paragraph(value or "N/A", STYLES["value"]),
        ]
        return inner

    details = Table([[
        detail_cell(TURQUOISE, "Tarikh", report.get("tarikh", "N/A")),
        detail_cell(TURQUOISE, "Masa", report.get("masa", "N/A")),
        detail_cell(TURQUOISE, "Lokasi", report.get("lokasi", "N/A")),
    ]], colWidths=[(PAGE_W - 2 * MARGIN) / 3.0] * 3)
    details.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_TINT),
        ("BOX", (0, 0), (-1, -1), 1.5, BLACK),
        ("INNERGRID", (0, 0), (-1, -1), 1, colors.HexColor("#BFE3E5")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBEFORE", (0, 0), (0, -1), 4, TURQUOISE),
    ]))
    story.append(details)
    story.append(Spacer(1, 8))

    # ---- Attendance stats ----
    hadir = report.get("hadiran", 0) or 0
    jumlah = report.get("jumlah", 0) or 0
    pct = int(round((hadir / jumlah) * 100)) if jumlah > 0 else 0
    kehadiran_text = report.get("kehadiran", "N/A")

    # Big number + percentage bar
    pct_label = f"{pct}%" if jumlah > 0 else "—"
    num_cell = Table([
        [Paragraph(str(hadir), STYLES["big_num"])],
        [Paragraph(f"dari {jumlah if jumlah else '?'} peserta", STYLES["big_sub"])],
    ], colWidths=[40 * mm])
    num_cell.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), TURQUOISE),
        ("TEXTCOLOR", (0, 0), (-1, -1), WHITE),
        ("BOX", (0, 0), (-1, -1), 1.5, BLACK),
    ]))
    # recolour big_num for white background
    big_num_w = ParagraphStyle("big_num_w", parent=STYLES["big_num"], textColor=WHITE)
    big_sub_w = ParagraphStyle("big_sub_w", parent=STYLES["big_sub"], textColor=colors.HexColor("#DDF4F5"))
    num_cell = Table([
        [Paragraph(str(hadir), big_num_w)],
        [Paragraph(f"dari {jumlah if jumlah else '?'} peserta", big_sub_w)],
    ], colWidths=[40 * mm])
    num_cell.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), TURQUOISE),
        ("BOX", (0, 0), (-1, -1), 1.5, BLACK),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))

    # progress bar as a Table
    bar_total = 100 * mm
    bar_fill = (pct / 100.0) * bar_total if jumlah > 0 else 0
    bar = Table([[""]], colWidths=[bar_fill], rowHeights=[8])
    bar.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), TURQUOISE)]))
    bar_track = Table([[bar]], colWidths=[bar_total])
    bar_track.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_TINT),
        ("BOX", (0, 0), (-1, -1), 1, BLACK),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))

    right_block = [
        Paragraph("STATISTIK KEHADIRAN", STYLES["label"]),
        Paragraph(f"<b>{kehadiran_text}</b>  ·  {pct_label} kehadiran", STYLES["body_tight"]),
        Spacer(1, 4),
        bar_track,
        Spacer(1, 2),
        Paragraph(f"Kehadiran: {hadir}   |   Jumlah: {jumlah or 'N/A'}   |   Peratusan: {pct_label}", STYLES["body_tight"]),
    ]

    attend = Table([[num_cell, right_block]], colWidths=[44 * mm, PAGE_W - 2 * MARGIN - 44 * mm])
    attend.setStyle(TableStyle([
        ("BACKGROUND", (1, 0), (1, 0), WHITE),
        ("BOX", (0, 0), (-1, -1), 1.5, BLACK),
        ("INNERGRID", (0, 0), (-1, -1), 1.5, BLACK),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (1, 0), (1, 0), 10),
        ("RIGHTPADDING", (1, 0), (1, 0), 10),
        ("TOPPADDING", (1, 0), (1, 0), 8),
        ("BOTTOMPADDING", (1, 0), (1, 0), 8),
    ]))
    story.append(attend)
    story.append(Spacer(1, 10))

    # ---- Ringkasan ----
    if report.get("ringkasanAi"):
        story.append(section_header("RINGKASAN KURSUS"))
        story.append(Spacer(1, 4))
        story.append(Paragraph(report["ringkasanAi"], STYLES["body"]))
        story.append(Spacer(1, 8))

    # ---- Kelebihan ----
    kelebihan = parse_bullets(report.get("kelebihanAi", ""))
    if kelebihan:
        story.append(section_header("KELEBIHAN KURSUS"))
        story.append(Spacer(1, 4))
        for b in kelebihan:
            story.append(Paragraph(f"• {b}", STYLES["bullet"]))
        story.append(Spacer(1, 8))

    # ---- Kelemahan ----
    kelemahan = parse_bullets(report.get("kelemahanAi", ""))
    if kelemahan:
        story.append(section_header("KELEMAHAN & CABARAN"))
        story.append(Spacer(1, 4))
        for b in kelemahan:
            story.append(Paragraph(f"• {b}", STYLES["bullet"]))
        story.append(Spacer(1, 8))

    # ---- Cadangan ----
    cadangan = parse_bullets(report.get("cadanganAi", ""))
    if cadangan:
        story.append(section_header("CADANGAN PENAMBAHBAIKAN"))
        story.append(Spacer(1, 4))
        for b in cadangan:
            story.append(Paragraph(f"• {b}", STYLES["bullet"]))
        story.append(Spacer(1, 8))

    # ---- Maklum Balas (link + QR) ----
    gform = report.get("pautanGform", "")
    if gform:
        feedback_parts = [section_header("BORANG MAKLUM BALAS"), Spacer(1, 6)]
        qr_buf = make_qr_bytes(gform)
        link_para = [
            Paragraph("PINDA / IMBAS KOD QR", STYLES["label"]),
            Spacer(1, 4),
            Paragraph("Sila imbas kod QR atau klik pautan di bawah untuk melengkapkan borang maklum balas kursus ini.", STYLES["body"]),
            Spacer(1, 6),
            Paragraph(f'<font color="#0E8C96"><u><a href="{gform}">{gform}</a></u></font>', STYLES["link"]),
        ]
        if qr_buf:
            qr_img = Image(qr_buf, width=28 * mm, height=28 * mm)
            qr_cell = Table([[qr_img]], colWidths=[34 * mm], rowHeights=[34 * mm])
            qr_cell.setStyle(TableStyle([
                ("BOX", (0, 0), (-1, -1), 1.5, BLACK),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BACKGROUND", (0, 0), (-1, -1), WHITE),
            ]))
            fb = Table([[qr_cell, link_para]], colWidths=[36 * mm, PAGE_W - 2 * MARGIN - 36 * mm])
        else:
            fb = Table([[link_para]], colWidths=[PAGE_W - 2 * MARGIN])
        fb.setStyle(TableStyle([
            ("BACKGROUND", (1, 0), (1, 0), LIGHT_TINT),
            ("BOX", (0, 0), (-1, -1), 1.5, BLACK),
            ("INNERGRID", (0, 0), (-1, -1), 1.5, BLACK),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (1, 0), (1, 0), 10),
            ("RIGHTPADDING", (1, 0), (1, 0), 10),
            ("TOPPADDING", (1, 0), (1, 0), 10),
            ("BOTTOMPADDING", (1, 0), (1, 0), 10),
        ]))
        feedback_parts.append(fb)
        feedback_parts.append(Spacer(1, 10))
        # Keep header + body together so they never split across pages
        story.append(KeepTogether(feedback_parts))

    # ---- Galeri Gambar ----
    if photos:
        gallery_parts = [section_header("GALERI GAMBAR AKTIVITI"), Spacer(1, 6)]
        # Adaptive columns: 1 -> 1 col, 2 -> 2 cols, 3+ -> 3 cols
        cols = 3 if len(photos) >= 3 else len(photos)
        cell_w = (PAGE_W - 2 * MARGIN) / cols
        cell_h = cell_w * 0.62
        rows = []
        for i in range(0, len(photos), cols):
            chunk = photos[i:i + cols]
            row_imgs = []
            for p in chunk:
                abs_path = os.path.join(os.environ.get("PUBLIC_DIR", "/app/public"), p.lstrip("/")) if p.startswith("/") else p
                try:
                    if os.path.exists(abs_path):
                        img = Image(abs_path, width=cell_w - 8, height=cell_h - 6)
                        img.hAlign = "CENTER"
                        row_imgs.append(img)
                    else:
                        row_imgs.append(Paragraph("[gambar tidak dijumpai]", STYLES["gallery_cap"]))
                except Exception:
                    row_imgs.append(Paragraph("[ralat gambar]", STYLES["gallery_cap"]))
            rows.append(row_imgs)

        gallery = Table(rows, colWidths=[cell_w] * cols, rowHeights=[cell_h] * len(rows))
        ts = [
            ("BOX", (0, 0), (-1, -1), 1.5, BLACK),
            ("INNERGRID", (0, 0), (-1, -1), 1.5, BLACK),
            ("BACKGROUND", (0, 0), (-1, -1), LIGHT_TINT),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 2),
            ("RIGHTPADDING", (0, 0), (-1, -1), 2),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ]
        gallery.setStyle(TableStyle(ts))
        gallery_parts.append(gallery)
        gallery_parts.append(Spacer(1, 6))
        gallery_parts.append(Paragraph(f"Jumlah gambar: {len(photos)}", STYLES["gallery_cap"]))
        story.append(KeepTogether(gallery_parts))

    doc.build(story)
    return out_path


def main():
    payload = sys.stdin.read()
    if not payload:
        sys.stderr.write("No JSON payload on stdin\n")
        sys.exit(1)
    data = json.loads(payload)
    report = data.get("report", data)
    out_path = data.get("outPath")
    if not out_path:
        sys.stderr.write("outPath required\n")
        sys.exit(1)
    # Default to the brand logo if none was provided
    if not report.get("logoPath"):
        report["logoPath"] = os.path.join(os.environ.get("PUBLIC_DIR", "/app/public"), "logo.png")
    # Pretty date string for header
    if "tarikhDijana" in report:
        try:
            dt = datetime.fromisoformat(report["tarikhDijana"].replace("Z", "+00:00"))
            report["tarikhDijana"] = dt.strftime("%d %b %Y, %H:%M")
        except Exception:
            pass
    build_pdf(report, out_path)
    print(json.dumps({"success": True, "outPath": out_path}))


if __name__ == "__main__":
    main()
