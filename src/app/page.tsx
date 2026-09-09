"use client";

import { useState, useCallback } from "react";
import { Sparkles, ListOrdered, GraduationCap, Waves } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { Report, View } from "@/lib/types";
import { GenerateView } from "@/components/generate-view";
import { ReportListView } from "@/components/report-list-view";

export default function Home() {
  const [view, setView] = useState<View>("generate");
  const [listKey, setListKey] = useState(0);

  // Called after a report is saved — switch to the list and refresh it.
  const goToList = useCallback(() => {
    setListKey((k) => k + 1);
    setView("list");
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ===== Top ticker ===== */}
      <div className="overflow-hidden border-b-2 border-foreground bg-foreground text-background">
        <div className="flex whitespace-nowrap py-1 brutal-marquee">
          {Array.from({ length: 2 }).map((_, i) => (
            <span key={i} className="font-mono text-[11px] font-bold uppercase tracking-[0.22em]">
              {Array.from({ length: 6 }).map((_, j) => (
                <span key={j} className="mx-6 inline-flex items-center gap-2">
                  <Waves className="h-3 w-3" />
                  {BRAND.systemName}
                  <span className="opacity-60">/</span>
                  {BRAND.module}
                  <span className="opacity-60">/</span>
                  Berkuasa AI GLM
                  <span className="opacity-60">/</span>
                  Latihan Guru &amp; Staf
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ===== Header ===== */}
      <header className="sticky top-0 z-40 border-b-2 border-foreground bg-background">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {/* Brand — the real logo already contains "AL AMIN EDU OASIS SDN BHD",
              so we show it large enough for its text to be legible and do NOT repeat
              the brand name beside it. Next to it we show only the system purpose. */}
          <div className="flex items-center gap-3">
            <div className="relative h-20 w-20 shrink-0 border-2 border-foreground bg-white p-1 brutal-shadow-sm sm:h-24 sm:w-24">
              <img
                src={BRAND.logoPath}
                alt={`Logo ${BRAND.name}`}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="leading-tight">
              <p className="font-mono text-sm font-extrabold uppercase tracking-tight text-foreground sm:text-base">
                Sistem Penjanaan
              </p>
              <p className="font-mono text-sm font-extrabold uppercase tracking-tight text-foreground sm:text-base">
                Laporan Kursus
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
                Berbantukan AI · GLM
              </p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-2" aria-label="Navigasi utama">
            <button
              onClick={() => setView("generate")}
              className={`brutal-btn px-3 py-2 text-xs font-bold uppercase tracking-wide sm:text-sm ${
                view === "generate" ? "brutal-btn-primary" : "brutal-btn-outline"
              }`}
              aria-pressed={view === "generate"}
            >
              <Sparkles className="mr-1.5 inline h-4 w-4" />
              Jana Laporan
            </button>
            <button
              onClick={() => {
                setListKey((k) => k + 1);
                setView("list");
              }}
              className={`brutal-btn px-3 py-2 text-xs font-bold uppercase tracking-wide sm:text-sm ${
                view === "list" ? "brutal-btn-primary" : "brutal-btn-outline"
              }`}
              aria-pressed={view === "list"}
            >
              <ListOrdered className="mr-1.5 inline h-4 w-4" />
              Senarai Laporan
            </button>
          </nav>
        </div>
      </header>

      {/* ===== Main ===== */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {view === "generate" ? (
          <GenerateView key="gen" onSaved={goToList} />
        ) : (
          <ReportListView key={listKey} onSwitchToGenerate={() => setView("generate")} />
        )}
      </main>

      {/* ===== Footer ===== */}
      <footer className="mt-auto border-t-2 border-foreground bg-foreground text-background">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-4 py-5 sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-center gap-3">
            <div className="border-2 border-background bg-primary p-1">
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.16em]">
                {BRAND.legalName}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-background/60">
                {BRAND.unit}
              </p>
            </div>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-background/60">
            © {new Date().getFullYear()} · {BRAND.systemName} · v1.0
          </div>
        </div>
      </footer>
    </div>
  );
}
