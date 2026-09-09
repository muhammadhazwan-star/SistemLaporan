import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { Buffer } from "buffer";
import { BRAND } from "./brand";

export interface ReportData {
  id: string;
  namaKursus: string;
  tarikh: string;
  masa: string;
  lokasi: string;
  kehadiran: string;
  hadiran: number;
  jumlah: number;
  ringkasanAi: string;
  kelebihanAi: string;
  kelemahanAi: string;
  cadanganAi: string;
  pautanGform: string;
  gambarUrls: string[];
  urlPdf?: string;
  status: string;
  penyedia: string;
  rawInput: string;
  tarikhDijana: string;
  updatedAt: string;
}

// ============================================================
// Pure-JavaScript PDF generator using jsPDF + qrcode.
// Works on any platform (Vercel, Railway, Docker, sandbox) — no Python.
// ============================================================

// Brand colors (RGB)
const TQ: [number, number, number] = [14, 140, 150];
const WHITE: [number, number, number] = [255, 255, 255];
const DARK: [number, number, number] = [51, 51, 51];
const BLACK: [number, number, number] = [17, 17, 17];
const LIGHT_TINT: [number, number, number] = [234, 245, 246];
const MID_GREY: [number, number, number] = [102, 102, 102];

// A4 in points
const PW = 595.28;
const PH = 841.89;
const M = 50;

function parseBullets(text: string): string[] {
  if (!text) return [];
  const out: string[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    let c = line;
    for (const mk of ["- ", "• ", "* ", "– "]) {
      if (c.startsWith(mk)) { c = c.slice(mk.length).trim(); break; }
    }
    if (c.startsWith("-")) c = c.replace(/^-+/, "").trim();
    if (c) out.push(c);
  }
  return out;
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch { return null; }
}

async function resolveImageBuffer(p: string): Promise<Buffer | null> {
  if (!p) return null;
  if (p.startsWith("http://") || p.startsWith("https://")) return fetchImageBuffer(p);
  if (p.startsWith("/")) {
    try {
      const lp = path.join(process.cwd(), "public", p);
      if (fs.existsSync(lp)) return fs.readFileSync(lp);
    } catch {}
  }
  try { if (fs.existsSync(p)) return fs.readFileSync(p); } catch {}
  return null;
}

async function generateQrDataUrl(url: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(url, { margin: 1, width: 200, color: { dark: "#333333", light: "#ffffff" }, errorCorrectionLevel: "M" });
  } catch { return null; }
}

