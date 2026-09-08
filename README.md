# Sistem LMS Al Amin Edu Oasis — Modul Penjanaan Laporan Kursus

Sistem web ringkas (login-less) untuk membantu Unit Latihan & Pembangunan Guru & Staf **Al Amin Edu Oasis Sdn Bhd** mengautomasikan penjanaan laporan kursus latihan dengan bantuan AI. Pengguna menampal maklumat kursus mentah, AI (GLM melalui z.ai) menjana kandungan laporan profesional, dan sistem menghasilkan PDF beridentiti korporat (logo, tema turquoise, QR code, galeri gambar).

Dibangunkan berdasarkan dokumen PRD (`PRD_Sistem_LMS_AlAminEduOasis.docx`).

## Ciri Utama

- **Penjanaan Laporan AI** — Tampal teks mentah kursus → GLM (z.ai) menjana ringkasan, kelebihan, kelemahan & cadangan dalam Bahasa Melayu profesional.
- **Muat Naik Gambar** — Sokoan berbilang gambar aktiviti kursus.
- **Pratonton & Sunting** — Edit mana-mana medan sebelum menjana PDF.
- **PDF Beridentiti Korporat** — Logo, tema turquoise (#0E8C96), statistik kehadiran, QR code Google Form, galeri gambar, footer nombor halaman.
- **Senarai Laporan** — Carian, penapis (tahun/bulan/status), muat turun, jana semula, padam.
- **Pangkalan Data Kekal** — Prisma + SQLite menyimpan rekod laporan secara kekal.
- **Reka Bentuk Brutalist** — UI/UX neo-brutalist dengan sempadan tebal, bayang offset keras, sudut tajuk, tipografi monospace.

## Tech Stack

| Komponen | Teknologi |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui |
| Backend | Next.js API Routes, Prisma ORM, SQLite |
| AI | z-ai-web-dev-sdk (GLM) |
| PDF | ReportLab (Python) + qrcode + Pillow |
| Ikon | Lucide React |
| State | React Hooks, TanStack Query |

## Persediaan (Setup)

### 1. Pasang dependencies

```bash
bun install
```

### 2. Konfigurasi environment

Salin fail contoh dan jadikan `.env` (DATABASE_URL sudah pun portabel):

```bash
cp .env.example .env
```

Kandungan `.env`:
```
DATABASE_URL=file:./db/custom.db
```

### 3. Sediakan pangkalan data

```bash
bun run db:push      # cipta skema pangkalan data
bun run seed         # tambah 7 laporan contoh + jana PDF
```

### 4. Jalankan dev server

```bash
bun run dev
```

Buka `http://localhost:3000`.

> Rekod laporan contoh (7 buah) dan fail PDF yang dijana sudah disertakan dalam repo (di `db/custom.db` dan `public/reports/`). Anda boleh menjana semula dengan `bun run seed`.

## Struktur Projek

```
.
├── prisma/schema.prisma          # Skema pangkalan data (model Report)
├── scripts/seed.ts               # Skrip benih laporan contoh
├── public/
│   ├── logo.png                  # Logo rasmi Al Amin Edu Oasis
│   ├── favicon.png
│   ├── uploads/                  # Gambar aktiviti kursus
│   └── reports/                  # PDF laporan yang dijana
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── reports/          # CRUD laporan + generate (AI)
│   │   │   └── upload/           # Muat naik gambar
│   │   ├── globals.css           # Tema brutalist turquoise
│   │   ├── layout.tsx
│   │   └── page.tsx              # Halaman utama (view switcher)
│   ├── components/
│   │   ├── generate-view.tsx     # Borang jana laporan + pratonton
│   │   ├── report-list-view.tsx  # Senarai laporan + carian/filter
│   │   └── ui/                   # Komponen shadcn/ui
│   └── lib/
│       ├── brand.ts              # Konstanta jenama & warna
│       ├── db.ts                 # Prisma client
│       ├── pdf-generator.ts      # Wrapper TS untuk skrip PDF Python
│       ├── pdf_script.py         # Penjana PDF (ReportLab)
│       └── types.ts
└── package.json
```

## Penggunaan

1. **Jana Laporan**: Tampal maklumat kursus mentah (nama, tarikh, masa, lokasi, kehadiran, kelebihan, kelemahan, pautan Google Form) → klik "Jana Laporan dengan AI" → sunting pratonton → "Sahkan & Jana PDF".
2. **Senarai Laporan**: Lihat semua laporan tersimpan, cari/tapis, muat turun PDF, lihat butiran, jana semula dengan AI, atau padam.

## Skrip NPM

| Skrip | Penerangan |
|---|---|
| `bun run dev` | Jalankan dev server (port 3000) |
| `bun run lint` | Semak kualiti kod (ESLint) |
| `bun run db:push` | Tolak skema ke pangkalan data |
| `bun run seed` | Benih 7 laporan contoh + jana PDF |

## Identiti Korporat

- **Warna Utama**: Turquoise `#0E8C96` (turquoise light `#14B8B8`)
- **Warna Sokongan**: Putih `#FFFFFF`
- **Warna Aksen**: Kelabu gelap `#333333`
- **Logo**: Emblem gerbang bulat turquoise dengan motif gelombang air/oasis + teks "AL AMIN EDU OASIS SDN BHD"

## Lesen

© Al Amin Edu Oasis Sdn Bhd. Semua hak terpelihara.
