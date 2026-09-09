import { NextRequest, NextResponse } from "next/server";
import { parseReport } from "@/lib/smart-parse";

// ============================================================
// Auto-detect report info from raw pasted text using keyword
// matching — NO AI / NO external API calls required.
//
// The parser recognises common labels (Nama Kursus, Tajuk, Tarikh,
// Hari, Masa, Waktu, Lokasi, Tempat, Kehadiran, Peserta, Kebaikan,
// Kelebihan, Kekurangan, Kelemahan, pautan Google Form, dll.) in
// Bahasa Melayu and English, normalises the values, and auto-
// generates a structured report (ringkasan, kelebihan, kelemahan,
// cadangan) in professional Bahasa Melayu.
//
// This works on any deployment platform with zero external
// dependencies.
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rawInput } = body as { rawInput?: string };

    if (!rawInput || rawInput.trim().length < 10) {
      return NextResponse.json(
        { error: "Sila tampal maklumat kursus (minimum 10 aksara) sebelum menjana laporan." },
        { status: 400 }
      );
    }

    const report = parseReport(rawInput);

    return NextResponse.json({ success: true, report });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Ralat tidak diketahui";
    console.error("[GENERATE ERROR]", message);
    return NextResponse.json(
      { error: `Gagal menjana laporan: ${message}` },
      { status: 500 }
    );
  }
}
