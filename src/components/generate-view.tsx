"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import {
  Sparkles, Upload, Loader2, FileText, Check, X, ImageIcon,
  Wand2, RotateCcw, Download, AlertCircle, ClipboardPaste, Calendar, Clock, MapPin, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BRAND } from "@/lib/brand";
import { Report } from "@/lib/types";
import { detectFields, hasDetectedInfo } from "@/lib/smart-parse";

interface GeneratedReport {
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
}

const SAMPLE_INPUT = `Nama Kursus: Kursus AI dalam Pendidikan
Tarikh: 8 September 2026
Masa: 8:30 pagi - 5:00 petang
Lokasi: Bilik Latihan Utama, Al Amin Edu Oasis
Kehadiran: 16/16 peserta

Kelebihan:
- Kandungan kursus sangat relevan dengan keperluan semasa pendidikan
- Penceramah berpengalaman dan interaktif
- Bahan rujukan lengkap dan berkualiti
- Sesi amali membolehkan peserta mencuba terus alat AI

Kelemahan:
- Masa praktikal agak terhad untuk topik yang luas
- Capaian internet sedikit terganggu pada sesi petang

Pautan borang maklum balas: https://forms.gle/abcd1234example`;

type Stage = "input" | "generating" | "preview";

export function GenerateView({ onSaved }: { onSaved: () => void }) {
  const [stage, setStage] = useState<Stage>("input");
  const [rawInput, setRawInput] = useState("");
  const [penyedia, setPenyedia] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ---- Image upload ----
  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fd = new FormData();
    for (const f of Array.from(files)) fd.append("files", f);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat naik gambar");
      setImages((prev) => [...prev, ...data.urls]);
      toast.success(`${data.urls.length} gambar berjaya dimuat naik`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ralat muat naik gambar");
    }
  }, []);

  // ---- Auto-generate report from keyword detection ----
  const handleGenerate = useCallback(async () => {
    if (rawInput.trim().length < 10) {
      toast.error("Sila tampal maklumat kursus (minimum 10 aksara) sebelum menjana laporan.");
      return;
    }
    setStage("generating");
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawInput, penyedia }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menjana laporan");
      setReport(data.report);
      setStage("preview");
      toast.success("Laporan berjaya dijana. Sila semak dan sunting jika perlu.");
    } catch (err) {
      setStage("input");
      toast.error(err instanceof Error ? err.message : "Ralat penjanaan laporan");
    }
  }, [rawInput, penyedia]);

  // ---- Manual mode (skip AI, go straight to editable blank report) ----
  const handleManual = useCallback(() => {
    const lines = rawInput.split("\n").filter((l) => l.trim());
    const namaKursus = lines.find((l) => /kursus/i.test(l))?.replace(/^.*:\s*/, "") || "Kursus Latihan";
    const tarikh = lines.find((l) => /tarikh/i.test(l))?.replace(/^.*:\s*/, "") || "";
    const masa = lines.find((l) => /masa/i.test(l))?.replace(/^.*:\s*/, "") || "";
    const lokasi = lines.find((l) => /lokasi/i.test(l))?.replace(/^.*:\s*/, "") || "";
    const kehadiran = lines.find((l) => /hadiran/i.test(l))?.replace(/^.*:\s*/, "") || "";
    const pautanGform = lines.find((l) => /gform|form/i.test(l))?.replace(/^.*:\s*/, "") || "";
    setReport({
      namaKursus,
      tarikh: tarikh || "N/A",
      masa: masa || "N/A",
      lokasi: lokasi || "N/A",
      kehadiran: kehadiran || "N/A",
      hadiran: 0,
      jumlah: 0,
      ringkasanAi: "",
      kelebihanAi: "",
      kelemahanAi: "",
      cadanganAi: "",
      pautanGform,
    });
    setStage("preview");
    toast.info("Mod Manual diaktifkan", {
      description: "Isi kandungan laporan secara manual di bawah.",
    });
  }, [rawInput]);

  // ---- Save + PDF ----
  const handleConfirm = useCallback(async () => {
    if (!report) return;
    setSaving(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...report,
          gambarUrls: images,
          penyedia,
          rawInput,
          status: "Selesai",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan laporan");
      toast.success("Laporan disimpan & PDF dijana!", {
        description: "Anda boleh memuat turun PDF dari Senarai Laporan.",
      });
      // reset
      setReport(null);
      setRawInput("");
      setPenyedia("");
      setImages([]);
      setStage("input");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ralat menyimpan laporan");
    } finally {
      setSaving(false);
    }
  }, [report, images, penyedia, rawInput, onSaved]);

  const handleReset = useCallback(() => {
    setReport(null);
    setStage("input");
  }, []);

  // ---- Paste from clipboard ----
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRawInput((prev) => (prev ? prev + "\n\n" + text : text));
        toast.success("Teks dari papan keratan ditampal");
      } else {
        toast.info("Papan keratan kosong");
      }
    } catch {
      toast.error("Tidak boleh akses papan keratan. Sila tampal secara manual (Ctrl+V).");
    }
  }, []);

  return (
    <div className="brutal-fade-up space-y-6">
      {/* Page heading */}
      <div className="brutal-card bg-primary p-5 text-primary-foreground sm:p-6">
        <div className="flex items-center gap-3">
          <div className="border-2 border-primary-foreground bg-background p-2">
            <Wand2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="font-mono text-xl font-extrabold uppercase tracking-tight sm:text-2xl">
              Jana Laporan Kursus
            </h2>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary-foreground/80">
              Tampal maklumat mentah · AI jana laporan profesional · Muat turun PDF
            </p>
          </div>
        </div>
      </div>

      {/* Stage: INPUT */}
      {stage === "input" && (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Left: input + penyedia */}
          <section className="brutal-card flex flex-col gap-4 bg-card p-5 lg:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="brutal-label">01 · Maklumat Kursus (Tampal)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePaste}
                className="brutal-btn brutal-btn-ghost h-8 px-2 text-xs"
              >
                <ClipboardPaste className="mr-1 h-3.5 w-3.5" /> Tampal
              </Button>
            </div>
            <Textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="Tampal maklumat kursus di sini dalam format bebas: nama kursus, tarikh, masa, lokasi, kehadiran, kelebihan, kelemahan, pautan Google Form..."
              className="brutal-input min-h-[280px] resize-y font-mono text-sm leading-relaxed"
              aria-label="Maklumat kursus mentah"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={() => setRawInput(SAMPLE_INPUT)}
                className="font-mono text-[11px] uppercase tracking-wide text-primary underline underline-offset-2 hover:text-primary/80"
              >
                Guna contoh input
              </button>
              <span className="font-mono text-[11px] text-foreground/60">
                {rawInput.length} aksara
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="penyedia" className="brutal-label">Nama Penyedia (pilihan)</Label>
                <Input
                  id="penyedia"
                  value={penyedia}
                  onChange={(e) => setPenyedia(e.target.value)}
                  placeholder="Cth: Ustaz Ahmad Faizal"
                  className="brutal-input mt-1"
                />
              </div>
            </div>
          </section>

          {/* Right: image upload */}
          <section className="brutal-card flex flex-col gap-4 bg-card p-5">
            <Label className="brutal-label">02 · Gambar Aktiviti</Label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-foreground bg-secondary p-6 transition-colors hover:bg-accent/10"
            >
              <div className="border-2 border-foreground bg-background p-2 brutal-shadow-sm">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <span className="font-mono text-xs font-bold uppercase tracking-wide">
                Klik untuk Muat Naik
              </span>
              <span className="font-mono text-[10px] text-foreground/50">
                PNG / JPG / WEBP · maks 8MB setiap fail
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            {images.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {images.map((url, i) => (
                  <div key={url} className="group relative border-2 border-foreground bg-background">
                    <img src={url} alt={`Gambar ${i + 1}`} className="aspect-square w-full object-cover" />
                    <button
                      onClick={() => setImages((p) => p.filter((_, idx) => idx !== i))}
                      className="absolute right-1 top-1 border-2 border-foreground bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Buang gambar"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="font-mono text-[10px] text-foreground/50">
              {images.length} gambar dimuat naik
            </p>
          </section>

          {/* Real-time detected info preview */}
          <RealtimePreview rawInput={rawInput} />

          {/* Generate button */}
          <div className="lg:col-span-3 flex flex-col gap-2">
            <button
              onClick={handleGenerate}
              disabled={rawInput.trim().length < 10}
              className="brutal-btn brutal-btn-primary flex w-full items-center justify-center gap-2 bg-primary px-4 py-4 text-base disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Wand2 className="h-5 w-5" />
              Jana Laporan
            </button>
            <button
              onClick={handleManual}
              className="brutal-btn brutal-btn-outline flex w-full items-center justify-center gap-2 px-4 py-3 text-sm"
            >
              <FileText className="h-4 w-4" />
              Mod Manual
            </button>
            <p className="text-center font-mono text-[10px] text-foreground/50">
              Sistem auto-kesan maklumat berdasarkan kata kunci. Mod Manual untuk isi kosong sendiri.
            </p>
          </div>
        </div>
      )}

      {/* Stage: GENERATING */}
      {stage === "generating" && (
        <div className="brutal-card flex flex-col items-center gap-4 bg-card p-10 text-center">
          <div className="h-2 w-64 overflow-hidden border-2 border-foreground">
            <div className="brutal-stripes h-full w-full" />
          </div>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div>
            <p className="font-mono text-sm font-bold uppercase tracking-wide">
              Menjana laporan...
            </p>
            <p className="font-mono text-[11px] text-foreground/60">
              Sistem mengesan maklumat kursus berdasarkan kata kunci.
            </p>
          </div>
        </div>
      )}

      {/* Stage: PREVIEW */}
      {stage === "preview" && report && (
        <PreviewEditor
          report={report}
          onChange={setReport}
          images={images}
          onBack={handleReset}
          onConfirm={handleConfirm}
          saving={saving}
        />
      )}
    </div>
  );
}

// ===== Editable preview =====
function PreviewEditor({
  report,
  onChange,
  images,
  onBack,
  onConfirm,
  saving,
}: {
  report: GeneratedReport;
  onChange: (r: GeneratedReport) => void;
  images: string[];
  onBack: () => void;
  onConfirm: () => void;
  saving: boolean;
}) {
  const pct = report.jumlah > 0 ? Math.round((report.hadiran / report.jumlah) * 100) : 0;
  const update = (patch: Partial<GeneratedReport>) => onChange({ ...report, ...patch });

  return (
    <div className="brutal-fade-up space-y-5">
      {/* Toolbar */}
      <div className="brutal-card flex flex-wrap items-center justify-between gap-3 bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="border-2 border-foreground bg-primary p-2">
            <FileText className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-mono text-sm font-extrabold uppercase tracking-wide">
              Pratonton &amp; Sunting
            </p>
            <p className="font-mono text-[11px] text-foreground/60">
              Anda boleh menyunting mana-mana medan sebelum menjana PDF
            </p>
          </div>
        </div>
        <Badge className="brutal-btn border-2 border-foreground bg-accent px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
          Dijana AI
        </Badge>
      </div>

      {/* Course title */}
      <section className="brutal-card bg-card p-5">
        <Label className="brutal-label">Tajuk Kursus</Label>
        <Input
          value={report.namaKursus}
          onChange={(e) => update({ namaKursus: e.target.value })}
          className="brutal-input mt-1 font-bold"
        />
        {/* details */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <DetailField icon={<Calendar className="h-4 w-4" />} label="Tarikh"
            value={report.tarikh} onChange={(v) => update({ tarikh: v })} />
          <DetailField icon={<Clock className="h-4 w-4" />} label="Masa"
            value={report.masa} onChange={(v) => update({ masa: v })} />
          <DetailField icon={<MapPin className="h-4 w-4" />} label="Lokasi"
            value={report.lokasi} onChange={(v) => update({ lokasi: v })} />
        </div>
        {/* attendance */}
        <div className="mt-4 border-2 border-foreground bg-secondary p-3">
          <Label className="brutal-label">Kehadiran</Label>
          <div className="mt-2 flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <Input
                value={report.kehadiran}
                onChange={(e) => update({ kehadiran: e.target.value })}
                className="brutal-input w-24"
                placeholder="16/16"
              />
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span>Hadir:</span>
              <Input
                type="number"
                value={report.hadiran}
                onChange={(e) => update({ hadiran: Number(e.target.value) || 0 })}
                className="brutal-input w-20"
              />
              <span>/</span>
              <span className="text-foreground/60">Jumlah:</span>
              <Input
                type="number"
                value={report.jumlah}
                onChange={(e) => update({ jumlah: Number(e.target.value) || 0 })}
                className="brutal-input w-20"
              />
            </div>
            {report.jumlah > 0 && (
              <div className="flex items-center gap-2">
                <div className="h-3 w-32 border-2 border-foreground bg-background">
                  <div className="brutal-stripes h-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="font-mono text-xs font-bold">{pct}%</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Ringkasan */}
      <SectionBox title="Ringkasan Kursus" tone="primary">
        {!report.ringkasanAi && (
          <p className="mb-2 border-2 border-accent bg-secondary p-2 font-mono text-[11px] text-foreground/70">
            ✏️ Mod Manual: AI tidak tersedia. Sila isi ringkasan kursus secara manual di bawah.
          </p>
        )}
        <Textarea
          value={report.ringkasanAi}
          onChange={(e) => update({ ringkasanAi: e.target.value })}
          className="brutal-input min-h-[90px] resize-y text-sm leading-relaxed"
          placeholder="Tulis ringkasan eksekutif kursus di sini..."
        />
      </SectionBox>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionBox title="Kelebihan" tone="good">
          <Textarea
            value={report.kelebihanAi}
            onChange={(e) => update({ kelebihanAi: e.target.value })}
            className="brutal-input min-h-[150px] resize-y font-mono text-sm leading-relaxed"
          />
          <p className="mt-1 font-mono text-[10px] text-foreground/50">Gunakan "- " untuk setiap titik bullet.</p>
        </SectionBox>
        <SectionBox title="Kelemahan & Cabaran" tone="bad">
          <Textarea
            value={report.kelemahanAi}
            onChange={(e) => update({ kelemahanAi: e.target.value })}
            className="brutal-input min-h-[150px] resize-y font-mono text-sm leading-relaxed"
          />
        </SectionBox>
      </div>

      <SectionBox title="Cadangan Penambahbaikan" tone="primary">
        <Textarea
          value={report.cadanganAi}
          onChange={(e) => update({ cadanganAi: e.target.value })}
          className="brutal-input min-h-[110px] resize-y font-mono text-sm leading-relaxed"
        />
      </SectionBox>

      {/* Gform link */}
      <section className="brutal-card bg-card p-5">
        <Label className="brutal-label">Pautan Borang Maklum Balas (Google Form)</Label>
        <Input
          value={report.pautanGform}
          onChange={(e) => update({ pautanGform: e.target.value })}
          className="brutal-input mt-1 font-mono text-sm"
          placeholder="https://forms.gle/..."
        />
        {report.pautanGform && (
          <p className="mt-2 font-mono text-[11px] text-foreground/60">
            Pautan ini akan dipaparkan sebagai QR code dalam PDF.
          </p>
        )}
      </section>

      {/* Images summary */}
      {images.length > 0 && (
        <section className="brutal-card bg-card p-5">
          <Label className="brutal-label">Gambar Aktiviti ({images.length})</Label>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {images.map((url, i) => (
              <div key={url} className="border-2 border-foreground bg-background">
                <img src={url} alt={`Gambar ${i + 1}`} className="aspect-video w-full object-cover" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Actions */}
      <div className="brutal-card flex flex-col gap-3 bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={onBack}
          className="brutal-btn brutal-btn-outline flex items-center justify-center gap-2 px-4 py-3 text-sm"
        >
          <RotateCcw className="h-4 w-4" /> Jana Semula
        </button>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex items-center gap-2 font-mono text-[11px] text-foreground/60">
            <AlertCircle className="h-3.5 w-3.5" />
            Sahkan untuk menjana &amp; menyimpan PDF ke pangkalan data.
          </div>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="brutal-btn brutal-btn-primary flex items-center justify-center gap-2 bg-primary px-6 py-3 text-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? "Menjana PDF..." : "Sahkan & Jana PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailField({
  icon, label, value, onChange,
}: { icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="border-2 border-foreground bg-secondary p-2">
      <div className="flex items-center gap-1.5 text-primary">
        {icon}
        <span className="font-mono text-[10px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 border-0 bg-transparent px-0 py-0 text-sm font-medium focus-visible:ring-0"
      />
    </div>
  );
}

function SectionBox({
  title, tone, children,
}: { title: string; tone: "primary" | "good" | "bad"; children: React.ReactNode }) {
  const toneClass =
    tone === "good" ? "bg-accent text-accent-foreground" :
    tone === "bad" ? "bg-destructive text-destructive-foreground" :
    "bg-primary text-primary-foreground";
  return (
    <section className="brutal-card flex flex-col bg-card p-0">
      <div className={`flex items-center gap-2 border-b-2 border-foreground px-4 py-2 ${toneClass}`}>
        {tone === "good" ? <Check className="h-4 w-4" /> : tone === "bad" ? <AlertCircle className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        <h3 className="font-mono text-xs font-extrabold uppercase tracking-wide">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

// ===== Real-time field detection preview =====
function RealtimePreview({ rawInput }: { rawInput: string }) {
  const detected = useMemo(() => detectFields(rawInput), [rawInput]);
  const hasInfo = hasDetectedInfo(detected);

  if (!hasInfo && rawInput.trim().length > 0) {
    return (
      <section className="brutal-card bg-secondary p-4 lg:col-span-3">
        <div className="flex items-center gap-2">
          <div className="border-2 border-foreground bg-background p-1">
            <Sparkles className="h-3 w-3 text-foreground/40" />
          </div>
          <p className="font-mono text-[11px] uppercase tracking-wide text-foreground/60">
            AI akan mula mengesan maklumat kursus apabila anda menaip...
          </p>
        </div>
      </section>
    );
  }

  if (!hasInfo) return null;

  const fields: { label: string; value: string; icon: React.ReactNode; ok: boolean }[] = [
    { label: "Nama Kursus", value: detected.namaKursus, icon: <FileText className="h-3 w-3" />, ok: !!detected.namaKursus },
    { label: "Tarikh", value: detected.tarikh, icon: <Calendar className="h-3 w-3" />, ok: !!detected.tarikh },
    { label: "Masa", value: detected.masa, icon: <Clock className="h-3 w-3" />, ok: !!detected.masa },
    { label: "Lokasi", value: detected.lokasi, icon: <MapPin className="h-3 w-3" />, ok: !!detected.lokasi },
    { label: "Kehadiran", value: detected.kehadiran || (detected.hadiran ? `${detected.hadiran}/${detected.jumlah}` : ""), icon: <Users className="h-3 w-3" />, ok: detected.hadiran > 0 },
    { label: "Google Form", value: detected.pautanGform, icon: <Check className="h-3 w-3" />, ok: !!detected.pautanGform },
  ];

  const okCount = fields.filter((f) => f.ok).length;

  return (
    <section className="brutal-card bg-card p-4 lg:col-span-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="border-2 border-foreground bg-primary p-1">
            <Sparkles className="h-3 w-3 text-primary-foreground" />
          </div>
          <h3 className="font-mono text-xs font-extrabold uppercase tracking-wide">
            Maklumat Dikesan ({okCount}/{fields.length})
          </h3>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wide text-primary">
          ✓ Pra-papar sebelum AI jana
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {fields.map((f) => (
          <div
            key={f.label}
            className={`border-2 p-2 ${f.ok ? "border-foreground bg-secondary" : "border-dashed border-foreground/30 bg-background opacity-60"}`}
          >
            <div className={`flex items-center gap-1 ${f.ok ? "text-primary" : "text-foreground/40"}`}>
              {f.icon}
              <span className="font-mono text-[9px] font-bold uppercase tracking-wide">{f.label}</span>
            </div>
            <p className={`mt-0.5 truncate text-xs ${f.ok ? "font-medium" : "italic text-foreground/40"}`}>
              {f.ok ? f.value || "✓" : "— belum dijumpai —"}
            </p>
          </div>
        ))}
      </div>
      {(detected.kelebihan || detected.kelemahan) && (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {detected.kelebihan && (
            <div className="border-2 border-foreground bg-secondary p-2">
              <span className="font-mono text-[9px] font-bold uppercase tracking-wide text-primary">✓ Kelebihan dikesan</span>
              <p className="mt-0.5 text-[11px] text-foreground/70 line-clamp-2">{detected.kelebihan}</p>
            </div>
          )}
          {detected.kelemahan && (
            <div className="border-2 border-foreground bg-secondary p-2">
              <span className="font-mono text-[9px] font-bold uppercase tracking-wide text-destructive">! Kelemahan dikesan</span>
              <p className="mt-0.5 text-[11px] text-foreground/70 line-clamp-2">{detected.kelemahan}</p>
            </div>
          )}
        </div>
      )}
      <p className="mt-3 font-mono text-[10px] text-foreground/50">
        💡 Klik "Jana Laporan dengan AI" untuk mengembangkan maklumat ini menjadi laporan profesional lengkap.
      </p>
    </section>
  );
}
