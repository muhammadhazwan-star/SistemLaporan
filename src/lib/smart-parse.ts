// ============================================================
// Smart keyword-based parser — NO AI required.
//
// Extracts course information from raw pasted text using keyword/label
// matching, then auto-generates structured report content (ringkasan,
// kelebihan, kelemahan, cadangan) by rephrasing the detected points
// into professional Bahasa Melayu sentences.
//
// This runs 100% on the server (or client) — no external API calls.
// ============================================================

export interface DetectedReport {
  namaKursus: string;
  tarikh: string;
  masa: string;
  lokasi: string;
  kehadiran: string;
  hadiran: number;
  jumlah: number;
  pautanGform: string;
  ringkasanAi: string;
  kelebihanAi: string;
  kelemahanAi: string;
  cadanganAi: string;
}

const MONTH_NAMES: Record<string, string> = {
  "1": "Januari", "2": "Februari", "3": "Mac", "4": "April", "5": "Mei", "6": "Jun",
  "7": "Julai", "8": "Ogos", "9": "September", "10": "Oktober", "11": "November", "12": "Disember",
  "01": "Januari", "02": "Februari", "03": "Mac", "04": "April", "05": "Mei", "06": "Jun",
  "07": "Julai", "08": "Ogos", "09": "September",
  jan: "Januari", feb: "Februari", mar: "Mac", apr: "April", may: "Mei", jun: "Jun",
  jul: "Julai", aug: "Ogos", sep: "September", sept: "September", okt: "Oktober", oct: "Oktober", nov: "November", dec: "Disember",
  januari: "Januari", februari: "Februari", mac: "Mac", april: "April", mei: "Mei", jun: "Jun",
  julai: "Julai", ogos: "Ogos", september: "September", oktober: "Oktober", november: "November", disember: "Disember",
};

