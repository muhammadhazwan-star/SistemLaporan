// Smart real-time parser — extracts course info from raw pasted text
// as the user types, so they can see what the AI will pick up.
// This is a "best-effort" preview; the AI does the final accurate extraction.

export interface DetectedFields {
  namaKursus: string;
  tarikh: string;
  masa: string;
  lokasi: string;
  kehadiran: string;
  hadiran: number;
  jumlah: number;
  pautanGform: string;
  kelebihan: string;
  kelemahan: string;
}

const MONTHS_MS: Record<string, number> = {
  januari: 1, februari: 2, mac: 3, april: 4, mei: 5, jun: 6,
  julai: 7, ogos: 8, september: 9, oktober: 10, november: 11, disember: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, okt: 10, nov: 11, dis: 12,
};

export function detectFields(text: string): DetectedFields {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const lower = text.toLowerCase();

  // Helper: find value after a label pattern
  const findAfter = (labels: string[]): string => {
    for (const label of labels) {
      // Match "Label:" or "Label :" or "Label -" on a line
      const re = new RegExp(`${label}\\s*[:\\-]\\s*(.+)`, "i");
      for (const line of lines) {
        const m = line.match(re);
        if (m && m[1]) return m[1].trim();
      }
      // Also match inline
      const inline = text.match(new RegExp(`${label}\\s*[:\\-]\\s*([^\\n|]+)`, "i"));
      if (inline && inline[1]) return inline[1].trim();
    }
    return "";
  };

  // namaKursus
  let namaKursus = findAfter(["nama kursus", "tajuk", "kursus", "bengkel", "modul", "program", "title"]);
  if (!namaKursus) {
    // Fallback: first non-empty line that's not a label
    const first = lines.find((l) => !/^(tarikh|masa|lokasi|hadiran|kebaikan|kekurangan|borang|gform|pautan)/i.test(l));
    namaKursus = first || "";
  }

  // tarikh
  let tarikh = findAfter(["tarikh", "hari", "tanggal", "date"]);
  if (!tarikh) {
    // Try to find a date pattern in the text
    const dateMatch = text.match(/\b(\d{1,2})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{2,4})\b/) ||
                      text.match(/\b(\d{1,2})\s+(januari|februari|mac|april|mei|jun|julai|ogos|september|oktober|november|disember|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|okt|nov|dis)\s+(\d{4})\b/i);
    if (dateMatch) tarikh = dateMatch[0];
  }

  // masa
  let masa = findAfter(["masa", "waktu", "time", "jam"]);
  if (!masa) {
    const timeMatch = text.match(/\b(\d{1,2})[:\.]?(\d{0,2})\s*(pagi|ptg|petang|am|pm)\s*[-–hingga\ts]+(?:\d{1,2})[:\.]?(\d{0,2})\s*(pagi|ptg|petang|am|pm)?\b/i);
    if (timeMatch) masa = timeMatch[0];
  }

  // lokasi
  let lokasi = findAfter(["lokasi", "tempat", "venue", "location"]);

  // kehadiran
  let kehadiran = findAfter(["kehadiran", "peserta", "hadir", "bilangan", "attendance"]);
  let hadiran = 0;
  let jumlah = 0;
  if (kehadiran) {
    // Parse "18/20" or "18 daripada 20" or "18 orang"
    const fracMatch = kehadiran.match(/(\d+)\s*[/\\]\s*(\d+)/);
    const dariMatch = kehadiran.match(/(\d+)\s*(?:daripada|dari|of)\s*(\d+)/i);
    const singleMatch = kehadiran.match(/(\d+)/);
    if (fracMatch) {
      hadiran = parseInt(fracMatch[1], 10);
      jumlah = parseInt(fracMatch[2], 10);
    } else if (dariMatch) {
      hadiran = parseInt(dariMatch[1], 10);
      jumlah = parseInt(dariMatch[2], 10);
    } else if (singleMatch) {
      hadiran = parseInt(singleMatch[1], 10);
      jumlah = hadiran;
    }
    if (jumlah > 0 && !kehadiran.includes("/")) {
      kehadiran = `${hadiran}/${jumlah}`;
    }
  }

  // pautanGform
  const gformMatch = text.match(/https?:\/\/(?:forms\.gle\/[^\s|]+|docs\.google\.com\/forms\/[^\s|]+)/i);
  const pautanGform = gformMatch ? gformMatch[0] : "";

  // kelebihan
  let kelebihan = findAfter(["kelebihan", "kebaikan", "strengths", "good"]);
  // Also grab lines under a "kelebihan:" header
  if (!kelebihan) {
    const sectionMatch = text.match(/(?:kelebihan|kebaikan)\s*[:\-\n]+([\s\S]*?)(?=\n\s*(?:kelemahan|kekurangan|borang|pautan|gform|$))/i);
    if (sectionMatch) kelebihan = sectionMatch[1].trim();
  }

  // kelemahan
  let kelemahan = findAfter(["kelemahan", "kekurangan", "cabaran", "weaknesses", "bad"]);
  if (!kelemahan) {
    const sectionMatch = text.match(/(?:kelemahan|kekurangan)\s*[:\-\n]+([\s\S]*?)(?=\n\s*(?:cadangan|borang|pautan|gform|$))/i);
    if (sectionMatch) kelemahan = sectionMatch[1].trim();
  }

  return {
    namaKursus: namaKursus.slice(0, 100),
    tarikh,
    masa,
    lokasi,
    kehadiran: kehadiran || (hadiran ? `${hadiran}/${jumlah}` : ""),
    hadiran,
    jumlah,
    pautanGform,
    kelebihan: kelebihan.slice(0, 300),
    kelemahan: kelemahan.slice(0, 300),
  };
}

export function hasDetectedInfo(d: DetectedFields): boolean {
  return !!(d.namaKursus || d.tarikh || d.masa || d.lokasi || d.kehadiran || d.pautanGform);
}
