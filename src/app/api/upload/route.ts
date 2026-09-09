import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabase, UPLOADS_BUCKET } from "@/lib/supabase";

// Image upload endpoint for course activity photos.
// Stores images in Supabase Storage (cloud) so it works on read-only filesystems
// (Vercel, serverless, Docker without persistent volumes).
// Returns public URLs that can be used in the UI and embedded in PDFs.

const ALLOWED = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
const MAX_BYTES = 8 * 1024 * 1024; // 8MB per file

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files");

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Tiada fail gambar diterima." }, { status: 400 });
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
      const storagePath = filename; // flat structure in the bucket

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(UPLOADS_BUCKET)
        .upload(storagePath, buffer, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("[UPLOAD ERROR]", uploadError);
        if (uploadError.message?.includes("not found") || uploadError.message?.includes("Bucket")) {
          return NextResponse.json(
            {
              error:
                "Bucket storan 'uploads' belum wujud di Supabase. Sila cipta bucket awam bernama 'uploads' di Supabase Dashboard → Storage.",
            },
            { status: 500 }
          );
        }
        return NextResponse.json(
          { error: `Gagal memuat naik gambar: ${uploadError.message}` },
          { status: 500 }
        );
      }

      // Get the public URL for the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from(UPLOADS_BUCKET)
        .getPublicUrl(storagePath);

      const publicUrl = publicUrlData.publicUrl;
      urls.push(publicUrl);
    }

    return NextResponse.json({ success: true, urls });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Ralat tidak diketahui";
    console.error("[UPLOAD ERROR]", message);
    return NextResponse.json({ error: `Gagal memuat naik gambar: ${message}` }, { status: 500 });
  }
}
