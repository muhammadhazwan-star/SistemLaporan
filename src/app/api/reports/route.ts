import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/reports — list all reports, sorted by latest date generated.
// Optional query: ?q=search&year=2026&month=9&status=Selesai
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim().toLowerCase() || "";
    const year = searchParams.get("year") || "";
    const month = searchParams.get("month") || "";
    const status = searchParams.get("status") || "";

    const reports = await db.report.findMany({
      orderBy: { tarikhDijana: "desc" },
    });

    const filtered = reports.filter((r) => {
      if (q && !r.namaKursus.toLowerCase().includes(q) && !r.lokasi.toLowerCase().includes(q)) {
        return false;
      }
      if (year && !r.tarikhDijana.getFullYear().toString().includes(year) && !r.tarikh.includes(year)) {
        // Allow filtering by either the generation year or the course date text
        if (!r.tarikh.includes(year)) return false;
      }
      if (month) {
        const m = parseInt(month, 10);
        const genMonth = r.tarikhDijana.getMonth() + 1;
        if (genMonth !== m && !r.tarikh.toLowerCase().includes(monthName(m))) return false;
      }
      if (status && r.status !== status) return false;
      return true;
    });

    return NextResponse.json({
      success: true,
      count: filtered.length,
      reports: filtered.map(serialize),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Ralat tidak diketahui";
    console.error("[LIST REPORTS ERROR]", message);
    return NextResponse.json({ error: `Gagal memuatkan senarai laporan: ${message}` }, { status: 500 });
  }
}

// POST /api/reports — save a finalised report + generate its PDF, persisting to DB.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      namaKursus,
      tarikh,
      masa,
      lokasi,
      kehadiran,
      hadiran,
      jumlah,
      ringkasanAi,
      kelebihanAi,
      kelemahanAi,
      cadanganAi,
      pautanGform,
      gambarUrls,
      penyedia,
      rawInput,
      status = "Selesai",
    } = body;

    if (!namaKursus || !namaKursus.trim()) {
      return NextResponse.json({ error: "Nama kursus diperlukan." }, { status: 400 });
    }

    const report = await db.report.create({
      data: {
        namaKursus: String(namaKursus).slice(0, 200),
        tarikh: String(tarikh || "N/A"),
        masa: String(masa || "N/A"),
        lokasi: String(lokasi || "N/A"),
        kehadiran: String(kehadiran || "N/A"),
        hadiran: Number(hadiran) || 0,
        jumlah: Number(jumlah) || 0,
        ringkasanAi: String(ringkasanAi || ""),
        kelebihanAi: String(kelebihanAi || ""),
        kelemahanAi: String(kelemahanAi || ""),
        cadanganAi: String(cadanganAi || ""),
        pautanGform: String(pautanGform || ""),
        gambarUrls: JSON.stringify(gambarUrls || []),
        penyedia: String(penyedia || ""),
        rawInput: String(rawInput || ""),
        status: status === "Draf" ? "Draf" : "Selesai",
      },
    });

    // Generate the PDF (lazy import to keep startup fast)
    const { generateReportPdf } = await import("@/lib/pdf-generator");
    const pdfUrl = await generateReportPdf(serialize(report));

    const updated = await db.report.update({
      where: { id: report.id },
      data: { urlPdf: pdfUrl },
    });

    return NextResponse.json({ success: true, report: serialize(updated) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Ralat tidak diketahui";
    console.error("[CREATE REPORT ERROR]", message);
    return NextResponse.json({ error: `Gagal menyimpan laporan: ${message}` }, { status: 500 });
  }
}

// Serialize a DB row into a JSON-friendly report object (decode gambarUrls)
function serialize(r: {
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
  gambarUrls: string;
  urlPdf: string;
  status: string;
  penyedia: string;
  rawInput: string;
  tarikhDijana: Date;
  updatedAt: Date;
}) {
  let photos: string[] = [];
  try {
    photos = JSON.parse(r.gambarUrls || "[]");
  } catch {
    photos = [];
  }
  return {
    id: r.id,
    namaKursus: r.namaKursus,
    tarikh: r.tarikh,
    masa: r.masa,
    lokasi: r.lokasi,
    kehadiran: r.kehadiran,
    hadiran: r.hadiran,
    jumlah: r.jumlah,
    ringkasanAi: r.ringkasanAi,
    kelebihanAi: r.kelebihanAi,
    kelemahanAi: r.kelemahanAi,
    cadanganAi: r.cadanganAi,
    pautanGform: r.pautanGform,
    gambarUrls: photos,
    urlPdf: r.urlPdf,
    status: r.status,
    penyedia: r.penyedia,
    rawInput: r.rawInput,
    tarikhDijana: r.tarikhDijana.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function monthName(m: number): string {
  const names = [
    "januari", "februari", "mac", "april", "mei", "jun",
    "julai", "ogos", "september", "oktober", "november", "disember",
  ];
  return names[m - 1] || "";
}
