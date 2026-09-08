import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { BRAND } from "./brand";

export interface ReportData {
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
  urlPdf?: string;
  status: string;
  penyedia: string;
  rawInput: string;
  tarikhDijana: string;
  updatedAt: string;
}

/**
 * Generate a branded course-report PDF using the Python (ReportLab) script.
 * Writes the file under public/reports and returns its public URL.
 */
export async function generateReportPdf(report: ReportData): Promise<string> {
  const scriptPath = path.join(process.cwd(), "src", "lib", "pdf_script.py");

  if (!fs.existsSync(BRAND.reportDir)) {
    fs.mkdirSync(BRAND.reportDir, { recursive: true });
  }

  const filename = `laporan-${report.id || Date.now()}.pdf`;
  const outPath = path.join(BRAND.reportDir, filename);

  const payload = {
    report: {
      ...report,
      logoPath: BRAND.logoAbsPath,
      tarikhDijana: report.tarikhDijana || new Date().toISOString(),
    },
    outPath,
  };

  await new Promise<void>((resolve, reject) => {
    const proc = spawn("python3", [scriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    let stdout = "";
    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    proc.on("error", (err) => reject(err));

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`PDF script exited ${code}: ${stderr || stdout}`));
      } else {
        resolve();
      }
    });

    proc.stdin.write(JSON.stringify(payload));
    proc.stdin.end();
  });

  if (!fs.existsSync(outPath)) {
    throw new Error("PDF tidak dijana oleh skrip.");
  }

  return `${BRAND.reportUrlPrefix}/${filename}`;
}