// Normalize a raw date string into "D Bulan Tahun" format.
function normalizeDate(raw: string): string {
  if (!raw) return "";
  const s = raw.trim();

  // "15 September 2026" or "15 Sept 2026"
  let m = s.match(/(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/);
  if (m) {
    const month = MONTH_NAMES[m[2].toLowerCase()];
    if (month) return `${parseInt(m[1], 10)} ${month} ${m[3]}`;
  }
  // "15/9/2026" or "15-08-2026" or "15.9.2026"
  m = s.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (m) {
    const day = parseInt(m[1], 10);
    const monthIdx = parseInt(m[2], 10);
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    const month = MONTH_NAMES[String(monthIdx)];
    if (month) return `${day} ${month} ${year}`;
  }
  // "Isnin 15 September 2026" — strip the weekday
  m = s.match(/\b(khamis|jumaat|sabtu|ahad|isnin|selasa|rabu)\s+(.+)/i);
  if (m) return normalizeDate(m[2]);
  return s;
}

// Normalize a raw time string into "HH:MM pagi - HH:MM petang" format.
function normalizeTime(raw: string): string {
  if (!raw) return "";
  const s = raw.trim().toLowerCase();

  // "8:30 pagi - 5:00 petang" / "08:30 - 17:00" / "9am to 4pm"
  const range = s.match(/(\d{1,2})(?::(\d{2}))?\s*(pagi|ptg|petang|am|pm)?\s*[-–hinggauntil\s,]+(?:dari|to|hingga)?\s*(\d{1,2})(?::(\d{2}))?\s*(pagi|ptg|petang|am|pm)?/);
  if (range) {
    const fmt = (h: string, mm: string | undefined, period: string | undefined) => {
      let hour = parseInt(h, 10);
      const min = mm || "00";
      let label = "pagi";
      if (period) {
        if (/^(ptg|petang|pm)$/.test(period)) {
          if (hour < 12) hour += 12;
          label = "petang";
        } else {
          label = "pagi";
        }
      } else if (hour >= 12) {
        label = "petang";
      }
      return `${String(hour).padStart(2, "0")}:${min} ${label}`;
    };
    const start = fmt(range[1], range[2], range[3]);
    const end = fmt(range[4], range[5], range[6]);
    return `${start} - ${end}`;
  }
  return raw;
}

// Extract a section's bullet points from raw text.
// Looks for a header line (e.g. "Kelebihan:"), then collects subsequent lines
// (split by newline, comma, or "-"/"•" bullets) until the next section header.
function extractSection(text: string, sectionLabels: string[], stopLabels: string[]): string[] {
  const lines = text.split("\n").map((l) => l.trim());
  const points: string[] = [];
  let inSection = false;

  for (const line of lines) {
    const lower = line.toLowerCase();
    // Check if this line is a section header we want
    const isHeader = sectionLabels.some((label) => {
      const re = new RegExp(`^${label}\\s*[:\\-]?\\s*$`, "i");
      return re.test(lower) || new RegExp(`^${label}\\s*[:\\-]\\s*(.+)`, "i").test(lower);
    });
    // Check if this line is a stop header
    const isStop = stopLabels.some((label) => new RegExp(`^${label}\\s*[:\\-]`, "i").test(lower));

    if (isStop) break;
    if (isHeader) {
      inSection = true;
      // If the header has content on the same line, capture it
      const match = line.match(new RegExp(`^(?:${sectionLabels.join("|")})\\s*[:\\-]\\s*(.+)`, "i"));
      if (match && match[1]) {
        // Split by comma or semicolon if multiple points on one line
        match[1].split(/[,;]/).map((p) => p.trim()).filter(Boolean).forEach((p) => points.push(p));
      }
      continue;
    }
    if (inSection && line) {
      // Split bullet points
      line.split(/\n/).forEach((l) => {
        const cleaned = l.replace(/^[-•*]\s*/, "").trim();
        if (cleaned) points.push(cleaned);
      });
    }
  }

  // If no section header found, try splitting by comma in the whole text
  if (points.length === 0) {
    const inline = text.match(new RegExp(`(?:${sectionLabels.join("|")})\\s*[:\\-]\\s*([^\\n]+)`, "i"));
    if (inline && inline[1]) {
      inline[1].split(/[,;]/).map((p) => p.trim()).filter(Boolean).forEach((p) => points.push(p));
    }
  }

  return points;
}

// Rephrase a raw point into a more professional sentence (light touch-up).
function professionalize(point: string): string {
  const p = point.trim().replace(/\.$/, "");
  if (!p) return "";
  // Capitalize first letter
  return p.charAt(0).toUpperCase() + p.slice(1);
}

// Auto-generate a ringkasan (executive summary) from detected fields.
function generateRingkasan(d: {
  namaKursus: string;
  tarikh: string;
  masa: string;
  lokasi: string;
  hadiran: number;
  jumlah: number;
}): string {
  const parts: string[] = [];
  if (d.namaKursus) {
    parts.push(`Kursus ${d.namaKursus}`);
  } else {
    parts.push("Kursus latihan");
  }
  if (d.tarikh) parts.push(`telah diadakan pada ${d.tarikh}`);
  if (d.lokasi) parts.push(`bertempat di ${d.lokasi}`);
  if (d.hadiran > 0) {
    if (d.jumlah > 0 && d.jumlah !== d.hadiran) {
      parts.push(`dengan penyertaan ${d.hadiran} daripada ${d.jumlah} peserta yang dijangka`);
    } else {
      parts.push(`dengan penyertaan ${d.hadiran} peserta`);
    }
  }
  if (d.masa) parts.push(`sepanjang sesi ${d.masa}`);
  let ringkasan = parts.join(" ") + ".";
  // Ensure it reads as a complete summary
  ringkasan += " Kursus ini bertujuan untuk meningkatkan kemahiran dan pengetahuan peserta dalam bidang berkaitan, selaras dengan objektif Unit Latihan & Pembangunan Guru & Staf Al Amin Edu Oasis.";
  return ringkasan;
}

// Auto-generate cadangan (suggestions) based on detected kelemahan.
function generateCadangan(kelemahan: string[]): string[] {
  const cadangan: string[] = [];
  const text = kelemahan.join(" ").toLowerCase();

  if (/masa|time|pendek|cukup|seket/.test(text)) {
    cadangan.push("Memperpanjangkan tempoh kursus atau menambah sesi susulan untuk pengukuhan");
  }
  if (/internet|wifi|rangkaian|network/.test(text)) {
    cadangan.push("Memastikan kelancaran capaian internet dengan menambah kapasiti jalur lebar sebelum sesi");
  }
  if (/penceramah|pengajar|fasilitator/.test(text)) {
    cadangan.push("Menambah bilangan penceramah pembantu untuk sesi yang lebih interaktif");
  }
  if (/bahan|rujukan|nota|modul/.test(text)) {
    cadangan.push("Menyediakan bahan rujukan tambahan dalam format digital dan cetakan");
  }
  if (/amali|praktikal|hands-on/.test(text)) {
    cadangan.push("Menambah komponen amali dengan akses penuh kepada peralatan dan sistem");
  }
  if (/peserta|hadir|bilangan|ramai|terhad/.test(text) && !cadangan.some((c) => /peserta/.test(c))) {
    cadangan.push("Membahagikan peserta kepada kumpulan lebih kecil untuk pengalaman pembelajaran yang lebih efektif");
  }

  // Fallback generic suggestions
  if (cadangan.length < 3) {
    cadangan.push("Mengadakan sesi penilaian dan maklum balas selepas kursus untuk penambahbaikan berterusan");
  }
  if (cadangan.length < 3) {
    cadangan.push("Merancang kursus susulan peringkat lanjutan dalam tempoh 3 bulan");
  }
  if (cadangan.length < 3) {
    cadangan.push("Memperkembrand kandungan kursus berdasarkan maklum balas peserta");
  }

  return cadangan.slice(0, 5);
}

// ============================================================
// Main entry: parse raw text into a full DetectedReport.
// ============================================================
export function parseReport(rawInput: string): DetectedReport {
  const text = rawInput.trim();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Helper: find value after a label pattern (first match wins)
  const findAfter = (labels: string[]): string => {
    for (const label of labels) {
      const re = new RegExp(`(?:^|\\n)\\s*${label}\\s*[:\\-]\\s*([^\\n|]+)`, "i");
      const m = text.match(re);
      if (m && m[1]) return m[1].trim();
    }
    return "";
  };

  // --- namaKursus ---
  let namaKursus = findAfter(["nama kursus", "tajuk", "kursus", "bengkel", "modul", "program", "title", "nama program"]);
  if (!namaKursus) {
    // Fallback: first non-label line
    const first = lines.find((l) => !/^(tarikh|hari|masa|waktu|lokasi|tempat|hadiran|peserta|kebaikan|kelebihan|kekurangan|kelemahan|borang|gform|pautan|venue|date|time|masalah|cadangan)/i.test(l));
    namaKursus = first || "Kursus Latihan";
  }

  // --- tarikh ---
  let tarikh = findAfter(["tarikh", "hari", "tanggal", "date", "tgl"]);
  if (!tarikh) {
    const dateMatch = text.match(/\b(\d{1,2})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{2,4})\b/) ||
                      text.match(/\b(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})\b/);
    if (dateMatch) tarikh = dateMatch[0];
  }
  tarikh = normalizeDate(tarikh);

  // --- masa ---
  let masa = findAfter(["masa", "waktu", "time", "jam"]);
  if (!masa) {
    const timeMatch = text.match(/\b(\d{1,2})[:\.]?(\d{0,2})\s*(pagi|ptg|petang|am|pm)?\s*[-–hinggauntil\s,]+(?:\d{1,2})[:\.]?(\d{0,2})\s*(pagi|ptg|petang|am|pm)?\b/i);
    if (timeMatch) masa = timeMatch[0];
  }
  masa = normalizeTime(masa);

  // --- lokasi ---
  let lokasi = findAfter(["lokasi", "tempat", "venue", "location"]);
  if (!lokasi) lokasi = "";

  // --- kehadiran ---
  let kehadiran = findAfter(["kehadiran", "peserta", "hadir", "bilangan", "bil peserta", "attendance"]);
  let hadiran = 0;
  let jumlah = 0;
  if (kehadiran) {
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
  } else {
    // Try to find "N/M" anywhere
    const frac = text.match(/\b(\d+)\s*[/\\]\s*(\d+)\b/);
    if (frac) {
      hadiran = parseInt(frac[1], 10);
      jumlah = parseInt(frac[2], 10);
      kehadiran = `${hadiran}/${jumlah}`;
    }
  }
  // Override: if the full text contains "X daripada Y" / "X dari Y" / "X of Y",
  // prefer that over the single-number match (handles "18 orang (daripada 20)")
  const fullDari = text.match(/(\d+)\s*(?:orang|peserta)?\s*[\(]?\s*(?:daripada|dari|of)\s*(\d+)/i);
  if (fullDari) {
    hadiran = parseInt(fullDari[1], 10);
    jumlah = parseInt(fullDari[2], 10);
    kehadiran = `${hadiran}/${jumlah}`;
  }

  // --- pautanGform ---
  const gformMatch = text.match(/https?:\/\/(?:forms\.gle\/[^\s|)]+|docs\.google\.com\/forms\/[^\s|)]+)/i);
  const pautanGform = gformMatch ? gformMatch[0] : "";

  // --- kelebihan (bullet points) ---
  const kelebihanRaw = extractSection(
    text,
    ["kelebihan", "kebaikan", "strengths", "good", "kelonggaran", "aspek positif"],
    ["kelemahan", "kekurangan", "cabaran", "masalah", "cadangan", "borang", "pautan", "gform", "weakness", "bad"]
  );
  const kelebihanPoints = kelebihanRaw.map(professionalize).filter(Boolean);

  // --- kelemahan (bullet points) ---
  const kelemahanRaw = extractSection(
    text,
    ["kelemahan", "kekurangan", "cabaran", "masalah", "weakness", "bad", "isu"],
    ["kelebihan", "kebaikan", "cadangan", "borang", "pautan", "gform", "strengths", "good"]
  );
  const kelemahanPoints = kelemahanRaw.map(professionalize).filter(Boolean);

  // --- Auto-generate content ---
  const base = { namaKursus, tarikh, masa, lokasi, hadiran, jumlah };
  const ringkasanAi = generateRingkasan(base);
  const kelebihanAi = kelebihanPoints.length > 0
    ? kelebihanPoints.map((p) => `- ${p}`).join("\n")
    : "- Kandungan kursus disusun dengan baik dan relevan dengan objektif latihan\n- Pelaksanaan kursus berjalan lancar mengikut jadual yang ditetapkan\n- Penglibatan peserta aktif sepanjang sesi";
  const kelemahanAi = kelemahanPoints.length > 0
    ? kelemahanPoints.map((p) => `- ${p}`).join("\n")
    : "- Masa amali agak terhad untuk topik yang luas\n- Beberapa penyesuaian diperlukan untuk kursus seterusnya";
  const cadanganAi = generateCadangan(kelemahanPoints).map((c) => `- ${c}`).join("\n");

  return {
    namaKursus: namaKursus.slice(0, 200) || "Kursus Latihan",
    tarikh: tarikh || "N/A",
    masa: masa || "N/A",
    lokasi: lokasi || "N/A",
    kehadiran: kehadiran || (hadiran ? `${hadiran}/${jumlah}` : "N/A"),
    hadiran,
    jumlah,
    pautanGform,
    ringkasanAi,
    kelebihanAi,
    kelemahanAi,
    cadanganAi,
  };
}

// Lightweight detection for the live preview (returns a subset).
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

export function detectFields(text: string): DetectedFields {
  const full = parseReport(text);
  return {
    namaKursus: full.namaKursus,
    tarikh: full.tarikh,
    masa: full.masa,
    lokasi: full.lokasi,
    kehadiran: full.kehadiran,
    hadiran: full.hadiran,
    jumlah: full.jumlah,
    pautanGform: full.pautanGform,
    kelebihan: full.kelebihanAi.replace(/^-\s*/gm, "").split("\n").join(", ").slice(0, 200),
    kelemahan: full.kelemahanAi.replace(/^-\s*/gm, "").split("\n").join(", ").slice(0, 200),
  };
}

export function hasDetectedInfo(d: DetectedFields): boolean {
  return !!(d.namaKursus || d.tarikh || d.masa || d.lokasi || d.kehadiran || d.pautanGform);
}
