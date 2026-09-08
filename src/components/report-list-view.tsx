"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search, Download, Trash2, RefreshCw, FileText, Calendar, Users,
  MapPin, Loader2, Inbox, Filter, X, Eye, Sparkles, ShieldCheck, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Report } from "@/lib/types";

const MONTHS = [
  { v: "all", label: "Semua Bulan" },
  { v: "1", label: "Januari" }, { v: "2", label: "Februari" }, { v: "3", label: "Mac" },
  { v: "4", label: "April" }, { v: "5", label: "Mei" }, { v: "6", label: "Jun" },
  { v: "7", label: "Julai" }, { v: "8", label: "Ogos" }, { v: "9", label: "September" },
  { v: "10", label: "Oktober" }, { v: "11", label: "November" }, { v: "12", label: "Disember" },
];

export function ReportListView({ onSwitchToGenerate }: { onSwitchToGenerate: () => void }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("all");
  const [status, setStatus] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [viewReport, setViewReport] = useState<Report | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (year) params.set("year", year);
      if (month && month !== "all") params.set("month", month);
      if (status && status !== "all") params.set("status", status);
      const res = await fetch(`/api/reports?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuatkan laporan");
      setReports(data.reports || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ralat memuatkan laporan");
    } finally {
      setLoading(false);
    }
  }, [q, year, month, status]);

  useEffect(() => {
    const t = setTimeout(fetchReports, 250); // debounce search
    return () => clearTimeout(t);
  }, [fetchReports]);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/reports/${deleteId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memadam laporan");
      toast.success("Laporan dipadam");
      setReports((p) => p.filter((r) => r.id !== deleteId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ralat memadam");
    } finally {
      setDeleteId(null);
    }
  }, [deleteId]);

  const handleRegenerate = useCallback(async (report: Report) => {
    if (!report.rawInput || report.rawInput.trim().length < 10) {
      toast.error("Tiada teks mentah untuk jana semula laporan ini.");
      return;
    }
    setRegeneratingId(report.id);
    try {
      // 1. Re-run AI on the stored raw input
      const genRes = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawInput: report.rawInput, penyedia: report.penyedia }),
      });
      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.error || "AI gagal menjana semula");
      // 2. Update the existing report with the freshly generated content
      const updRes = await fetch(`/api/reports/${report.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...genData.report,
          gambarUrls: report.gambarUrls,
          penyedia: report.penyedia,
          rawInput: report.rawInput,
          status: report.status,
        }),
      });
      const updData = await updRes.json();
      if (!updRes.ok) throw new Error(updData.error || "Gagal mengemas kini laporan");
      toast.success("Laporan dijana semula & PDF dikemas kini");
      setReports((p) => p.map((r) => (r.id === report.id ? updData.report : r)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ralat jana semula");
    } finally {
      setRegeneratingId(null);
    }
  }, []);

  const clearFilters = () => {
    setQ(""); setYear(""); setMonth("all"); setStatus("all");
  };
  const hasFilters = q || year || (month && month !== "all") || (status && status !== "all");

  return (
    <div className="brutal-fade-up space-y-5">
      {/* Heading */}
      <div className="brutal-card flex flex-wrap items-center justify-between gap-3 bg-foreground p-5 text-background">
        <div className="flex items-center gap-3">
          <div className="border-2 border-background bg-primary p-2">
            <FileText className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-mono text-xl font-extrabold uppercase tracking-tight sm:text-2xl">
              Senarai Laporan Kursus
            </h2>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-background/60">
              {reports.length} laporan tersimpan · disusun mengikut tarikh terkini
            </p>
          </div>
        </div>
        <Button
          onClick={onSwitchToGenerate}
          className="brutal-btn brutal-btn-primary bg-primary text-primary-foreground"
        >
          <Sparkles className="mr-1.5 h-4 w-4" /> Jana Baru
        </Button>
      </div>

      {/* Filters */}
      <div className="brutal-card grid gap-3 bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Label className="brutal-label" htmlFor="search">Cari</Label>
          <div className="relative mt-1">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
            <Input
              id="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nama kursus / lokasi..."
              className="brutal-input pl-8"
            />
          </div>
        </div>
        <div>
          <Label className="brutal-label">Tahun</Label>
          <Input
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="2026"
            className="brutal-input mt-1"
          />
        </div>
        <div>
          <Label className="brutal-label">Bulan</Label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="brutal-input mt-1 w-full font-mono text-sm">
              <SelectValue placeholder="Semua" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.v} value={m.v}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="brutal-label">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="brutal-input mt-1 w-full font-mono text-sm">
              <SelectValue placeholder="Semua" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="Selesai">Selesai</SelectItem>
              <SelectItem value="Draf">Draf</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {hasFilters ? (
          <div className="flex items-end sm:col-span-2 lg:col-span-5">
            <button
              onClick={clearFilters}
              className="brutal-btn brutal-btn-ghost flex items-center gap-1.5 px-3 py-2 text-xs"
            >
              <X className="h-3.5 w-3.5" /> Kosongkan penapis
            </button>
          </div>
        ) : null}
      </div>

      {/* List */}
      {loading ? (
        <div className="brutal-card flex items-center justify-center gap-3 bg-card p-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="font-mono text-sm uppercase tracking-wide">Memuatkan laporan...</span>
        </div>
      ) : reports.length === 0 ? (
        <div className="brutal-card flex flex-col items-center gap-3 bg-card p-12 text-center">
          <div className="border-2 border-foreground bg-secondary p-3">
            <Inbox className="h-8 w-8 text-foreground/40" />
          </div>
          <p className="font-mono text-sm font-bold uppercase tracking-wide">
            {hasFilters ? "Tiada laporan sepadan dengan penapis" : "Belum ada laporan tersimpan"}
          </p>
          <p className="font-mono text-[11px] text-foreground/60">
            {hasFilters
              ? "Cuba ubah suai penapis carian anda."
              : "Jana laporan pertama anda sekarang."}
          </p>
          {!hasFilters && (
            <button
              onClick={onSwitchToGenerate}
              className="brutal-btn brutal-btn-primary mt-2 flex items-center gap-2 bg-primary px-4 py-2 text-sm"
            >
              <Sparkles className="h-4 w-4" /> Jana Laporan
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {reports.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              onDelete={() => setDeleteId(r.id)}
              onRegenerate={() => handleRegenerate(r)}
              onView={() => setViewReport(r)}
              regenerating={regeneratingId === r.id}
            />
          ))}
        </div>
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="brutal-card border-2 border-foreground bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono text-base uppercase tracking-wide">
              Padam laporan ini?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-xs">
              Tindakan ini tidak boleh diundur. Fail PDF yang dijana juga akan dipadam.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="brutal-btn brutal-btn-outline">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="brutal-btn bg-destructive text-destructive-foreground brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_0_oklch(0.27_0_0)]"
            >
              <Trash2 className="mr-1.5 h-4 w-4" /> Padam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View modal */}
      {viewReport && (
        <ViewModal report={viewReport} onClose={() => setViewReport(null)} />
      )}
    </div>
  );
}