export async function generateReportPdf(report: ReportData): Promise<string> {
  if (!fs.existsSync(BRAND.reportDir)) {
    fs.mkdirSync(BRAND.reportDir, { recursive: true });
  }
  const filename = `laporan-${report.id || Date.now()}.pdf`;
  const outPath = path.join(BRAND.reportDir, filename);
  const publicUrl = `${BRAND.reportUrlPrefix}/${filename}`;

  // Pre-fetch assets
  const logoBuffer = await resolveImageBuffer(BRAND.logoAbsPath);
  const qrDataUrl = report.pautanGform ? await generateQrDataUrl(report.pautanGform) : null;
  const photoBuffers: (Buffer | null)[] = [];
  for (const url of report.gambarUrls) photoBuffers.push(await resolveImageBuffer(url));

  // Format date
  let dateStr = "";
  try {
    dateStr = new Date(report.tarikhDijana).toLocaleString("ms-MY", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { dateStr = report.tarikhDijana || ""; }

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  let pageNum = 1;

  // ---- Header ----
  const drawHeader = () => {
    doc.setFillColor(...TQ);
    doc.rect(0, 0, PW, 60, "F");
    doc.setFillColor(...BLACK);
    doc.rect(0, 60, PW, 2, "F");
    // Logo
    if (logoBuffer) {
      doc.setFillColor(...WHITE);
      doc.rect(M, 8, 44, 44, "F");
      doc.setDrawColor(...BLACK);
      doc.setLineWidth(1);
      doc.rect(M, 8, 44, 44, "S");
      try {
        const logoB64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
        doc.addImage(logoB64, "PNG", M + 2, 10, 40, 40, undefined, "FAST");
      } catch {}
    }
    // Text
    const tx = M + 55;
    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text("LAPORAN KURSUS", tx, 20);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.setTextColor(221, 244, 245);
    doc.text("Unit Latihan & Pembangunan Guru & Staf", tx, 34);
    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    doc.text(`Dijana: ${dateStr}`, PW - M - 10, 20, { align: "right" });
  };

  // ---- Footer ----
  const drawFooter = () => {
    const fy = PH - 35;
    doc.setFillColor(...DARK);
    doc.rect(0, fy, PW, 35, "F");
    doc.setFillColor(...TQ);
    doc.rect(0, fy, PW, 2, "F");
    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
    doc.text("Sistem LMS Al Amin Edu Oasis  ·  Modul Penjanaan Laporan Kursus", M, fy + 15);
    doc.text(`Halaman ${pageNum}`, PW - M, fy + 15, { align: "right" });
  };

  const addPageWithHeader = () => {
    doc.addPage();
    pageNum++;
    drawHeader();
  };

  // Draw first page header
  drawHeader();

  // Content cursor
  let y = 75;

  // ---- Course title ----
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold"); doc.setFontSize(20);
  const titleLines = doc.splitTextToSize(report.namaKursus, PW - 2 * M);
  doc.text(titleLines, M, y);
  y += titleLines.length * 24 + 4;

  if (report.penyedia) {
    doc.setTextColor(...MID_GREY);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(`Disediakan oleh: ${report.penyedia}`, M, y);
    y += 14;
  }
  doc.setDrawColor(...BLACK); doc.setLineWidth(2);
  doc.line(M, y, PW - M, y);
  y += 14;

  // ---- Details table ----
  const colW = (PW - 2 * M) / 3;
  const detH = 42;
  doc.setFillColor(...LIGHT_TINT);
  doc.rect(M, y, PW - 2 * M, detH, "F");
  doc.setDrawColor(...BLACK); doc.setLineWidth(1.5);
  doc.rect(M, y, PW - 2 * M, detH, "S");
  for (let i = 1; i < 3; i++) {
    doc.line(M + colW * i, y, M + colW * i, y + detH);
  }
  doc.setFillColor(...TQ);
  doc.rect(M, y, 4, detH, "F");
  const details = [
    { label: "TARIKH", value: report.tarikh || "N/A" },
    { label: "MASA", value: report.masa || "N/A" },
    { label: "LOKASI", value: report.lokasi || "N/A" },
  ];
  for (let i = 0; i < 3; i++) {
    const cx = M + colW * i + 8;
    doc.setTextColor(...TQ);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    doc.text(details[i].label, cx, y + 12);
    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    const valLines = doc.splitTextToSize(details[i].value, colW - 16);
    doc.text(valLines.slice(0, 2), cx, y + 24);
  }
  y += detH + 14;

  // ---- Attendance stats ----
  const hadir = report.hadiran || 0;
  const jumlah = report.jumlah || 0;
  const pct = jumlah > 0 ? Math.round((hadir / jumlah) * 100) : 0;
  const statW = 100, statH = 60;
  // Big number box
  doc.setFillColor(...TQ);
  doc.rect(M, y, statW, statH, "F");
  doc.setDrawColor(...BLACK); doc.setLineWidth(1.5);
  doc.rect(M, y, statW, statH, "S");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold"); doc.setFontSize(26);
  doc.text(String(hadir), M + statW / 2, y + 25, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.setTextColor(221, 244, 245);
  doc.text(`dari ${jumlah || "?"} peserta`, M + statW / 2, y + 42, { align: "center" });
  // Right side
  const rx = M + statW + 12;
  const rw = PW - 2 * M - statW - 12;
  doc.setFillColor(...WHITE);
  doc.rect(rx - 6, y, rw + 6, statH, "F");
  doc.setDrawColor(...BLACK); doc.setLineWidth(1.5);
  doc.rect(rx - 6, y, rw + 6, statH, "S");
  doc.setTextColor(...TQ);
  doc.setFont("helvetica", "bold"); doc.setFontSize(8);
  doc.text("STATISTIK KEHADIRAN", rx, y + 10);
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text(`${report.kehadiran || "N/A"}  ·  ${pct}% kehadiran`, rx, y + 24);
  // Progress bar
  const barY = y + 32, barW = rw - 10, barH = 8;
  doc.setFillColor(...LIGHT_TINT);
  doc.rect(rx, barY, barW, barH, "F");
  doc.setDrawColor(...BLACK); doc.setLineWidth(1);
  doc.rect(rx, barY, barW, barH, "S");
  if (jumlah > 0 && pct > 0) {
    doc.setFillColor(...TQ);
    doc.rect(rx, barY, (barW * pct) / 100, barH, "F");
  }
  doc.setTextColor(...MID_GREY);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.text(`Kehadiran: ${hadir}   |   Jumlah: ${jumlah || "N/A"}   |   Peratusan: ${pct}%`, rx, y + 52);
  y += statH + 16;

  // ---- Section header helper ----
  const drawSection = (title: string): number => {
    const h = 22;
    doc.setFillColor(...TQ);
    doc.rect(M, y, PW - 2 * M, h, "F");
    doc.setDrawColor(...BLACK); doc.setLineWidth(2);
    doc.line(M, y + h, PW - M, y + h);
    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text(title, M + 8, y + 15);
    return y + h + 8;
  };

  // ---- Bullets helper ----
  const drawBullets = (bullets: string[], startY: number): number => {
    let by = startY;
    for (const b of bullets) {
      doc.setTextColor(...TQ);
      doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.text("•", M + 4, by);
      doc.setTextColor(...DARK);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      const lines = doc.splitTextToSize(b, PW - 2 * M - 20);
      doc.text(lines, M + 16, by);
      by += lines.length * 13 + 4;
    }
    return by;
  };

  // ---- Ringkasan ----
  if (report.ringkasanAi) {
    y = drawSection("RINGKASAN KURSUS");
    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    const lines = doc.splitTextToSize(report.ringkasanAi, PW - 2 * M);
    doc.text(lines, M, y, { maxWidth: PW - 2 * M });
    y += lines.length * 14 + 10;
  }

  // ---- Kelebihan ----
  const kelebihan = parseBullets(report.kelebihanAi);
  if (kelebihan.length > 0) {
    y = drawSection("KELEBIHAN KURSUS");
    y = drawBullets(kelebihan, y) + 8;
  }

  // ---- Kelemahan ----
  const kelemahan = parseBullets(report.kelemahanAi);
  if (kelemahan.length > 0) {
    y = drawSection("KELEMAHAN & CABARAN");
    y = drawBullets(kelemahan, y) + 8;
  }

  // ---- Cadangan ----
  const cadangan = parseBullets(report.cadanganAi);
  if (cadangan.length > 0) {
    y = drawSection("CADANGAN PENAMBAHBAIKAN");
    y = drawBullets(cadangan, y) + 8;
  }

  // ---- Maklum Balas (QR + link) ----
  if (report.pautanGform && qrDataUrl) {
    if (y > PH - 120) {
      drawFooter();
      addPageWithHeader();
      y = 75;
    }
    y = drawSection("BORANG MAKLUM BALAS");
    y += 6;
    const qrSize = 70;
    // QR box
    doc.setFillColor(...WHITE);
    doc.rect(M, y, qrSize + 8, qrSize + 8, "F");
    doc.setDrawColor(...BLACK); doc.setLineWidth(1.5);
    doc.rect(M, y, qrSize + 8, qrSize + 8, "S");
    try { doc.addImage(qrDataUrl, "PNG", M + 4, y + 4, qrSize, qrSize); } catch {}
    // Link text
    const lx = M + qrSize + 18;
    const lw = PW - 2 * M - qrSize - 18;
    doc.setFillColor(...LIGHT_TINT);
    doc.rect(lx - 6, y, lw + 6, qrSize + 8, "F");
    doc.setDrawColor(...BLACK); doc.setLineWidth(1.5);
    doc.rect(lx - 6, y, lw + 6, qrSize + 8, "S");
    doc.setTextColor(...TQ);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    doc.text("PINDA / IMBAS KOD QR", lx, y + 12);
    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    const descLines = doc.splitTextToSize("Sila imbas kod QR atau klik pautan di bawah untuk melengkapkan borang maklum balas kursus ini.", lw - 10);
    doc.text(descLines, lx, y + 24);
    doc.setTextColor(...TQ);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    const linkLines = doc.splitTextToSize(report.pautanGform, lw - 10);
    doc.textWithLink(report.pautanGform.slice(0, 50) + (report.pautanGform.length > 50 ? "..." : ""), lx, y + qrSize - 4, { url: report.pautanGform });
    y += qrSize + 20;
  }

  // ---- Galeri Gambar ----
  const validPhotos = photoBuffers.filter((b): b is Buffer => b !== null);
  if (validPhotos.length > 0) {
    if (y > PH - 180) {
      drawFooter();
      addPageWithHeader();
      y = 75;
    }
    y = drawSection("GALERI GAMBAR AKTIVITI");
    y += 8;
    const cols = validPhotos.length >= 3 ? 3 : validPhotos.length;
    const cellW = (PW - 2 * M) / cols;
    const cellH = cellW * 0.62;
    for (let i = 0; i < validPhotos.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = M + col * cellW;
      const cy = y + row * cellH;
      if (cy + cellH > PH - 45) {
        drawFooter();
        addPageWithHeader();
        y = 75;
        y = drawSection("GALERI GAMBAR AKTIVITI (sambungan)") + 8;
      }
      const ny = y + row * cellH;
      doc.setFillColor(...LIGHT_TINT);
      doc.rect(cx, ny, cellW, cellH, "F");
      doc.setDrawColor(...BLACK); doc.setLineWidth(1.5);
      doc.rect(cx, ny, cellW, cellH, "S");
      try {
        const imgB64 = `data:image/png;base64,${validPhotos[i].toString("base64")}`;
        doc.addImage(imgB64, "PNG", cx + 4, ny + 3, cellW - 8, cellH - 6, undefined, "FAST");
      } catch {}
    }
    const rows = Math.ceil(validPhotos.length / cols);
    y += rows * cellH + 10;
    doc.setTextColor(...MID_GREY);
    doc.setFont("helvetica", "italic"); doc.setFontSize(7);
    doc.text(`Jumlah gambar: ${validPhotos.length}`, PW / 2, y, { align: "center" });
  }

  // Footer on last page
  drawFooter();

  // Save
  const buf = doc.output("arraybuffer");
  fs.writeFileSync(outPath, Buffer.from(buf));

  if (!fs.existsSync(outPath)) throw new Error("PDF tidak dijana.");
  return publicUrl;
}
