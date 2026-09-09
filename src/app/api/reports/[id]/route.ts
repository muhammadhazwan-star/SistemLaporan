import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/reports/[id] — fetch a single report
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const report = await db.report.findUnique({ where: { id } });
    if (!report) {
      return NextResponse.json({ error: "Laporan tidak dijumpai." }, { status: 404 });
    }
    return NextResponse.json({ success: true, report: serialize(report) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Ralat tidak diketahui";
    console.error("[GET REPORT ERROR]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/reports/[id] — delete a report and its PDF file
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const report = await db.report.findUnique({ where: { id } });
    if (!report) {
      return NextResponse.json({ error: "Laporan tidak dijumpai." }, { status: 404 });
    }

    // Remove the generated PDF from local disk (if present — works on writable FS)
    if (report.urlPdf) {
      const filename = report.urlPdf.split("/").pop();
      if (filename) {
        try {
          const fs = await import("fs");
          const path = await import("path");
          const pdfPath = path.join(process.cwd(), "public", "reports", filename);
          if (fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath);
          }
        } catch {
          // Ignore filesystem errors (e.g., read-only FS on serverless) — PDF is tracked by URL in DB
        }
      }
    }

    // Remove uploaded images from Supabase Storage
    let photos: string[] = [];
    try {
      photos = JSON.parse(report.gambarUrls || "[]");
    } catch {
      photos = [];
    }
    if (photos.length > 0) {
      const { supabase, UPLOADS_BUCKET } = await import("@/lib/supabase");
      const remotePaths = photos
        .filter((p) => p.includes(`${UPLOADS_BUCKET}/`))
        .map((p) => p.split(`${UPLOADS_BUCKET}/`)[1]?.split("?")[0])
        .filter(Boolean) as string[];
      if (remotePaths.length > 0) {
        try {
          await supabase.storage.from(UPLOADS_BUCKET).remove(remotePaths);
        } catch {
          // Best-effort cleanup; don't fail the delete if storage cleanup errors
        }
      }
    }

    await db.report.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Ralat tidak diketahui";
    console.error("[DELETE REPORT ERROR]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/reports/[id] — update an existing report (used after editing preview, or to regenerate PDF)
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const existing = await db.report.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Laporan tidak dijumpai." }, { status: 404 });
    }

    const updated = await db.report.update({
      where: { id },
      data: {
        namaKursus: body.namaKursus !== undefined ? String(body.namaKursus).slice(0, 200) : undefined,
        tarikh: body.tarikh !== undefined ? String(body.tarikh) : undefined,
        masa: body.masa !== undefined ? String(body.masa) : undefined,
        lokasi: body.lokasi !== undefined ? String(body.lokasi) : undefined,
        kehadiran: body.kehadiran !== undefined ? String(body.kehadiran) : undefined,
        hadiran: body.hadiran !== undefined ? Number(body.hadiran) || 0 : undefined,
        jumlah: body.jumlah !== undefined ? Number(body.jumlah) || 0 : undefined,
        ringkasanAi: body.ringkasanAi !== undefined ? String(body.ringkasanAi) : undefined,
        kelebihanAi: body.kelebihanAi !== undefined ? String(body.kelebihanAi) : undefined,
        kelemahanAi: body.kelemahanAi !== undefined ? String(body.kelemahanAi) : undefined,
        cadanganAi: body.cadanganAi !== undefined ? String(body.cadanganAi) : undefined,
        pautanGform: body.pautanGform !== undefined ? String(body.pautanGform) : undefined,
        gambarUrls: body.gambarUrls !== undefined ? JSON.stringify(body.gambarUrls || []) : undefined,
        penyedia: body.penyedia !== undefined ? String(body.penyedia) : undefined,
        rawInput: body.rawInput !== undefined ? String(body.rawInput) : undefined,
        status: body.status !== undefined ? (body.status === "Draf" ? "Draf" : "Selesai") : undefined,
      },
    });

    // Regenerate the PDF whenever content changes
    const { generateReportPdf } = await import("@/lib/pdf-generator");
    const pdfUrl = await generateReportPdf(serialize(updated));
    const finalReport = await db.report.update({
      where: { id },
      data: { urlPdf: pdfUrl },
    });

    return NextResponse.json({ success: true, report: serialize(finalReport) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Ralat tidak diketahui";
    console.error("[UPDATE REPORT ERROR]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