// ===== Card =====
function ReportCard({
  report, onDelete, onRegenerate, onView, regenerating,
}: {
  report: Report;
  onDelete: () => void;
  onRegenerate: () => void;
  onView: () => void;
  regenerating: boolean;
}) {
  const pct = report.jumlah > 0 ? Math.round((report.hadiran / report.jumlah) * 100) : 0;
  const date = new Date(report.tarikhDijana);
  const dateStr = date.toLocaleDateString("ms-MY", { day: "2-digit", month: "short", year: "numeric" });
  const thumb = report.gambarUrls[0];

  return (
    <article className="brutal-card flex flex-col bg-card overflow-hidden">
      {/* header strip */}
      <div className="flex items-center justify-between border-b-2 border-foreground bg-secondary px-4 py-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/70">
          {dateStr}
        </span>
        {report.status === "Selesai" ? (
          <Badge className="border-2 border-foreground bg-primary px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-primary-foreground">
            <ShieldCheck className="mr-1 h-3 w-3" /> Selesai
          </Badge>
        ) : (
          <Badge className="border-2 border-foreground bg-accent px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-accent-foreground">
            <Clock className="mr-1 h-3 w-3" /> Draf
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* title */}
        <h3 className="font-mono text-base font-extrabold uppercase leading-tight tracking-tight">
          {report.namaKursus}
        </h3>

        {/* meta */}
        <div className="grid grid-cols-1 gap-1 font-mono text-[11px] text-foreground/70">
          <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-primary" /> {report.tarikh}</span>
          <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" /> {report.lokasi}</span>
          <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-primary" /> {report.kehadiran} ({report.hadiran}/{report.jumlah})</span>
        </div>

        {/* attendance bar */}
        {report.jumlah > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-2 flex-1 border border-foreground bg-background">
              <div className="brutal-stripes h-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="font-mono text-[10px] font-bold">{pct}%</span>
          </div>
        )}

        {/* thumbnail */}
        {thumb && (
          <div className="mt-1 border-2 border-foreground bg-background">
            <img src={thumb} alt={report.namaKursus} className="aspect-video w-full object-cover" />
          </div>
        )}

        {/* actions */}
        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          {report.urlPdf ? (
            <a
              href={report.urlPdf}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="brutal-btn brutal-btn-primary flex items-center gap-1.5 bg-primary px-3 py-2 text-xs"
            >
              <Download className="h-3.5 w-3.5" /> PDF
            </a>
          ) : (
            <span className="brutal-btn brutal-btn-ghost px-3 py-2 text-xs opacity-60">Tiada PDF</span>
          )}
          <button
            onClick={onView}
            className="brutal-btn brutal-btn-outline flex items-center gap-1.5 px-3 py-2 text-xs"
          >
            <Eye className="h-3.5 w-3.5" /> Lihat
          </button>
          <button
            onClick={onRegenerate}
            disabled={regenerating}
            className="brutal-btn brutal-btn-outline flex items-center gap-1.5 px-3 py-2 text-xs disabled:opacity-50"
            title="Jana semula dengan AI"
          >
            {regenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Jana Semula
          </button>
          <button
            onClick={onDelete}
            className="brutal-btn brutal-btn-outline ml-auto flex items-center gap-1.5 border-destructive bg-destructive px-3 py-2 text-xs text-destructive-foreground"
            title="Padam laporan"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}

// ===== View modal (read-only detail) =====
function ViewModal({ report, onClose }: { report: Report; onClose: () => void }) {
  const pct = report.jumlah > 0 ? Math.round((report.hadiran / report.jumlah) * 100) : 0;
  const parseBullets = (text: string) =>
    text.split("\n").map((l) => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/60 p-3 sm:p-6" onClick={onClose}>
      <div
        className="brutal-card brutal-shadow-lg w-full max-w-3xl bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="sticky top-0 flex items-center justify-between border-b-2 border-foreground bg-primary px-5 py-3 text-primary-foreground">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <span className="font-mono text-sm font-extrabold uppercase tracking-wide">Pratonton Laporan</span>
          </div>
          <button onClick={onClose} className="border-2 border-primary-foreground bg-background p-1.5 hover:bg-secondary">
            <X className="h-4 w-4 text-foreground" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-5 brutal-scroll">
          <h2 className="font-mono text-xl font-extrabold uppercase tracking-tight">{report.namaKursus}</h2>
          {report.penyedia && (
            <p className="font-mono text-[11px] text-foreground/60">Disediakan oleh: {report.penyedia}</p>
          )}

          {/* details */}
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Detail icon={<Calendar className="h-4 w-4" />} label="Tarikh" value={report.tarikh} />
            <Detail icon={<Clock className="h-4 w-4" />} label="Masa" value={report.masa} />
            <Detail icon={<MapPin className="h-4 w-4" />} label="Lokasi" value={report.lokasi} />
          </div>

          {/* attendance */}
          <div className="mt-4 flex items-center gap-4 border-2 border-foreground bg-secondary p-3">
            <div className="border-2 border-foreground bg-primary px-3 py-1 text-center text-primary-foreground">
              <div className="font-mono text-2xl font-extrabold leading-none">{report.hadiran}</div>
              <div className="font-mono text-[9px] uppercase">/ {report.jumlah || "?"}</div>
            </div>
            <div className="flex-1">
              <div className="font-mono text-[10px] font-bold uppercase tracking-wide text-foreground/60">Kehadiran</div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-3 flex-1 border-2 border-foreground bg-background">
                  <div className="brutal-stripes h-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="font-mono text-xs font-bold">{pct}%</span>
              </div>
              <div className="mt-1 font-mono text-[10px] text-foreground/60">{report.kehadiran}</div>
            </div>
          </div>

          {/* sections */}
          {report.ringkasanAi && (
            <DetailSection title="Ringkasan Kursus">
              <p className="text-sm leading-relaxed">{report.ringkasanAi}</p>
            </DetailSection>
          )}
          {parseBullets(report.kelebihanAi).length > 0 && (
            <DetailSection title="Kelebihan">
              <ul className="space-y-1">
                {parseBullets(report.kelebihanAi).map((b, i) => (
                  <li key={i} className="flex gap-2 text-sm"><span className="text-primary">●</span><span>{b}</span></li>
                ))}
              </ul>
            </DetailSection>
          )}
          {parseBullets(report.kelemahanAi).length > 0 && (
            <DetailSection title="Kelemahan & Cabaran">
              <ul className="space-y-1">
                {parseBullets(report.kelemahanAi).map((b, i) => (
                  <li key={i} className="flex gap-2 text-sm"><span className="text-destructive">●</span><span>{b}</span></li>
                ))}
              </ul>
            </DetailSection>
          )}
          {parseBullets(report.cadanganAi).length > 0 && (
            <DetailSection title="Cadangan Penambahbaikan">
              <ul className="space-y-1">
                {parseBullets(report.cadanganAi).map((b, i) => (
                  <li key={i} className="flex gap-2 text-sm"><span className="text-primary">●</span><span>{b}</span></li>
                ))}
              </ul>
            </DetailSection>
          )}

          {/* gform */}
          {report.pautanGform && (
            <DetailSection title="Borang Maklum Balas">
              <a
                href={report.pautanGform}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all font-mono text-xs text-primary underline underline-offset-2"
              >
                {report.pautanGform}
              </a>
            </DetailSection>
          )}

          {/* gallery */}
          {report.gambarUrls.length > 0 && (
            <DetailSection title={`Galeri Gambar (${report.gambarUrls.length})`}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {report.gambarUrls.map((u, i) => (
                  <div key={u} className="border-2 border-foreground bg-background">
                    <img src={u} alt={`Gambar ${i + 1}`} className="aspect-video w-full object-cover" />
                  </div>
                ))}
              </div>
            </DetailSection>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-between gap-2 border-t-2 border-foreground bg-secondary px-5 py-3">
          <span className="font-mono text-[10px] text-foreground/60">
            Dijana: {new Date(report.tarikhDijana).toLocaleString("ms-MY")}
          </span>
          {report.urlPdf && (
            <a
              href={report.urlPdf}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="brutal-btn brutal-btn-primary flex items-center gap-1.5 bg-primary px-3 py-2 text-xs"
            >
              <Download className="h-3.5 w-3.5" /> Muat Turun PDF
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border-2 border-foreground bg-background p-2">
      <div className="flex items-center gap-1.5 text-primary">
        {icon}
        <span className="font-mono text-[10px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-0.5 text-xs font-medium">{value || "N/A"}</p>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 border-2 border-foreground bg-background">
      <div className="border-b-2 border-foreground bg-secondary px-3 py-1.5">
        <h4 className="font-mono text-[11px] font-extrabold uppercase tracking-wide">{title}</h4>
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}
