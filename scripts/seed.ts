/**
 * Seed script — populates the database with realistic dummy course reports
 * for Al Amin Edu Oasis, and generates a branded PDF for each.
 *
 * Run: bun run seed
 */
import { db } from "../src/lib/db";
import { generateReportPdf, type ReportData } from "../src/lib/pdf-generator";
import fs from "fs";

interface SeedReport {
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
  penyedia: string;
  rawInput: string;
  status: "Selesai" | "Draf";
  daysAgo: number;
}

const REPORTS: SeedReport[] = [
  {
    namaKursus: "Kursus AI dalam Pendidikan",
    tarikh: "8 September 2026",
    masa: "08:30 pagi - 05:00 petang",
    lokasi: "Bilik Latihan Utama, Al Amin Edu Oasis",
    kehadiran: "16/16",
    hadiran: 16,
    jumlah: 16,
    ringkasanAi:
      "Kursus sehari ini memberi pendedahan menyeluruh kepada 16 orang guru mengenai penggunaan kecerdasan buatan (AI) dalam pengajaran dan pembelajaran. Modul merangkumi pengenalan kepada alat AI generatif, teknik prompt yang berkesan, serta integrasi AI dalam penghasilan bahan PdP. Maklum balas peserta menunjukkan tahap kepuasan yang tinggi terhadap kandungan dan metodologi kursus.",
    kelebihanAi:
      "- Kandungan kursus relevan dengan keperluan pendidikan semasa\n- Penceramah berpengalaman dan interaktif sepanjang sesi\n- Bahan rujukan lengkap dan berkualiti untuk rujukan lanjut\n- Sesi amali membolehkan peserta mencuba terus alat AI\n- Pengurusan masa kursus yang cemerlang dan tepati jadual",
    kelemahanAi:
      "- Masa praktikal agak terhad untuk topik yang begitu luas\n- Capaian internet sedikit terganggu pada sesi petang",
    cadanganAi:
      "- Tambah sesi amali tambahan selepas kursus untuk pengukuhan\n- Sediakan panduan ringkas alat AI untuk rujukan peserta\n- Pastikan kelancaran capaian internet sebelum sesi bermula\n- Adakan kursus susulan peringkat lanjutan dalam masa 3 bulan",
    pautanGform: "https://forms.gle/AlAminAIPendidikan2026",
    gambarUrls: ["/uploads/sample-1.png", "/uploads/sample-2.png"],
    penyedia: "Ustaz Ahmad Faizal bin Osman",
    rawInput:
      "Nama Kursus: Kursus AI dalam Pendidikan\nTarikh: 8 September 2026\nMasa: 8:30 pagi - 5:00 petang\nLokasi: Bilik Latihan Utama\nKehadiran: 16/16\nKelebihan: kandungan relevan, penceramah interaktif, bahan lengkap, sesi amali\nKelemahan: masa praktikal terhad, internet tergangu petang\nGform: https://forms.gle/AlAminAIPendidikan2026",
    status: "Selesai",
    daysAgo: 2,
  },
  {
    namaKursus: "Bengkel Pedagogi Pembelajaran Abad Ke-21",
    tarikh: "22 Ogos 2026",
    masa: "09:00 pagi - 04:00 petang",
    lokasi: "Dewan Serbaguna, Al Amin Edu Oasis",
    kehadiran: "24/28",
    hadiran: 24,
    jumlah: 28,
    ringkasanAi:
      "Bengkel ini memberi tumpuan kepada strategi pengajaran differentiated learning yang sesuai dengan keperluan pelajar abad ke-21. Seramai 24 daripada 28 peserta guru menghadiri bengkel ini yang merangkumi teknik penilaian formatif, pengurusan kelas heterogen serta penggunaan teknologi dalam pembezaan pengajaran.",
    kelebihanAi:
      "- Aktiviti kumpulan yang menggalakkan kolaborasi antara peserta\n- Contoh kes dikongsi secara terperinci dan mudah difahami\n- Penceramah mahir menyelaraskan teori dengan amalan bilik darjah\n- Bahan modul disediakan dalam format digital dan cetakan",
    kelemahanAi:
      "- Bilangan peserta melebihi kapasiti optimum untuk aktiviti kumpulan\n- Sesi soal jawab agak pendek kerana had masa\n- Beberapa topik lanjutan terpaksa diringkaskan",
    cadanganAi:
      "- Hadkan pendaftaran kepada 20 peserta untuk sesi seterusnya\n- Sediakan sesi tambahan khas untuk soal jawab\n- Kembangkan modul topik lanjutan sebagai kursus berasingan",
    pautanGform: "https://forms.gle/PedagogiAbad21Bengkel",
    gambarUrls: ["/uploads/sample-3.png", "/uploads/sample-4.png", "/uploads/sample-1.png"],
    penyedia: "Puan Nor Aishah binti Hassan",
    rawInput:
      "Nama Kursus: Bengkel Pedagogi Pembelajaran Abad Ke-21\nTarikh: 22 Ogos 2026\nMasa: 9 pagi - 4 petang\nLokasi: Dewan Serbaguna\nKehadiran: 24/28\nKelebihan: aktiviti kumpulan, contoh kes, penceramah mahir, bahan digital\nKelemahan: terlampau ramai, soal jawab pendek, topik lanjutan diringkas",
    status: "Selesai",
    daysAgo: 18,
  },
  {
    namaKursus: "Latihan Aplikasi Google Workspace untuk Guru",
    tarikh: "5 Ogos 2026",
    masa: "08:30 pagi - 01:00 petang",
    lokasi: "Makmal Komputer 2, Al Amin Edu Oasis",
    kehadiran: "18/20",
    hadiran: 18,
    jumlah: 20,
    ringkasanAi:
      "Latihan separuh hari ini memberi pendedahan praktikal kepada guru mengenai penggunaan aplikasi Google Workspace seperti Google Classroom, Google Forms, Google Sheets dan Google Drive dalam pengurusan pentadbiran dan pengajaran harian. Seramai 18 peserta berjaya menguasai kemahiran asas dan pertengahan.",
    kelebihanAi:
      "- Pendekatan hands-on membolehkan pembelajaran terus praktikal\n- Setiap peserta dilengkapi akses komputer sepenuhnya\n- Penceramah memberi bimbingan satu-ke-satu semasa aktiviti\n- Nota langkah demi langkah disediakan untuk rujukan",
    kelemahanAi:
      "- Tahap kemahiran ICT peserta tidak seragam\n- Masa untuk Google Sheets terlalu ringkas\n- Beberapa peserta mengalami masalah log masuk akaun",
    cadanganAi:
      "- Adakan sesi asas dan lanjutan secara berasingan\n- Tambah modul khas untuk Google Sheets\n- Pastikan semua peserta mempunyai akaun Google disahkan sebelum kursus",
    pautanGform: "https://forms.gle/GoogleWorkspaceGuru2026",
    gambarUrls: ["/uploads/sample-2.png"],
    penyedia: "Encik Mohd Rizal bin Karim",
    rawInput:
      "Nama Kursus: Latihan Aplikasi Google Workspace untuk Guru\nTarikh: 5 Ogos 2026\nMasa: 8:30 pagi - 1:00 petang\nLokasi: Makmal Komputer 2\nKehadiran: 18/20\nKelebihan: hands-on, akses komputer, bimbingan satu-ke-satu, nota disediakan\nKelemahan: tahap kemahiran tak seragam, Sheets ringkas, masalah log masuk",
    status: "Selesai",
    daysAgo: 35,
  },
  {
    namaKursus: "Kursus Pengurusan Disiplin Positif",
    tarikh: "18 Julai 2026",
    masa: "09:00 pagi - 05:00 petang",
    lokasi: "Bilik Latihan Utama, Al Amin Edu Oasis",
    kehadiran: "22/22",
    hadiran: 22,
    jumlah: 22,
    ringkasanAi:
      "Kursus ini memberi kefahaman mendalam kepada guru mengenai pendekatan pengurusan disiplin positif berasaskan restorative practice. Seramai 22 peserta menghadiri kursus penuh sehari ini yang merangkumi teknik komunikasi empati, pengurusan konflik, dan pembinaan persekitaran bilik darjah yang kondusif.",
    kelebihanAi:
      "- Simulasi senario sebenar membolehkan peserta mengaplikasi teknik\n- Penceramah berkongsi pengalaman lapangan yang autentik\n- Bahan rujukan komprehensif merangkumi pelbagai kes\n- Sesi refleksi membantu pengukuhan pembelajaran",
    kelemahanAi:
      "- Beberapa simulasi memerlukan masa penyesuaian emosi\n- Topik penglibatan ibu bapa kurang diberi tumpuan",
    cadanganAi:
      "- Tambah modul khas penglibatan ibu bapa dan penjaga\n- Sediakan sesi kaunseling susulan untuk peserta\n- Kembangkan bahan rujukan dengan contoh konteks Malaysia",
    pautanGform: "https://forms.gle/DisiplinPositif2026",
    gambarUrls: ["/uploads/sample-4.png", "/uploads/sample-3.png"],
    penyedia: "Puan Siti Khadijah binti Ibrahim",
    rawInput:
      "Nama Kursus: Kursus Pengurusan Disiplin Positif\nTarikh: 18 Julai 2026\nMasa: 9 pagi - 5 petang\nLokasi: Bilik Latihan Utama\nKehadiran: 22/22\nKelebihan: simulasi senario, penceramah berpengalaman, bahan komprehensif, sesi refleksi\nKelemahan: simulasi perlu penyesuaian emosi, topik ibu bapa kurang",
    status: "Selesai",
    daysAgo: 52,
  },
  {
    namaKursus: "Bengkel Pembelajaran Berasaskan Projek (PBL)",
    tarikh: "30 Jun 2026",
    masa: "08:30 pagi - 04:30 petang",
    lokasi: "Dewan Serbaguna, Al Amin Edu Oasis",
    kehadiran: "20/25",
    hadiran: 20,
    jumlah: 25,
    ringkasanAi:
      "Bengkel ini memperkenalkan pendekatan Project-Based Learning (PBL) sebagai strategi pengajaran berkesan yang menggalakkan pembelajaran aktif dan berkaitan dengan dunia sebenar. Seramai 20 daripada 25 peserta guru menghadiri bengkel yang merangkumi reka bentuk projek, penilaian autentik dan pengurusan masa.",
    kelebihanAi:
      "- Reka bentuk projek contoh yang boleh diguna terus di sekolah\n- Aktiviti kolaboratif merangsang idea baharu\n- Penceramah berkongsi contoh kejayaan PBL di sekolah lain\n- Modul penilaian autentik disediakan dengan terperinci",
    kelemahanAi:
      "- Masa untuk merekabentuk projek sendiri agak terhad\n- Beberapa peserta kesukaran menghubungkait PBL dengan sukatan\n- Kekurangan contoh PBL untuk subjek teknikal",
    cadanganAi:
      "- Tambah masa kerja amali untuk reka bentuk projek\n- Sediakan contoh PBL mengikut subjek pengkhususan\n- Adakan sesi perkongsian selepas 3 bulan pelaksanaan",
    pautanGform: "https://forms.gle/PBLBengkel2026",
    gambarUrls: ["/uploads/sample-1.png", "/uploads/sample-2.png", "/uploads/sample-3.png"],
    penyedia: "Ustaz Ahmad Faizal bin Osman",
    rawInput:
      "Nama Kursus: Bengkel Pembelajaran Berasaskan Projek (PBL)\nTarikh: 30 Jun 2026\nMasa: 8:30 pagi - 4:30 petang\nLokasi: Dewan Serbaguna\nKehadiran: 20/25\nKelebihan: projek contoh boleh guna, kolaboratif, contoh kejayaan, modul penilaian\nKelemahan: masa reka projek terhad, kesukaran hubung PBL sukatan, kurang contoh subjek teknikal",
    status: "Draf",
    daysAgo: 70,
  },
  {
    namaKursus: "Latihan Kesedaran Kesihatan Mental Guru",
    tarikh: "12 Jun 2026",
    masa: "09:00 pagi - 01:00 petang",
    lokasi: "Bilik Latihan Utama, Al Amin Edu Oasis",
    kehadiran: "26/26",
    hadiran: 26,
    jumlah: 26,
    ringkasanAi:
      "Latihan separuh hari ini memberi tumpuan kepada kesedaran kesihatan mental dalam kalangan guru sebagai asas kepada profesion pendidikan yang sihat. Seramai 26 peserta menghadiri sesi yang merangkumi pengenalan tekanan kerja, teknik pengurusan stres, dan cara membina sokongan rakan sejawat.",
    kelebihanAi:
      "- Perkongsian oleh pakar kesihatan mental yang berwibawa\n- Aktiviti mindfullness praktikal yang boleh diguna harian\n- Bahan rujukan termasuk senarai sumber sokongan\n- Sesi terbuka memberi ruang peserta berkongsi pengalaman",
    kelemahanAi:
      "- Tema sensitif memerlukan pengendalian emosi yang teliti\n- Masa untuk sesi perkongsian peribadi agak terhad",
    cadanganAi:
      "- Adakan sesi susulan secara berkala (bulanan)\n- Sediakan saluran rujukan kaunselor profesional\n- Kembangkan modul untuk pelibatan keluarga guru",
    pautanGform: "https://forms.gle/KesihatanMentalGuru2026",
    gambarUrls: ["/uploads/sample-4.png"],
    penyedia: "Puan Nor Aishah binti Hassan",
    rawInput:
      "Nama Kursus: Latihan Kesedaran Kesihatan Mental Guru\nTarikh: 12 Jun 2026\nMasa: 9 pagi - 1 petang\nLokasi: Bilik Latihan Utama\nKehadiran: 26/26\nKelebihan: pakar berwibawa, aktiviti mindfullness, bahan rujukan, sesi terbuka\nKelemahan: tema sensitif, masa perkongsian terhad",
    status: "Selesai",
    daysAgo: 88,
  },
  {
    namaKursus: "Kursus Asas Pengurusan Kewangan Sekolah",
    tarikh: "20 Mei 2026",
    masa: "08:30 pagi - 05:00 petang",
    lokasi: "Makmal Komputer 1, Al Amin Edu Oasis",
    kehadiran: "12/15",
    hadiran: 12,
    jumlah: 15,
    ringkasanAi:
      "Kursus ini memberi kefahaman asas kepada guru kanan dan penyelaras mengenai pengurusan kewangan sekolah termasuk peruntukan, perbelanjaan, dan pelaporan kewanan. Seramai 12 daripada 15 peserta menghadiri kursus penuh sehari ini yang merangkumi prosedur kewangan, dokumentasi, dan amalan tadbir urus terbaik.",
    kelebihanAi:
      "- Penceramah dari bahagian kewangan yang berpengalaman\n- Latihan praktikal menggunakan sistem sebenar\n- Bahan rujukan prosedur disediakan dengan jelas\n- Sesi penyelesaian masalah berdasarkan kes sebenar",
    kelemahanAi:
      "- Topik cukai dan audit agak teknikal untuk peserta bukan kewangan\n- Masa latihan praktikal terhad kerana kekangan sistem\n- Beberapa peserta memerlukan bimbingan asas akaun",
    cadanganAi:
      "- Sediakan modul asas akaun untuk peserta bukan kewangan\n- Adakan latihan susulan dengan akses penuh sistem\n- Kembangkan topik cukai dan audit dalam kursus berasingan",
    pautanGform: "https://forms.gle/KewanganSekolah2026",
    gambarUrls: ["/uploads/sample-2.png", "/uploads/sample-1.png"],
    penyedia: "Encik Mohd Rizal bin Karim",
    rawInput:
      "Nama Kursus: Kursus Asas Pengurusan Kewangan Sekolah\nTarikh: 20 Mei 2026\nMasa: 8:30 pagi - 5 petang\nLokasi: Makmal Komputer 1\nKehadiran: 12/15\nKelebihan: penceramah kewangan, latihan praktikal sistem, bahan prosedur, sesi penyelesaian\nKelemahan: topik cukai teknikal, latihan praktikal terhad, peserta perlu bimbingan asas akaun",
    status: "Selesai",
    daysAgo: 111,
  },
];

