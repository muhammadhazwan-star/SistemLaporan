// Shared report types used across the frontend.

export interface Report {
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
  urlPdf: string;
  status: "Selesai" | "Draf";
  penyedia: string;
  rawInput: string;
  tarikhDijana: string;
  updatedAt: string;
}

export type View = "generate" | "list";
