// Brand & system constants for Al Amin Edu Oasis
// Used by both frontend UI and backend PDF generation to keep identity consistent.

export const BRAND = {
  name: "Al Amin Edu Oasis",
  legalName: "Al Amin Edu Oasis Sdn Bhd",
  systemName: "Sistem LMS Al Amin Edu Oasis",
  module: "Modul Penjanaan Laporan Kursus",
  tagline: "Penjanaan Laporan Kursus Berbantukan AI",
  unit: "Unit Latihan & Pembangunan Guru & Staf",

  // Corporate colours (PRD §9.1)
  colors: {
    turquoise: "#0E8C96",
    turquoiseLight: "#14B8B8",
    white: "#FFFFFF",
    darkGray: "#333333",
  },

  logoPath: "/logo.png",
  logoAbsPath: "/home/z/my-project/public/logo.png",

  // Directory for uploaded activity photos (served statically)
  uploadDir: "/home/z/my-project/public/uploads",
  uploadUrlPrefix: "/uploads",

  // Directory for generated PDF reports
  reportDir: "/home/z/my-project/public/reports",
  reportUrlPrefix: "/reports",
} as const;

export type ReportStatus = "Selesai" | "Draf";

export interface GeneratedReport {
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