async function main() {
  console.log("🗑️  Memadam laporan sedia ada...");
  await db.report.deleteMany({});

  const reportDir = "/home/z/my-project/public/reports";
  if (fs.existsSync(reportDir)) {
    for (const f of fs.readdirSync(reportDir)) {
      if (f.endsWith(".pdf")) fs.unlinkSync(`${reportDir}/${f}`);
    }
  }

  console.log(`🌱 Menyemai ${REPORTS.length} laporan contoh...`);
  for (const r of REPORTS) {
    const created = await db.report.create({
      data: {
        namaKursus: r.namaKursus,
        tarikh: r.tarikh,
        masa: r.masa,
        lokasi: r.lokasi,
        kehadiran: r.kehadiran,
        hadiran: r.hadiran,
        jumlah: r.jumlah,
        ringkasanAi: r.ringkasanAi,
        kelebihanAi: r.kelebihanAi,
        kelemahanAi: r.kelemahanAi,
        cadanganAi: r.cadanganAi,
        pautanGform: r.pautanGform,
        gambarUrls: JSON.stringify(r.gambarUrls),
        penyedia: r.penyedia,
        rawInput: r.rawInput,
        status: r.status,
        tarikhDijana: new Date(Date.now() - r.daysAgo * 24 * 60 * 60 * 1000),
      },
    });

    const reportData: ReportData = {
      id: created.id,
      namaKursus: created.namaKursus,
      tarikh: created.tarikh,
      masa: created.masa,
      lokasi: created.lokasi,
      kehadiran: created.kehadiran,
      hadiran: created.hadiran,
      jumlah: created.jumlah,
      ringkasanAi: created.ringkasanAi,
      kelebihanAi: created.kelebihanAi,
      kelemahanAi: created.kelemahanAi,
      cadanganAi: created.cadanganAi,
      pautanGform: created.pautanGform,
      gambarUrls: r.gambarUrls,
      urlPdf: "",
      status: created.status as "Selesai" | "Draf",
      penyedia: created.penyedia,
      rawInput: created.rawInput,
      tarikhDijana: created.tarikhDijana.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };

    try {
      const pdfUrl = await generateReportPdf(reportData);
      await db.report.update({ where: { id: created.id }, data: { urlPdf: pdfUrl } });
      console.log(`  ✓ ${r.namaKursus} → ${pdfUrl}`);
    } catch (err) {
      console.error(`  ✗ ${r.namaKursus}: ${err instanceof Error ? err.message : err}`);
    }
  }

  const total = await db.report.count();
  console.log(`\n✅ Selesai! ${total} laporan berjaya disemai.`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
