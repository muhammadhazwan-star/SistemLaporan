import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { BRAND } from "@/lib/brand";

// Image upload endpoint for course activity photos.
// Accepts multipart/form-data with one or more "files" fields,
// stores them under public/uploads, and returns their public URLs.

const ALLOWED = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
const MAX_BYTES = 8 * 1024 * 1024; // 8MB per file

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files");

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Tiada fail gambar diterima." }, { status: 400 });
    }

    if (!fs.existsSync(BRAND.uploadDir)) {
      fs.mkdirSync(BRAND.uploadDir, { recursive: true });
    }

    const urls: string[] = [];

    for (const file of files) {
      if (!(file instanceof File)) continue;
      if (!ALLOWED.includes(file.type)) {
        return NextResponse.json(
          { error: `Jenis fail tidak disokong: ${file.name} (${file.type})` },
          { status: 415 }
        );
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          { error: `Saiz fail melebihi 8MB: ${file.name}` },
          { status: 413 }
        );
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const id = crypto.randomBytes(8).toString("hex");
      const filename = `img-${Date.now()}-${id}.${ext}`;
      const filepath = path.join(BRAND.uploadDir, filename);

      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(filepath, buffer);

      urls.push(`${BRAND.uploadUrlPrefix}/${filename}`);
    }

    return NextResponse.json({ success: true, urls });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Ralat tidak diketahui";
    console.error("[UPLOAD ERROR]", message);
    return NextResponse.json({ error: `Gagal memuat naik gambar: ${message}` }, { status: 500 });
  }
}
