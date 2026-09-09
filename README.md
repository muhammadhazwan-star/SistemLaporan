# Sistem LMS Al Amin Edu Oasis — Modul Penjanaan Laporan Kursus

Sistem web ringkas (login-less) untuk membantu Unit Latihan & Pembangunan Guru & Staf **Al Amin Edu Oasis Sdn Bhd** mengautomasikan penjanaan laporan kursus latihan dengan bantuan AI. Pengguna menampal maklumat kursus mentah, AI (GLM melalui z.ai) menjana kandungan laporan profesional, dan sistem menghasilkan PDF beridentiti korporat (logo, tema turquoise, QR code, galeri gambar).

Dibangunkan berdasarkan dokumen PRD (`PRD_Sistem_LMS_AlAminEduOasis.docx`).

## Ciri Utama

- **Penjanaan Laporan AI** — Tampal teks mentah kursus → GLM (z.ai) menjana ringkasan, kelebihan, kelemahan & cadangan dalam Bahasa Melayu profesional.
- **Muat Naik Gambar** — Sokoan berbilang gambar aktiviti kursus.
- **Pratonton & Sunting** — Edit mana-mana medan sebelum menjana PDF.
- **PDF Beridentiti Korporat** — Logo, tema turquoise (#0E8C96), statistik kehadiran, QR code Google Form, galeri gambar, footer nombor halaman.
- **Senarai Laporan** — Carian, penapis (tahun/bulan/status), muat turun, jana semula, padam.
- **Pangkalan Data Kekal** — Prisma + Supabase (PostgreSQL) menyimpan rekod laporan secara kekal di cloud.
- **Reka Bentuk Brutalist** — UI/UX neo-brutalist dengan sempadan tebal, bayang offset keras, sudut tajuk, tipografi monospace.

## Tech Stack

| Komponen | Teknologi |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui |
| Backend | Next.js API Routes, Prisma ORM, Supabase (PostgreSQL) |
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

Sistem ini menggunakan **Supabase (PostgreSQL)** sebagai pangkalan data cloud. Salin fail contoh dan kemaskini dengan kredensial Supabase anda:

```bash
cp .env.example .env
```

Kandungan `.env` (gantikan `YOUR_PROJECT_REF`, `YOUR_PASSWORD`, dan `REGION` dengan nilai Supabase anda):
```
DATABASE_URL=postgresql://postgres.YOUR_PROJECT_REF:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.YOUR_PROJECT_REF:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres
```

> **Nota**: `DATABASE_URL` guna connection pooler (port 6543, PgBouncer) untuk runtime, manakala `DIRECT_URL` guna direct connection (port 5432) untuk Prisma migrations/db push. Password yang mengandungi `@` perlu di-URL-encode sebagai `%40`.

### 3. Sediakan pangkalan data

```bash
bun run db:push      # cipta skema pangkalan data di Supabase
bun run seed         # tambah 7 laporan contoh + jana PDF
```

### 3b. Cipta Storage Bucket di Supabase (WAJIB untuk muat naik gambar)

Gambar aktiviti kursus disimpan di **Supabase Storage** (bukan filesystem tempatan), supaya ia berfungsi pada platform serverless (Vercel) dan mana-mana deployment cloud.

1. Pergi ke **Supabase Dashboard** → **Storage** → **New bucket**
2. Name: `uploads`
3. Public: ✅ **tandai "Public bucket"** (supaya gambar boleh diakses tanpa auth)
4. Klik **Create bucket**

> Tanpa langkah ini, muat naik gambar akan gagal dengan ralat "Bucket not found".

### 4. Jalankan dev server

```bash
bun run dev
```

Buka `http://localhost:3000`.

> Rekod laporan contoh (7 buah) disimpan dalam pangkalan data Supabase. Fail PDF yang dijana disimpan dalam `public/reports/`. Anda boleh menjana semula dengan `bun run seed`.

## Deployment

Projek ini menggunakan **Docker** (Node.js + Python) kerana penjanaan PDF memerlukan Python (ReportLab). Fail-fail deployment disediakan: `Dockerfile`, `.dockerignore`, `railway.json`, `render.yaml`.

### Pilihan 1: Railway (paling mudah — auto-deploy dari GitHub)

1. Pergi ke **https://railway.app** → New Project → Deploy from GitHub repo
2. Pilih repo `muhammadhazwan-star/SistemLaporan`
3. Railway akan auto-detect `Dockerfile` dan build
4. Tambah **Variables** (Environment Variables):
   ```
   DATABASE_URL=postgresql://postgres.briqnbwwfztfphyivefq:Hazwanrais%4012@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
   DIRECT_URL=postgresql://postgres.briqnbwwfztfphyivefq:Hazwanrais%4012@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres
   ```
5. Tambah **Volume** untuk persistent storage (uploads/reports):
   - Mount path: `/app/public`
   - Size: 2GB
6. Deploy → Railway akan beri URL awam (contoh: `https://sistemlaporan.up.railway.app`)

### Pilihan 2: Render

1. Pergi ke **https://render.com** → New → Web Service → Connect repo GitHub
2. Render akan auto-detect `render.yaml`
3. Tambah environment variables yang sama (DATABASE_URL + DIRECT_URL)
4. Deploy

### Pilihan 3: Docker (mana-mana VPS / cloud)

```bash
# Build image
docker build -t alamin-edu-oasis-lms .

# Run container
docker run -d \
  --name alamin-lms \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://postgres.briqnbwwfztfphyivefq:Hazwanrais%4012@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1" \
  -e DIRECT_URL="postgresql://postgres.briqnbwwfztfphyivefq:Hazwanrais%4012@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres" \
  -v alamin-uploads:/app/public/uploads \
  -v alamin-reports:/app/public/reports \
  alamin-edu-oasis-lms
```

### ⚠️ Nota Penting

- **Vercel tidak disokong** — penjanaan PDF menggunakan Python (ReportLab) yang memerlukan child process, tidak tersedia di Vercel serverless.
- **Persistent volume diperlukan** — gambar yang dimuat naik dan PDF yang dijana disimpan di `public/uploads/` dan `public/reports/`. Tanpa persistent volume, fail akan hilang selepas redeploy.
- **Supabase** sudah di-konfigurasi sebagai pangkalan data cloud, jadi data laporan kekal merentas deploy.

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
