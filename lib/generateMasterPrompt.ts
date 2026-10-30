import { PaidScreeningData } from '@/types/screening';

export type MasterPromptSection =
  | 'all'
  | 'resume'
  | 'status_nutrisi'
  | 'meal_plan'
  | 'actionable_2weeks';

export interface PromptSectionMeta {
  id: MasterPromptSection;
  title: string;
  shortTitle: string;
  badge: string;
  description: string;
}

export const CLINIC_LOGO_URL =
  'https://cdn.scalev.com/uploads/1791437257/QF6f43VbRyKhXQscT8CtjA/1791437253324-Frame-32-Photoroom-1.webp';

export const DOCTOR_NAME = 'dr. Harys Maulana';
export const DOCTOR_TITLE = 'Dokter';

export const PROMPT_SECTIONS: PromptSectionMeta[] = [
  {
    id: 'all',
    title: 'Full Master Prompt AI (Lengkap 10 Bagian — Output HTML A4)',
    shortTitle: 'Full Prompt HTML',
    badge: 'Lengkap 10 Bagian',
    description:
      'Master prompt komprehensif mencakup seluruh 10 bagian formulir, evaluasi klinis lengkap (Resume, Status Nutrisi, Jawaban Dokter + 3 Pertanyaan Ortu, Meal Plan 7 Hari, Actionable Plan 14 Hari, Target, Monitoring, & Red Flags) dalam 1 dokumen HTML A4 konsisten berlogo resmi dan pengesahan dr. Harys Maulana.',
  },
  {
    id: 'resume',
    title: '1. Resume Kondisi Anak (Output HTML A4 Konsisten)',
    shortTitle: '1. Resume HTML',
    badge: 'Khusus Resume',
    description:
      'Menghasilkan dokumen HTML A4 khusus Resume Klinis Kondisi Anak, Evaluasi Pola Makan, Tekstur & Oral Motor, 5 Root Cause Prioritas, Kesimpulan Klinis, serta Jawaban 3 Pertanyaan Orang Tua oleh dr. Harys Maulana.',
  },
  {
    id: 'status_nutrisi',
    title: '2. Status Nutrisi & Pertumbuhan (Output HTML A4 Konsisten)',
    shortTitle: '2. Status Nutrisi HTML',
    badge: 'BB Aktual & WHO/IDAI',
    description:
      'Menghasilkan dokumen HTML A4 khusus Analisis Status Nutrisi & Pertumbuhan (3 Indeks WHO/Permenkes: BB/U, PB-TB/U, BB/PB-TB, Berat Badan Ideal, Kebutuhan Kalori RDA ANP IDAI, Koreksi Usia Prematur, Evaluasi 24-Hr Food Recall, & Rekomendasi Gizi) oleh dr. Harys Maulana.',
  },
  {
    id: 'meal_plan',
    title: '3. Meal Plan 7 Hari (Output HTML A4 Konsisten)',
    shortTitle: '3. Meal Plan HTML',
    badge: 'Menu 7 Hari & Porsi',
    description:
      'Menghasilkan dokumen HTML A4 khusus Tabel Meal Plan 7 Hari lengkap (Sarapan, Snack Pagi, Makan Siang, Snack Sore, Makan Malam + Estimasi Porsi & Kalori), Strategi Food Chaining dari Food Repertoire anak, serta Panduan Keamanan Alergi & Tekstur oleh dr. Harys Maulana.',
  },
  {
    id: 'actionable_2weeks',
    title: '4. Actionable Plan 2 Weeks / 14 Hari (Output HTML A4 Konsisten)',
    shortTitle: '4. 2 Weeks Plan HTML',
    badge: 'Protokol 14 Hari',
    description:
      'Menghasilkan dokumen HTML A4 khusus Protokol Actionable Plan 14 Hari (2 Weeks) berbasis IDAI Feeding Rules, Desensitisasi Sensorik & Oral Motor Berjenjang, Tabel Monitoring Harian Bunda, Target 14 Hari, & Red Flags oleh dr. Harys Maulana.',
  },
];

/**
 * Helper to get clean value or fallback if not filled
 */
function v(value: string | undefined | null, fallback = '-'): string {
  if (!value || !value.trim()) return fallback;
  return value.trim();
}

/**
 * Format food repertoire row: Mau vs Tidak Mau
 */
function formatRepertoireCategory(
  repertoire: PaidScreeningData['repertoire'] | undefined,
  kategori: string
): string {
  if (!repertoire || !Array.isArray(repertoire)) return 'Belum diisi';
  const row = repertoire.find(
    (r) => r.kategori.toLowerCase() === kategori.toLowerCase()
  );
  if (!row) return 'Belum diisi';
  const mau = v(row.makananMau, '');
  const tidakMau = v(row.makananTidakMau, '');

  if (!mau && !tidakMau) return 'Belum diisi';
  if (mau && tidakMau) return `MAU: ${mau} | TIDAK MAU: ${tidakMau}`;
  if (mau) return `MAU: ${mau} | TIDAK MAU: -`;
  return `MAU: - | TIDAK MAU: ${tidakMau}`;
}

/**
 * Format recall meal item (Menu & Porsi)
 */
function formatRecall(menu?: string, porsi?: string): string {
  const m = v(menu, '');
  const p = v(porsi, '');
  if (!m && !p) return 'Tidak tercatat / kosong';
  if (m && p) return `Menu: ${m} (Porsi yang dihabiskan: ${p})`;
  if (m) return `Menu: ${m}`;
  return `Porsi: ${p}`;
}

/**
 * Check if item is included in array
 */
function checkItem(list: string[] | undefined, item: string): string {
  if (!list || !Array.isArray(list)) return 'Tidak';
  return list.some((x) => x.toLowerCase() === item.toLowerCase()) ? 'Ya' : 'Tidak';
}

/**
 * Shared Biodata Anak & Nama Orang Tua
 */
function formatBasicBiodata(
  data: Partial<PaidScreeningData>,
  calculatedAge?: string
): string {
  const age = v(calculatedAge, '') || v(data.usiaTerkalkulasi, '-');
  return `### BIODATA PASIEN & ORANG TUA
- Nama Lengkap Anak: ${v(data.namaLengkapAnak)}
- Tanggal Lahir (DOB): ${v(data.dob)}
- Usia Anak Saat Ini: ${age}
- Jenis Kelamin: ${v(data.jenisKelamin)}
- Berat Badan Aktual (BB Sekarang): ${v(data.bbSekarang)} kg
- Tinggi / Panjang Badan Aktual (TB/PB Sekarang): ${v(data.tbPB)} cm
- Waktu / Tanggal Pengukuran Terakhir: ${v(data.tanggalUkur)}
- Nama Ibu / Bunda: ${v(data.namaIbu)} (WA: ${v(data.waIbu)})
- Nama Ayah: ${v(data.namaAyah)} (WA: ${v(data.waAyah)})
- Domisili: ${v(data.domisili)}`;
}

/**
 * Shared Mandatory HTML + CSS Design System Specification
 * Ensures 100% identical visual design, typography, margins, layout, mandatory logo,
 * and mandatory doctor signature (dr. Harys Maulana - Dokter) across ALL 5 prompts.
 */
function formatConsistentHtmlDesignSpec(documentTitle: string, documentSubtitle: string): string {
  return `---

# SPESIFIKASI DESAIN, STYLE, UKURAN FONT, MARGIN, & TATA LETAK HTML WAJIB (100% KONSISTEN)

⚠️ **INSTRUKSI FORMAT OUTPUT MUTLAK**:
1. **OUTPUT WAJIB BERUPA KODE HTML5 LENGKAP (\`<!DOCTYPE html><html lang="id">...</html>\`)** yang dibungkus dalam satu blok kode \`\`\`html ... \`\`\`.
2. **JANGAN** mengeluarkan teks biasa atau Markdown di luar blok HTML. Seluruh analisis harus berada di dalam struktur HTML yang rapi, utuh, dan siap cetak (Print-to-PDF A4).
3. **DESAIN HARUS 100% KONSISTEN** mengikuti spesifikasi ukuran kertas, margin, tipografi, warna, tata letak, **Logo Resmi di bagian atas**, dan **Pengesahan Dokter di bagian bawah** berikut ini:

### A. SPESIFIKASI KERTAS, MARGIN, & LAYOUT HALAMAN (A4 PORTRAIT)
- **Ukuran Kertas**: A4 Portrait (\`width: 210mm; min-height: 297mm;\`).
- **Margin Cetak (\`@page\`)**: \`margin: 18mm 16mm 20mm 16mm;\` (Atas \`18mm\`, Kanan \`16mm\`, Bawah \`20mm\`, Kiri \`16mm\`).
- **Container Utama (\`.a4-page\`)**:
  - Lebar maksimal \`210mm\`, berada di tengah layar (\`margin: 20px auto\`), background \`#FFFFFF\`, padding dalam \`20mm 18mm\`, \`box-sizing: border-box\`, \`border: 1px solid #CBD5E1\`, \`border-radius: 10px\`, \`box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08)\`.
  - Saat mode cetak (\`@media print\`): \`margin: 0; padding: 0; border: none; box-shadow: none; width: 100%;\`.
- **Anti-Potong Halaman (Page Break Control)**:
  - Setiap kartu (\`.card\`), kotak peringatan (\`.alert-box\`), baris tabel (\`tr\`), dan blok tanda tangan (\`.doctor-signature-footer\`) WAJIB memiliki \`page-break-inside: avoid; break-inside: avoid;\`.

### B. SPESIFIKASI TIPOGRAFI & UKURAN FONT
- **Font Family**: \`'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif\` (Import dari Google Fonts di \`<head>\`).
- **Ukuran & Ketebalan Font**:
  - **Judul Dokumen Utama (\`.doc-title\`)**: \`15pt\` (\`20px\`), \`font-weight: 800\`, \`color: #0F172A\`, \`letter-spacing: -0.02em\`, \`line-height: 1.25\`.
  - **Sub-judul Kop (\`.doc-subtitle\`)**: \`9.5pt\` (\`12.5px\`), \`font-weight: 600\`, \`color: #475569\`.
  - **Judul Bagian / Section (\`h2.section-heading\`)**: \`11.5pt\` (\`15.3px\`), \`font-weight: 800\`, \`text-transform: uppercase\`, \`letter-spacing: 0.04em\`, \`color: #0F172A\`, \`background: #F8FAFC\`, \`border-left: 5px solid #0F172A\`, \`padding: 8px 12px\`, \`margin: 18px 0 10px 0\`, \`border-radius: 0 8px 8px 0\`.
  - **Sub-bagian (\`h3.sub-heading\`)**: \`10.5pt\` (\`14px\`), \`font-weight: 700\`, \`color: #1E293B\`, \`margin: 12px 0 6px 0\`.
  - **Teks Isi / Paragraf & Bullet List (\`p\`, \`li\`)**: \`9.8pt\` (\`13px\`), \`line-height: 1.6\`, \`color: #334155\`, \`margin: 0 0 6px 0\`.
  - **Tabel Klinis (\`table\`, \`th\`, \`td\`)**:
    - Header Tabel (\`th\`): \`9pt\` (\`12px\`), \`font-weight: 700\`, \`text-transform: uppercase\`, \`background: #0F172A\`, \`color: #FFFFFF\`, \`padding: 8px 10px\`, \`border: 1px solid #0F172A\`.
    - Sel Tabel (\`td\`): \`9.2pt\` (\`12.2px\`), \`line-height: 1.5\`, \`color: #1E293B\`, \`padding: 8px 10px\`, \`border: 1px solid #CBD5E1\`, \`vertical-align: top\`.
    - Baris Genap (\`tr:nth-child(even) td\`): \`background: #F8FAFC\`.
  - **Badge & Label (\`.badge\`)**: \`8.5pt\` (\`11px\`), \`font-weight: 800\`, \`padding: 3px 9px\`, \`border-radius: 999px\`, \`text-transform: uppercase\`.

### C. ELEMEN WAJIB DI ATAS (LOGO RESMI) & DI BAWAH (PENGESAHAN DOKTER)
1. **LOGO RESMI WAJIB DI KOP ATAS**:
   - Wajib menggunakan tag \`<img>\` dengan URL persis:
     \`${CLINIC_LOGO_URL}\`
   - Style logo: \`height: 54px; width: auto; object-fit: contain; display: block;\`
2. **NAMA DOKTER WAJIB DI BAGIAN BAWAH (FOOTER PENGESAHAN)**:
   - Di bagian bawah dokumen (\`.doctor-signature-footer\`), wajib mencantumkan pengesahan medis dengan nama:
     **\`${DOCTOR_NAME}\`**
     dan di bawah namanya tertulis jabatan:
     **\`${DOCTOR_TITLE}\`**

### D. TEMPLATE STRUKTUR HTML & CSS BAKU (WAJIB DIGUNAKAN PERSIS SEPERTI INI)

Gunakan struktur HTML dan \`<style>\` CSS berikut secara konsisten sebagai kerangka dokumen Anda:

\`\`\`html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${documentTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 18mm 16mm 20mm 16mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      background-color: #F1F5F9;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      font-size: 9.8pt;
      line-height: 1.6;
      color: #334155;
    }
    .a4-page {
      max-width: 210mm;
      min-height: 297mm;
      margin: 20px auto;
      background-color: #FFFFFF;
      padding: 20mm 18mm;
      border: 1px solid #CBD5E1;
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
    }
    @media print {
      body {
        background-color: #FFFFFF;
      }
      .a4-page {
        margin: 0;
        padding: 0;
        border: none;
        border-radius: 0;
        box-shadow: none;
        width: 100%;
        max-width: 100%;
      }
    }
    /* KOP DOKUMEN & LOGO WAJIB */
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      border-bottom: 2.5px solid #0F172A;
      padding-bottom: 14px;
      margin-bottom: 16px;
    }
    .brand-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .clinic-logo {
      height: 54px;
      width: auto;
      object-fit: contain;
      display: block;
    }
    .doc-title {
      font-size: 15pt;
      font-weight: 800;
      color: #0F172A;
      margin: 0;
      line-height: 1.25;
      letter-spacing: -0.02em;
    }
    .doc-subtitle {
      font-size: 9.2pt;
      font-weight: 600;
      color: #475569;
      margin: 3px 0 0 0;
    }
    .doc-meta-right {
      text-align: right;
      font-size: 8.8pt;
      color: #475569;
      flex-shrink: 0;
    }
    .badge-lime {
      display: inline-block;
      background-color: #CCFF00;
      color: #0F172A;
      font-size: 8.5pt;
      font-weight: 800;
      padding: 3px 10px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border: 1px solid #0F172A;
      margin-bottom: 4px;
    }
    /* GRID IDENTITAS PASIEN */
    .patient-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      background-color: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 18px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .patient-item-label {
      font-size: 7.8pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748B;
      display: block;
      margin-bottom: 2px;
    }
    .patient-item-value {
      font-size: 9.5pt;
      font-weight: 800;
      color: #0F172A;
    }
    /* HEADINGS & CARDS */
    h2.section-heading {
      font-size: 11.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #0F172A;
      background-color: #F8FAFC;
      border-left: 5px solid #0F172A;
      padding: 8px 12px;
      margin: 18px 0 10px 0;
      border-radius: 0 8px 8px 0;
      page-break-after: avoid;
    }
    h3.sub-heading {
      font-size: 10.2pt;
      font-weight: 700;
      color: #0F172A;
      margin: 12px 0 6px 0;
    }
    .card {
      background-color: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 12px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .card-muted {
      background-color: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 12px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .card-clinical {
      background-color: #EEF2FF;
      border: 1px solid #C7D2FE;
      color: #1E1B4B;
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 12px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .alert-redflag {
      background-color: #FFF1F2;
      border: 1.5px solid #FECDD3;
      border-left: 5px solid #E11D48;
      color: #881337;
      border-radius: 10px;
      padding: 12px 14px;
      margin-top: 14px;
      margin-bottom: 14px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    ul, ol {
      margin: 4px 0 8px 0;
      padding-left: 20px;
    }
    li {
      margin-bottom: 4px;
    }
    /* TABEL KLINIS */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 14px 0;
      font-size: 9.2pt;
    }
    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    th {
      background-color: #0F172A;
      color: #FFFFFF;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 8.5pt;
      letter-spacing: 0.03em;
      padding: 8px 10px;
      border: 1px solid #0F172A;
      text-align: left;
    }
    td {
      padding: 8px 10px;
      border: 1px solid #CBD5E1;
      color: #1E293B;
      vertical-align: top;
      line-height: 1.5;
    }
    tr:nth-child(even) td {
      background-color: #F8FAFC;
    }
    /* FOOTER PENGESAHAN DOKTER WAJIB */
    .doctor-signature-footer {
      margin-top: 28px;
      padding-top: 16px;
      border-top: 2px solid #0F172A;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 20px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .footer-note {
      font-size: 8.5pt;
      color: #64748B;
      max-width: 60%;
      line-height: 1.5;
    }
    .doctor-sign-box {
      text-align: right;
      min-width: 200px;
    }
    .sign-label {
      font-size: 8.2pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748B;
      letter-spacing: 0.04em;
      display: block;
      margin-bottom: 28px;
    }
    .doctor-name {
      font-size: 11pt;
      font-weight: 800;
      color: #0F172A;
      border-bottom: 1.5px solid #0F172A;
      padding-bottom: 2px;
      display: inline-block;
    }
    .doctor-role {
      font-size: 9pt;
      font-weight: 700;
      color: #475569;
      display: block;
      margin-top: 3px;
    }
  </style>
</head>
<body>
  <div class="a4-page">
    <!-- 1. HEADER / KOP SURAT WAJIB DENGAN LOGO -->
    <header class="doc-header">
      <div class="brand-left">
        <img
          src="${CLINIC_LOGO_URL}"
          alt="Logo Tumbuh Kembang Anak"
          class="clinic-logo"
        />
        <div>
          <h1 class="doc-title">${documentTitle}</h1>
          <p class="doc-subtitle">${documentSubtitle}</p>
        </div>
      </div>
      <div class="doc-meta-right">
        <span class="badge-lime">Evaluasi Medis Anak</span>
        <div>Dokumen Rekam Medis &amp; Edukasi Klinis</div>
      </div>
    </header>

    <!-- 2. IDENTITAS PASIEN (4 KOLOM) -->
    <!-- Isi dengan data aktual pasien dari Sumber Data -->

    <!-- 3. KONTEN ANALISIS SESUAI INSTRUKSI BAGIAN -->
    <!-- Gunakan <h2 class="section-heading">, <div class="card">, <table>, dll. -->

    <!-- 4. FOOTER PENGESAHAN DOKTER WAJIB DI BAGIAN BAWAH -->
    <footer class="doctor-signature-footer">
      <div class="footer-note">
        <strong>Catatan Klinis &amp; Kerahasiaan Medis:</strong><br />
        Dokumen evaluasi tumbuh kembang, nutrisi, dan feeding rules ini disusun secara individual berdasarkan data asesmen anak serta mengacu pada pedoman klinis IDAI &amp; standar pertumbuhan WHO.
      </div>
      <div class="doctor-sign-box">
        <span class="sign-label">Diverifikasi &amp; Dianalisis Oleh,</span>
        <span class="doctor-name">${DOCTOR_NAME}</span>
        <span class="doctor-role">${DOCTOR_TITLE}</span>
      </div>
    </footer>
  </div>
</body>
</html>
\`\`\`
`;
}

// ============================================================================
// 1. FULL MASTER PROMPT (LENGKAP 10 BAGIAN — OUTPUT HTML A4 KONSISTEN)
// ============================================================================
export function generateMasterPrompt(
  data: Partial<PaidScreeningData>,
  calculatedAge?: string
): string {
  const age = v(calculatedAge, '') || v(data.usiaTerkalkulasi, '-');

  return `# MASTER PROMPT — FULL ASSESSMENT (LENGKAP 10 BAGIAN)
## AI PEDIATRIC FEEDING, NUTRITION & GROWTH ASSESSMENT

## PERAN & KEAHLIAN KLINIS
Anda adalah **${DOCTOR_NAME} (${DOCTOR_TITLE})**, dokter yang berfokus pada **Tumbuh Kembang Anak, Nutrisi Pediatrik, Feeding Problem, dan Feeding Behavior** berdasarkan keilmuan:
1. **Standar Antropometri Anak WHO 2006 & Permenkes RI No. 2 Tahun 2020** (3 Indeks: BB/U, PB/U atau TB/U, dan BB/PB atau BB/TB).
2. **Rekomendasi Asuhan Nutrisi Pediatrik (ANP) IDAI** (Perhitungan Berat Badan Ideal, Kebutuhan Kalori Harian berdasarkan RDA usia tinggi, dan koreksi usia bila lahir prematur <37 minggu).
3. **Rekomendasi Praktik Pemberian Makan Berbasis Bukti IDAI (Feeding Rules IDAI)** (Jadwal, Lingkungan, Prosedur) serta tahapan perkembangan oral-motor, sensori, dan *food chaining*.

Tugas Anda adalah menganalisis secara menyeluruh hubungan kausalitas antara:
**Pertumbuhan (BB/TB) → Kecukupan Asupan Kalori & Protein → Pola Makan & Susu (Milk Displacement) → Feeding Behavior → Tekstur & Oral Motor → Sensory Acceptance → Food Repertoire → Lingkungan Makan → Riwayat Medis.**

---

# SUMBER DATA LENGKAP PASIEN (10 BAGIAN)

### BAGIAN 1 — DATA ORANG TUA
- Nama Ayah: ${v(data.namaAyah)}
- No. WhatsApp Ayah: ${v(data.waAyah)}
- Nama Ibu / Bunda: ${v(data.namaIbu)}
- No. WhatsApp Ibu: ${v(data.waIbu)}
- Email: ${v(data.email)}
- Domisili: ${v(data.domisili)}

### BAGIAN 2 — DATA ANAK & RIWAYAT KELAHIRAN
- Nama Lengkap Anak: ${v(data.namaLengkapAnak)}
- Tanggal Lahir (DOB): ${v(data.dob)}
- Usia Anak Saat Ini: ${age}
- Jenis Kelamin: ${v(data.jenisKelamin)}
- Berat Badan Sekarang (BB Aktual): ${v(data.bbSekarang)} kg
- Tinggi / Panjang Badan Sekarang (TB/PB Aktual): ${v(data.tbPB)} cm
- Waktu / Tanggal Pengukuran: ${v(data.tanggalUkur)}
- Berat Badan Lahir (BB Lahir): ${v(data.bbLahir)}
- Usia Gestasi Saat Lahir: ${v(data.usiaGestasi)}
- Riwayat Perawatan NICU: ${v(data.riwayatNICU)}
- Alergi / Intoleransi Makanan: ${v(data.alergiIntoleransi)}
- Riwayat Penyakit: ${v(data.riwayatPenyakit)}
- Obat / Suplemen yang Sedang Dikonsumsi: ${v(data.obatSuplemen)}

### BAGIAN 3 — RIWAYAT MAKAN & FEEDING RULES
- Jenis Susu Saat Ini: ${v(data.jenisSusu)}
- Jumlah Susu Per Hari: ${v(data.jumlahSusuPerHari)}
- Frekuensi Makan Utama: ${v(data.frekuensiMakanUtama)}
- Frekuensi Snack / Camilan: ${v(data.frekuensiSnack)}
- Durasi Setiap Sesi Makan: ${v(data.durasiMakan)}
- Lokasi Makan Anak: ${v(data.lokasiMakan)}
- Pemberi Makan / Pengasuh Utama: ${v(data.pemberiMakan)}
- Keteraturan Jadwal Makan Harian: ${v(data.jadwalMakanHarian)}
- Apakah Makan Sambil Gadget / TV?: ${v(data.makanSambilGadget)}
- Apakah Makan Sambil Jalan-jalan / Digendong?: ${v(data.makanSambilJalan)}
- Apakah Sering Dibujuk / Dipaksa Makan?: ${v(data.seringDibujukDipaksa)}

### BAGIAN 4 — FOOD REPERTOIRE (MAKANAN YANG DITERIMA VS DITOLAK)
- Karbohidrat: ${formatRepertoireCategory(data.repertoire, 'Karbohidrat')}
- Protein Hewani: ${formatRepertoireCategory(data.repertoire, 'Protein hewani')}
- Protein Nabati: ${formatRepertoireCategory(data.repertoire, 'Protein nabati')}
- Sayur: ${formatRepertoireCategory(data.repertoire, 'Sayur')}
- Buah: ${formatRepertoireCategory(data.repertoire, 'Buah')}
- Dairy / Produk Olahan Susu: ${formatRepertoireCategory(data.repertoire, 'Dairy')}
- Snack / Camilan: ${formatRepertoireCategory(data.repertoire, 'Snack')}
- Jumlah Total Jenis Makanan yang Masih Diterima Anak: ${v(data.jumlahJenisDiterima)}

### BAGIAN 5 — TEKSTUR & KEMAMPUAN ORAL MOTOR
- Tekstur yang Bisa Diterima Saat Ini: ${data.teksturDiterima && data.teksturDiterima.length > 0 ? data.teksturDiterima.join(', ') : '-'}
- Apakah Bisa Mengunyah Makanan?: ${v(data.bisaMengunyah)}
- Apakah Sering Gagging (Mual / Mau Muntah)?: ${v(data.seringGagging)}
- Apakah Sering Batuk Saat Makan?: ${v(data.seringBatuk)}
- Apakah Pernah Tersedak?: ${v(data.pernahTersedak)}
- Apakah Sering Melepeh Makanan?: ${v(data.melepehMakanan)}
- Apakah Makanan Lama di Mulut (Mengemut)?: ${v(data.lamaDiMulut)}
- Apakah Sulit Naik Tekstur?: ${v(data.sulitNaikTekstur)}
- Apakah Hanya Mau Tekstur Tertentu?: ${v(data.hanyaMauTeksturTertentu)}

### BAGIAN 6 — PERILAKU SAAT MAKAN (FEEDING BEHAVIOR)
- Daftar Perilaku Teramati: ${data.perilakuMakan && data.perilakuMakan.length > 0 ? data.perilakuMakan.join(', ') : '-'}
  * Menutup mulut rapat (GTM): ${checkItem(data.perilakuMakan, 'Menutup mulut')}
  * Memalingkan wajah: ${checkItem(data.perilakuMakan, 'Memalingkan wajah')}
  * Menangis / tantrum saat makan: ${checkItem(data.perilakuMakan, 'Menangis')}
  * Kabur dari meja makan: ${checkItem(data.perilakuMakan, 'Kabur dari meja makan')}
  * Melempar makanan: ${checkItem(data.perilakuMakan, 'Melempar makanan')}
  * Memukul / menolak pengasuh: ${checkItem(data.perilakuMakan, 'Memukul/menolak pengasuh')}
  * Harus disuapi: ${checkItem(data.perilakuMakan, 'Harus disuapi')}
  * Harus sambil gadget: ${checkItem(data.perilakuMakan, 'Harus sambil gadget')}
  * Harus sambil bermain: ${checkItem(data.perilakuMakan, 'Harus sambil bermain')}
  * Hanya mau makan dengan orang tertentu: ${checkItem(data.perilakuMakan, 'Hanya mau makan dengan orang tertentu')}
  * Sangat lama menghabiskan makanan (>30 menit): ${checkItem(data.perilakuMakan, 'Sangat lama menghabiskan makanan')}

### BAGIAN 7 — FAKTOR SENSORIK PENOLAKAN (SENSORY ACCEPTANCE)
- Faktor Sensorik yang Berpengaruh: ${data.alasanSensorik && data.alasanSensorik.length > 0 ? data.alasanSensorik.join(', ') : '-'}
  * Tekstur: ${checkItem(data.alasanSensorik, 'Tekstur')} | Warna: ${checkItem(data.alasanSensorik, 'Warna')} | Aroma: ${checkItem(data.alasanSensorik, 'Aroma')} | Rasa: ${checkItem(data.alasanSensorik, 'Rasa')}
  * Suhu: ${checkItem(data.alasanSensorik, 'Suhu')} | Bentuk: ${checkItem(data.alasanSensorik, 'Bentuk')} | Campuran makanan: ${checkItem(data.alasanSensorik, 'Campuran makanan')} | Takut makanan baru (Food Neophobia): ${checkItem(data.alasanSensorik, 'Takut makanan baru')}

### BAGIAN 8 — 24-HOUR FOOD RECALL (ASUPAN RIIL KEMARIN)
- Bangun Tidur (ASI / Susu): ${v(data.foodRecall?.bangunSusu)}
- Sarapan Pagi: ${formatRecall(data.foodRecall?.sarapanMenu, data.foodRecall?.sarapanPorsi)}
- Snack Pagi: ${formatRecall(data.foodRecall?.snackPagiMenu, data.foodRecall?.snackPagiPorsi)}
- Makan Siang: ${formatRecall(data.foodRecall?.makanSiangMenu, data.foodRecall?.makanSiangPorsi)}
- Snack Sore: ${formatRecall(data.foodRecall?.snackSoreMenu, data.foodRecall?.snackSorePorsi)}
- Makan Malam: ${formatRecall(data.foodRecall?.makanMalamMenu, data.foodRecall?.makanMalamPorsi)}
- Susu / ASI Sebelum Tidur: ${v(data.foodRecall?.susuSebelumTidur)}

### BAGIAN 9 — RIWAYAT PERTUMBUHAN & BERAT BADAN
- BB 3 Bulan Lalu: ${v(data.riwayatBB?.bb3BulanLalu)}
- BB 2 Bulan Lalu: ${v(data.riwayatBB?.bb2BulanLalu)}
- BB 1 Bulan Lalu: ${v(data.riwayatBB?.bb1BulanLalu)}
- BB Sekarang: ${v(data.riwayatBB?.bbSekarang || data.bbSekarang)} kg
- Apakah BB Stagnan?: ${v(data.riwayatBB?.bbStagnan)}
- Pernah Mengalami Penurunan BB?: ${v(data.riwayatBB?.pernahTurunBB)}
- Target Kenaikan BB Orang Tua: ${v(data.riwayatBB?.targetBB)}

### BAGIAN 10 — KELUHAN UTAMA & 3 PERTANYAAN ORANG TUA UNTUK DOKTER
- Masalah Utama yang Dipilih: ${data.keluhanUtama && data.keluhanUtama.length > 0 ? data.keluhanUtama.join(', ') : '-'}
- Keluhan Lainnya: ${v(data.keluhanLainnya)}
- Cerita Kondisi Makan Anak Saat Ini: ${v(data.ceritaKondisi)}
- **3 Pertanyaan Spesifik Orang Tua untuk Dijawab Dokter**:
  1. Pertanyaan 1: ${v(data.pertanyaanDokter1, '(Tidak ada pertanyaan tambahan)')}
  2. Pertanyaan 2: ${v(data.pertanyaanDokter2, '(Tidak ada pertanyaan tambahan)')}
  3. Pertanyaan 3: ${v(data.pertanyaanDokter3, '(Tidak ada pertanyaan tambahan)')}

---

# STRUKTUR WAJIB DI DALAM DOKUMEN HTML FULL ASSESSMENT

Susun seluruh hasil evaluasi secara lengkap dan komprehensif di dalam satu dokumen HTML A4 dengan 7 Bagian Utama berikut:

1. **BAGIAN 1: RESUME KLINIS KONDISI ANAK**
   - Ringkasan profil & riwayat lahir/alergi.
   - Evaluasi aturan makan (Feeding Rules), kemampuan tekstur & oral motor, perilaku makan, dan pemicu sensorik.
   - **5 Masalah Utama (Root Cause Prioritas 1–5)** menggunakan kerangka *Problem → Possible Contributing Factors → Priority*.
   - **Kesimpulan Klinis Integratif** (1 paragraf yang merangkai pertumbuhan, asupan, oral motor, dan lingkungan makan).

2. **BAGIAN 2: EVALUASI STATUS NUTRISI & PERTUMBUHAN (STANDAR WHO, PERMENKES & ANP IDAI)**
   - Tabel evaluasi 3 Indeks Antropometri WHO/Permenkes berdasarkan **BB Aktual (${v(data.bbSekarang)} kg)**, **TB/PB (${v(data.tbPB)} cm)**, dan **Usia (${age})**:
     * **BB/U** (Berat Badan menurut Usia)
     * **PB/U atau TB/U** (Panjang/Tinggi Badan menurut Usia)
     * **BB/PB atau BB/TB** (Status Gizi Akut, Berat Badan Ideal / BBI dalam kg, dan Estimasi Kebutuhan Kalori Harian RDA kkal/hari).
   - Evaluasi **Usia Koreksi** apabila lahir prematur (<37 minggu) dan berusia <24 bulan.
   - Analisis **24-Hour Food Recall**, kecukupan makronutrien (Karbohidrat, Protein Hewani, Lemak Tambahan), mikronutrien (Fe, Zinc, Vitamin D), serta evaluasi **Milk Displacement** (apakah volume susu menekan lapar makan utama).

3. **BAGIAN 3: PENJELASAN & JAWABAN DOKTER (${DOCTOR_NAME})**
   - Diawali sapaan hangat: *"Ayah dan Bunda dari ananda ${v(data.namaLengkapAnak)}, dari hasil asesmen lengkap yang telah saya pelajari..."*
   - Penjelasan klinis yang mudah dipahami: (a) Apa yang sebenarnya sedang terjadi, (b) 3 Prioritas utama perbaikan, (c) Mengapa masalah ini terjadi, (d) Apa yang harus mulai dilakukan & dihentikan di rumah.
   - **Jawaban Khusus untuk 3 Pertanyaan Orang Tua**: Jawab satu per satu Pertanyaan 1, Pertanyaan 2, dan Pertanyaan 3 secara spesifik, empatik, dan aplikatif.

4. **BAGIAN 4: MEAL PLAN 7 HARI REALISTIS (TABEL LENGKAP HARI 1 – HARI 7)**
   - Tabel 7 hari mencakup: **Hari | Sarapan | Snack Pagi | Makan Siang | Snack Sore | Makan Malam | Aturan Susu & Target Porsi**.
   - Setiap menu wajib mencantumkan **Nama Menu Lokal Indonesia + Estimasi Takaran Porsi + Tekstur** yang bebas dari alergen anak (${v(data.alergiIntoleransi)}), menerapkan *Food Chaining* dari makanan yang sudah disukai anak menuju variasi baru dengan densitas energi & protein hewani adekuat.

5. **BAGIAN 5: ACTIONABLE PLAN 2 WEEKS / 14 HARI (PROTOKOL HARIAN)**
   - Tabel protokol terstruktur Hari 1 s.d Hari 14:
     * **Hari 1–3**: *Reset Feeding Environment* (Disiplin jadwal lapar-kenyang 2–3 jam, kursi makan tetap, 0% gadget/TV, durasi maksimal 30 menit).
     * **Hari 4–6**: *Improve Meal Structure & Milk Regulation* (Penataan porsi kecil padat energi, batas susu harian, tidak mengganti makan utama yang ditolak dengan susu/biskuit).
     * **Hari 7**: *Evaluasi Minggu 1*.
     * **Hari 8–10**: *Graduated Food & Sensory Exposure* (Pendekatan tanpa paksaan: *Lihat → Sentuh → Cium → Cicip → Makan*).
     * **Hari 11–13**: *Oral-Motor & Texture / Self-Feeding Progression*.
     * **Hari 14**: *Evaluasi Komparatif Hari 1 vs Hari 14*.

6. **BAGIAN 6: TARGET 14 HARI & TABEL CHECKLIST MONITORING HARIAN BUNDA**
   - Target spesifik pada perilaku makan, variasi repertoire, adaptasi tekstur, dan tren pertumbuhan.
   - Tabel Checklist Monitoring Harian (10 indikator harian yang bisa dicentang orang tua).

7. **BAGIAN 7: RED FLAGS (TANDA BAHAYA MEDIS)**
   - Kotak peringatan khusus (\`.alert-redflag\`) berisi tanda bahaya yang mewajibkan evaluasi medis tatap muka segera.

${formatConsistentHtmlDesignSpec(
  'LAPORAN LENGKAP ASESMEN TUMBUH KEMBANG, NUTRISI & MASALAH MAKAN ANAK',
  'Evaluasi Komprehensif 10 Bagian · Standar WHO, Permenkes RI & Rekomendasi IDAI'
)}`;
}

export const generateFullMasterPrompt = generateMasterPrompt;

// ============================================================================
// 2. PROMPT KHUSUS BAGIAN 1: RESUME KONDISI ANAK (OUTPUT HTML A4 KONSISTEN)
// ============================================================================
export function generateResumePrompt(
  data: Partial<PaidScreeningData>,
  calculatedAge?: string
): string {
  const biodata = formatBasicBiodata(data, calculatedAge);

  return `# MASTER PROMPT — KHUSUS BAGIAN 1: RESUME KONDISI ANAK (OUTPUT HTML A4)
## AI PEDIATRIC FEEDING & CLINICAL RESUME

## PERAN & TUGAS
Anda adalah **${DOCTOR_NAME} (${DOCTOR_TITLE})**, dokter yang berfokus pada **Tumbuh Kembang Anak, Nutrisi Anak, Feeding Problem, dan Feeding Behavior**.

Tugas Anda adalah menganalisis data pasien dan **HANYA MENGHASILKAN DOKUMEN HTML A4: RESUME KLINIS KONDISI ANAK & JAWABAN DOKTER**.

⚠️ **BATASAN OUTPUT KETAT**:
- Output Anda **WAJIB BERUPA KODE HTML5 LENGKAP (\`<!DOCTYPE html>...\`)** sesuai spesifikasi desain konsisten di bawah.
- Fokus **HANYA pada Resume Kondisi Anak, Analisis 5 Masalah Utama (Root Cause), Kesimpulan Klinis, dan Jawaban 3 Pertanyaan Orang Tua**.
- **JANGAN** membuatkan Tabel Meal Plan 7 Hari atau Tabel Actionable Plan 14 Hari di dokumen ini.

---

# SUMBER DATA PASIEN (RESUME KONDISI ANAK)

${biodata}

### RIWAYAT MEDIS, KELAHIRAN & ALERGI
- Berat Badan Lahir (BB Lahir): ${v(data.bbLahir)}
- Usia Gestasi Saat Lahir: ${v(data.usiaGestasi)}
- Riwayat Perawatan NICU: ${v(data.riwayatNICU)}
- Riwayat Alergi / Intoleransi Makanan: ${v(data.alergiIntoleransi)}
- Riwayat Penyakit: ${v(data.riwayatPenyakit)}
- Obat / Suplemen yang Sedang Dikonsumsi: ${v(data.obatSuplemen)}

### POLA MAKAN & FEEDING RULES SAAT INI
- Frekuensi Makan Utama: ${v(data.frekuensiMakanUtama)}
- Frekuensi Snack / Camilan: ${v(data.frekuensiSnack)}
- Konsumsi Susu Harian: ${v(data.jenisSusu)} (${v(data.jumlahSusuPerHari)})
- Durasi Makan Rata-rata: ${v(data.durasiMakan)}
- Lokasi Makan: ${v(data.lokasiMakan)} (Pemberi makan: ${v(data.pemberiMakan)})
- Keteraturan Jadwal Makan: ${v(data.jadwalMakanHarian)}
- Makan Sambil Gadget / TV: ${v(data.makanSambilGadget)}
- Makan Sambil Jalan-jalan: ${v(data.makanSambilJalan)}
- Sering Dibujuk / Dipaksa Makan: ${v(data.seringDibujukDipaksa)}

### KEMAMPUAN TEKSTUR, ORAL MOTOR, PERILAKU & SENSORIK
- Tekstur yang Diterima Saat Ini: ${data.teksturDiterima && data.teksturDiterima.length > 0 ? data.teksturDiterima.join(', ') : '-'}
- Bisa Mengunyah Makanan: ${v(data.bisaMengunyah)}
- Sering Gagging: ${v(data.seringGagging)} | Sering Batuk Saat Makan: ${v(data.seringBatuk)} | Pernah Tersedak: ${v(data.pernahTersedak)}
- Sering Melepeh Makanan: ${v(data.melepehMakanan)} | Mengemut Lama di Mulut: ${v(data.lamaDiMulut)} | Sulit Naik Tekstur: ${v(data.sulitNaikTekstur)}
- Perilaku Saat Makan: ${data.perilakuMakan && data.perilakuMakan.length > 0 ? data.perilakuMakan.join(', ') : '-'}
- Pemicu Sensorik Penolakan: ${data.alasanSensorik && data.alasanSensorik.length > 0 ? data.alasanSensorik.join(', ') : '-'}

### KELUHAN UTAMA & 3 PERTANYAAN ORANG TUA UNTUK DOKTER
- Keluhan Utama yang Dipilih: ${data.keluhanUtama && data.keluhanUtama.length > 0 ? data.keluhanUtama.join(', ') : '-'}
- Keluhan Lainnya: ${v(data.keluhanLainnya)}
- Cerita Kondisi Makan dari Orang Tua: ${v(data.ceritaKondisi)}
- **3 Pertanyaan Orang Tua untuk Dokter**:
  1. Pertanyaan 1: ${v(data.pertanyaanDokter1, '(Tidak diisi)')}
  2. Pertanyaan 2: ${v(data.pertanyaanDokter2, '(Tidak diisi)')}
  3. Pertanyaan 3: ${v(data.pertanyaanDokter3, '(Tidak diisi)')}

---

# STRUKTUR KONTEN WAJIB DI DALAM HTML RESUME KONDISI ANAK:

1. **RINGKASAN PROFIL MEDIS, PERTUMBUHAN & RIWAYAT PENTING**
   - Evaluasi singkat BB aktual (${v(data.bbSekarang)} kg), TB/PB (${v(data.tbPB)} cm), riwayat kelahiran, NICU, alergi/intoleransi, dan suplemen.
2. **EVALUASI POLA PEMBERIAN MAKAN & FEEDING RULES IDAI**
   - Analisis struktur jadwal, durasi makan, proporsi susu vs makanan padat, serta faktor lingkungan (distraksi gadget/jalan-jalan dan tekanan/bujukan saat makan).
3. **ANALISIS KEMAMPUAN TEKSTUR, ORAL MOTOR & PROFIL SENSORIK**
   - Evaluasi kesesuaian tekstur dengan usia anak, keterampilan oromotor (mengunyah, melepeh, mengemut, refleks muntah/gagging, keamanan menelan), dan sensitivitas sensorik.
4. **IDENTIFIKASI 5 MASALAH UTAMA (ROOT CAUSE PRIORITAS 1–5)**
   - Tabel atau daftar terstruktur 5 akar masalah utama yang diurutkan dari prioritas tertinggi (keamanan & pertumbuhan → regulasi lapar-kenyang → oral motor/variasi).
5. **JAWABAN DOKTER ATAS 3 PERTANYAAN ORANG TUA**
   - Tanggapan langsung yang hangat, berbasis bukti medis, dan praktis dari **${DOCTOR_NAME}** untuk menjawab Pertanyaan 1, Pertanyaan 2, dan Pertanyaan 3 dari Ayah/Bunda.
6. **KESIMPULAN KLINIS INTEGRATIF & RED FLAGS**
   - 1 paragraf kesimpulan klinis utuh serta kotak peringatan tanda bahaya (\`.alert-redflag\`).

${formatConsistentHtmlDesignSpec(
  'RESUME KLINIS KONDISI MAKAN & TUMBUH KEMBANG ANAK',
  'Bagian 1 · Evaluasi Medis Feeding Rules, Oral Motor, Root Cause & Jawaban Dokter'
)}`;
}

// ============================================================================
// 3. PROMPT KHUSUS BAGIAN 2: STATUS NUTRISI & PERTUMBUHAN (OUTPUT HTML A4 KONSISTEN)
// ============================================================================
export function generateNutritionStatusPrompt(
  data: Partial<PaidScreeningData>,
  calculatedAge?: string
): string {
  const biodata = formatBasicBiodata(data, calculatedAge);
  const age = v(calculatedAge, '') || v(data.usiaTerkalkulasi, '-');

  return `# MASTER PROMPT — KHUSUS BAGIAN 2: STATUS NUTRISI & PERTUMBUHAN (OUTPUT HTML A4)
## AI PEDIATRIC CLINICAL NUTRITION & GROWTH ASSESSMENT (WHO 2006, PERMENKES RI & ANP IDAI)

## PERAN & TUGAS
Anda adalah **${DOCTOR_NAME} (${DOCTOR_TITLE})**, dokter yang berfokus pada **Nutrisi Pediatrik dan Tumbuh Kembang Anak**.

Tugas Anda adalah menganalisis status nutrisi, kurva pertumbuhan, dan kecukupan asupan anak, serta **HANYA MENGHASILKAN DOKUMEN HTML A4: EVALUASI STATUS NUTRISI & PERTUMBUHAN**.

⚠️ **BATASAN OUTPUT KETAT**:
- Output Anda **WAJIB BERUPA KODE HTML5 LENGKAP (\`<!DOCTYPE html>...\`)** sesuai spesifikasi desain konsisten di bawah.
- Fokus **HANYA pada Analisis Status Nutrisi, Evaluasi 3 Indeks Antropometri WHO/Permenkes, Kebutuhan Kalori/Protein ANP IDAI, Koreksi Usia Prematur, Audit 24-Hour Food Recall, Evaluasi Susu, dan Rekomendasi Intervensi Gizi/Suplementasi**.
- **JANGAN** membuatkan Tabel Meal Plan 7 Hari atau Actionable Plan 14 Hari di dokumen ini.

---

# SUMBER DATA PASIEN (STATUS NUTRISI & PERTUMBUHAN)

${biodata}

### DATA ANTROPOMETRI, PERTUMBUHAN & KOREKSI USIA
- Berat Badan Aktual Saat Ini: ${v(data.bbSekarang)} kg
- Tinggi / Panjang Badan Aktual Saat Ini: ${v(data.tbPB)} cm
- Usia Kronologis Saat Ini: ${age}
- Usia Gestasi Saat Lahir: ${v(data.usiaGestasi, 'Cukup bulan (Aterm)')}
- Berat Badan Lahir: ${v(data.bbLahir)}
- Riwayat Berat Badan Berkala:
  * BB 3 Bulan Lalu: ${v(data.riwayatBB?.bb3BulanLalu)}
  * BB 2 Bulan Lalu: ${v(data.riwayatBB?.bb2BulanLalu)}
  * BB 1 Bulan Lalu: ${v(data.riwayatBB?.bb1BulanLalu)}
  * BB Aktual Sekarang: ${v(data.riwayatBB?.bbSekarang || data.bbSekarang)} kg
  * Apakah BB Stagnan?: ${v(data.riwayatBB?.bbStagnan)}
  * Pernah Mengalami Penurunan BB?: ${v(data.riwayatBB?.pernahTurunBB)}
  * Target Kenaikan BB Orang Tua: ${v(data.riwayatBB?.targetBB)}

### DATA ASUPAN MAKAN KEMARIN (24-HOUR FOOD RECALL)
- Bangun Tidur (Susu / ASI): ${v(data.foodRecall?.bangunSusu)}
- Sarapan Pagi: ${formatRecall(data.foodRecall?.sarapanMenu, data.foodRecall?.sarapanPorsi)}
- Snack Pagi: ${formatRecall(data.foodRecall?.snackPagiMenu, data.foodRecall?.snackPagiPorsi)}
- Makan Siang: ${formatRecall(data.foodRecall?.makanSiangMenu, data.foodRecall?.makanSiangPorsi)}
- Snack Sore: ${formatRecall(data.foodRecall?.snackSoreMenu, data.foodRecall?.snackSorePorsi)}
- Makan Malam: ${formatRecall(data.foodRecall?.makanMalamMenu, data.foodRecall?.makanMalamPorsi)}
- Susu Sebelum Tidur: ${v(data.foodRecall?.susuSebelumTidur)}

### DATA KONSUMSI SUSU & SUPLEMEN
- Jenis Susu: ${v(data.jenisSusu)}
- Total Volume Susu per Hari: ${v(data.jumlahSusuPerHari)}
- Obat / Suplemen Saat Ini: ${v(data.obatSuplemen)}
- Alergi / Intoleransi: ${v(data.alergiIntoleransi)}

---

# STRUKTUR KONTEN WAJIB DI DALAM HTML STATUS NUTRISI & PERTUMBUHAN:

1. **TABEL EVALUASI 3 INDEKS ANTROPOMETRI WHO 2006 & PERMENKES RI NO. 2 TAHUN 2020**
   - Sajikan dalam tabel HTML (\`<table>\`) yang mengevaluasi secara akurat berdasarkan **BB Aktual (${v(data.bbSekarang)} kg)**, **TB/PB (${v(data.tbPB)} cm)**, dan **Usia (${age})**:
     * **Indeks BB/U (Berat Badan menurut Usia)**: Interpretasi klinis (Berat badan normal / kurang / sangat kurang / risiko BB lebih) dan perbandingan dengan median WHO.
     * **Indeks PB/U atau TB/U (Panjang/Tinggi Badan menurut Usia)**: Interpretasi pertumbuhan linier (Normal / Pendek / Sangat Pendek) dan perbandingan dengan median WHO.
     * **Indeks BB/PB atau BB/TB (Berat Badan menurut Panjang/Tinggi Badan)**: Status gizi akut (Gizi Baik / Risiko Gizi Lebih / Gizi Kurang - Wasting / Gizi Buruk).
     * **Berat Badan Ideal (BBI) & Kebutuhan Kalori Harian (ANP IDAI)**: Cantumkan estimasi BBI (kg) untuk tinggi badan saat ini serta target kebutuhan energi harian (kkal/hari) dan protein harian (gram/hari).
2. **EVALUASI TREN KECEPATAN PERTUMBUHAN (WEIGHT VELOCITY) & USIA KOREKSI**
   - Analisis perubahan BB dari 3 bulan lalu → 2 bulan lalu → 1 bulan lalu → sekarang. Apakah terjadi *weight faltering* / stagnasi?
   - Jika lahir prematur (<37 minggu) dan usia <24 bulan, hitung dan tampilkan **Usia Koreksi** secara eksplisit.
3. **AUDIT KLINIS 24-HOUR FOOD RECALL & KESEIMBANGAN MAKRONUTRIEN**
   - Tabel atau rincian evaluasi asupan riil kemarin dibandingkan dengan target kebutuhan kalori & protein harian anak.
   - Evaluasi densitas energi, kecukupan protein hewani, karbohidrat, dan lemak tambahan.
4. **ANALISIS RASIO SUSU VS MAKANAN PADAT (MILK DISPLACEMENT)**
   - Evaluasi apakah frekuensi/volume susu (${v(data.jumlahSusuPerHari)}) menggeser porsi makanan padat atau mengganggu siklus lapar-kenyang.
5. **SKRINING RISIKO MIKRONUTRIEN & REKOMENDASI INTERVENSI GIZI KLINIS**
   - Evaluasi risiko kekurangan Zat Besi (Fe), Zinc, Kalsium, dan Vitamin D yang sering memperberat GTM/penurunan nafsu makan.
   - Strategi peningkatan densitas kalori (*caloric boosting*: double protein hewani, penambahan lemak sehat di setiap porsi) dan target kenaikan BB realistis (gram/bulan).

${formatConsistentHtmlDesignSpec(
  'EVALUASI STATUS NUTRISI, ANTROPOMETRI & PERTUMBUHAN ANAK',
  'Bagian 2 · Analisis Kurva WHO/Permenkes, Kebutuhan Kalori ANP IDAI & Audit Asupan 24 Jam'
)}`;
}

// ============================================================================
// 4. PROMPT KHUSUS BAGIAN 3: MEAL PLAN 7 HARI (OUTPUT HTML A4 KONSISTEN)
// ============================================================================
export function generateMealPlanPrompt(
  data: Partial<PaidScreeningData>,
  calculatedAge?: string
): string {
  const biodata = formatBasicBiodata(data, calculatedAge);

  return `# MASTER PROMPT — KHUSUS BAGIAN 3: MEAL PLAN 7 HARI (OUTPUT HTML A4)
## AI PEDIATRIC 7-DAY MEAL PLAN & FOOD REPERTOIRE EXPANSION

## PERAN & TUGAS
Anda adalah **${DOCTOR_NAME} (${DOCTOR_TITLE})**, dokter yang berfokus pada **Nutrisi Pediatrik, Dietetik Anak, dan Manajemen Picky Eating / GTM**.

Tugas Anda adalah merancang **DOKUMEN HTML A4: MEAL PLAN 7 HARI YANG REALISTIS, AMAN DARI ALERGI, PADAT NUTRISI, DAN SESUAI KEMAMPUAN TEKSTUR ANAK**.

⚠️ **BATASAN OUTPUT KETAT**:
- Output Anda **WAJIB BERUPA KODE HTML5 LENGKAP (\`<!DOCTYPE html>...\`)** sesuai spesifikasi desain konsisten di bawah.
- Fokus **HANYA pada Panduan Prinsip Menu (Alergi & Tekstur), Tabel Meal Plan 7 Hari Lengkap (Hari 1 s.d Hari 7), Strategi Food Chaining dari Food Repertoire Anak, dan Daftar Substitusi Bahan**.
- **JANGAN** membuatkan Resume Rekam Medis umum atau Tabel Actionable Plan 14 Hari di dokumen ini.

---

# SUMBER DATA PASIEN (MEAL PLAN & FOOD REPERTOIRE)

${biodata}

### PANTANGAN ALERGI / INTOLERANSI MAKANAN (WAJIB DIPATUHI)
- Alergi / Intoleransi Makanan: **${v(data.alergiIntoleransi, 'Tidak ada alergi tercatat')}**
⚠️ *ATURAN KESELAMATAN MEDIS: Dilarang keras memasukkan bahan makanan yang memicu alergi/intoleransi di atas ke dalam menu!*

### KEMAMPUAN TEKSTUR & ORAL MOTOR SAAT INI
- Tekstur yang Diterima Anak Saat Ini: ${data.teksturDiterima && data.teksturDiterima.length > 0 ? data.teksturDiterima.join(', ') : '-'}
- Bisa Mengunyah Makanan: ${v(data.bisaMengunyah)}
- Sering Melepeh: ${v(data.melepehMakanan)} | Mengemut Lama: ${v(data.lamaDiMulut)} | Sulit Naik Tekstur: ${v(data.sulitNaikTekstur)}
- Faktor Sensorik Penolakan: ${data.alasanSensorik && data.alasanSensorik.length > 0 ? data.alasanSensorik.join(', ') : '-'}

### FOOD REPERTOIRE (DAFTAR MAKANAN YANG DITERIMA VS DITOLAK)
- Karbohidrat: ${formatRepertoireCategory(data.repertoire, 'Karbohidrat')}
- Protein Hewani: ${formatRepertoireCategory(data.repertoire, 'Protein hewani')}
- Protein Nabati: ${formatRepertoireCategory(data.repertoire, 'Protein nabati')}
- Sayur: ${formatRepertoireCategory(data.repertoire, 'Sayur')}
- Buah: ${formatRepertoireCategory(data.repertoire, 'Buah')}
- Dairy / Olahan Susu: ${formatRepertoireCategory(data.repertoire, 'Dairy')}
- Snack / Camilan: ${formatRepertoireCategory(data.repertoire, 'Snack')}
- Total Jenis Makanan yang Masih Diterima Anak: ${v(data.jumlahJenisDiterima)}

### JADWAL MAKAN & KONSUMSI SUSU
- Frekuensi Makan Utama: ${v(data.frekuensiMakanUtama)}
- Frekuensi Snack: ${v(data.frekuensiSnack)}
- Konsumsi Susu: ${v(data.jenisSusu)} (${v(data.jumlahSusuPerHari)})

---

# STRUKTUR KONTEN WAJIB DI DALAM HTML MEAL PLAN 7 HARI:

1. **PANDUAN SPESIFIKASI MENU, KEAMANAN ALERGI, & TARGET TEKSTUR**
   - Ringkasan tekstur awal yang aman untuk ananda (${data.teksturDiterima && data.teksturDiterima.length > 0 ? data.teksturDiterima.join(', ') : 'Sesuai usia'}), aturan bebas alergen (${v(data.alergiIntoleransi)}), serta panduan penambahan lemak sehat (*booster* kalori) pada setiap porsi.
2. **TABEL MEAL PLAN 7 HARI LENGKAP (HARI 1 S.D HARI 7)**
   - Sajikan dalam tabel HTML (\`<table>\`) lengkap 7 baris (Hari 1 sampai Hari 7) dengan kolom:
     **Hari | Sarapan Pagi (07.00) | Snack Pagi (09.30) | Makan Siang (12.00) | Snack Sore (15.30) | Makan Malam (18.30) | Jadwal Susu & Target Porsi**
   - Setiap sel menu WAJIB mencantumkan:
     * **Nama Menu Nusantara / Rumahan yang Mudah Dibuat**
     * **Takaran Porsi Realistis** (misal: sdm / mangkuk kecil / gram)
     * **Tekstur & Sumber Protein Hewani + Lemak Sehat**
3. **JEMBATAN FOOD CHAINING (DARI MAKANAN DISUKAI → MENU BARU)**
   - Buat tabel atau skema konkret bagaimana memperluas *food repertoire* anak menggunakan prinsip:
     **Makanan yang sudah diterima (Accepted Food) → Variasi bentuk/bumbu serupa (Familiar Variation) → Makanan target baru (New Target Food)**.
4. **DAFTAR SUBSTITUSI & PROTOKOL BILA ANAK MENOLAK MENU**
   - Panduan bahan pengganti setara nutrisi dan aturan tegas agar tidak langsung mengganti makanan utama yang ditolak dengan botol susu.

${formatConsistentHtmlDesignSpec(
  'RENCANA MENU HARIAN (MEAL PLAN 7 HARI) & FOOD CHAINING',
  'Bagian 3 · Panduan Menu Padat Gizi, Adaptasi Tekstur & Perluasan Variasi Makanan'
)}`;
}

// ============================================================================
// 5. PROMPT KHUSUS BAGIAN 4: ACTIONABLE PLAN 2 WEEKS / 14 HARI (OUTPUT HTML A4 KONSISTEN)
// ============================================================================
export function generateActionable2WeeksPrompt(
  data: Partial<PaidScreeningData>,
  calculatedAge?: string
): string {
  const biodata = formatBasicBiodata(data, calculatedAge);

  return `# MASTER PROMPT — KHUSUS BAGIAN 4: ACTIONABLE PLAN 2 WEEKS / 14 HARI (OUTPUT HTML A4)
## AI PEDIATRIC 14-DAY BEHAVIORAL, SENSORY & FEEDING RULES ACTION PLAN

## PERAN & TUGAS
Anda adalah **${DOCTOR_NAME} (${DOCTOR_TITLE})**, dokter yang berfokus pada **Tumbuh Kembang Anak, Feeding Problem, dan Feeding Behavior**.

Tugas Anda adalah menyusun **DOKUMEN HTML A4: ACTIONABLE PLAN 2 WEEKS (14 HARI)** yang sangat terstruktur, aplikatif, dan memandu langkah demi langkah apa yang harus dilakukan Ayah/Bunda setiap hari selama 14 hari.

⚠️ **BATASAN OUTPUT KETAT**:
- Output Anda **WAJIB BERUPA KODE HTML5 LENGKAP (\`<!DOCTYPE html>...\`)** sesuai spesifikasi desain konsisten di bawah.
- Fokus **HANYA pada 3 Pilar Feeding Rules IDAI, Tabel Protokol Aksi 14 Hari (Hari 1 s.d Hari 14), Target Keberhasilan 14 Hari, Tabel Checklist Monitoring Harian Bunda, dan Red Flags**.
- **JANGAN** membuatkan Tabel Meal Plan 7 Hari atau Resume Rekam Medis umum di dokumen ini.

---

# SUMBER DATA PASIEN (FEEDING RULES, PERILAKU & SENSORIK)

${biodata}

### KEBIASAAN & LINGKUNGAN MAKAN SAAT INI (FEEDING ENVIRONMENT)
- Keteraturan Jadwal Makan Harian: ${v(data.jadwalMakanHarian)}
- Frekuensi Makan Utama: ${v(data.frekuensiMakanUtama)} | Snack: ${v(data.frekuensiSnack)}
- Konsumsi Susu: ${v(data.jenisSusu)} (${v(data.jumlahSusuPerHari)})
- Durasi Setiap Sesi Makan: ${v(data.durasiMakan)}
- Lokasi Makan Anak: ${v(data.lokasiMakan)}
- Pemberi Makan / Pengasuh: ${v(data.pemberiMakan)}
- Makan Sambil Gadget / TV: ${v(data.makanSambilGadget)}
- Makan Sambil Jalan-jalan / Digendong: ${v(data.makanSambilJalan)}
- Sering Dibujuk / Dipaksa Makan: ${v(data.seringDibujukDipaksa)}

### PERILAKU ANAK SAAT MAKAN (FEEDING BEHAVIOR)
- Perilaku yang Sering Muncul: ${data.perilakuMakan && data.perilakuMakan.length > 0 ? data.perilakuMakan.join(', ') : '-'}
  * Menutup mulut: ${checkItem(data.perilakuMakan, 'Menutup mulut')} | Memalingkan wajah: ${checkItem(data.perilakuMakan, 'Memalingkan wajah')} | Menangis: ${checkItem(data.perilakuMakan, 'Menangis')}
  * Kabur dari meja makan: ${checkItem(data.perilakuMakan, 'Kabur dari meja makan')} | Melempar makanan: ${checkItem(data.perilakuMakan, 'Melempar makanan')} | Memukul/menolak pengasuh: ${checkItem(data.perilakuMakan, 'Memukul/menolak pengasuh')}
  * Harus disuapi: ${checkItem(data.perilakuMakan, 'Harus disuapi')} | Harus sambil gadget: ${checkItem(data.perilakuMakan, 'Harus sambil gadget')} | Durasi makan sangat lama: ${checkItem(data.perilakuMakan, 'Sangat lama menghabiskan makanan')}

### FAKTOR SENSORIK & ORAL MOTOR PENOLAKAN
- Pemicu Sensorik: ${data.alasanSensorik && data.alasanSensorik.length > 0 ? data.alasanSensorik.join(', ') : '-'}
- Tekstur Diterima: ${data.teksturDiterima && data.teksturDiterima.length > 0 ? data.teksturDiterima.join(', ') : '-'}
- Melepeh: ${v(data.melepehMakanan)} | Mengemut Lama: ${v(data.lamaDiMulut)} | Sulit Naik Tekstur: ${v(data.sulitNaikTekstur)}

### KELUHAN UTAMA ORANG TUA
- Keluhan Utama: ${data.keluhanUtama && data.keluhanUtama.length > 0 ? data.keluhanUtama.join(', ') : '-'}
- Cerita Kondisi Makan: ${v(data.ceritaKondisi)}

---

# STRUKTUR KONTEN WAJIB DI DALAM HTML ACTIONABLE PLAN 14 HARI:

1. **ATURAN EMAS 3 PILAR FEEDING RULES IDAI UNTUK ANANDA**
   - Penjelasan spesifik untuk kasus ananda mengenai:
     * **Pilar 1 — Jadwal (Schedule)**: Jam makan utama & snack terjadwal, jeda 2–3 jam hanya air putih agar timbul rasa lapar alami (*hunger cue*).
     * **Pilar 2 — Lingkungan (Environment)**: Duduk di kursi/meja makan, bebas distraksi (0% gadget/TV/keliling), suasana netral dan menyenangkan tanpa paksaan/ancaman.
     * **Pilar 3 — Prosedur (Procedure)**: Batas waktu maksimal 30 menit per sesi, tawarkan porsi kecil, akhiri sesi makan dengan tenang bila anak menunjukkan tanda penolakan konsisten selama 10–15 menit.
2. **TABEL PROTOKOL ACTIONABLE PLAN 14 HARI (HARI 1 S.D HARI 14)**
   - Sajikan dalam tabel HTML (\`<table>\`) lengkap dengan kolom:
     **Hari / Fase | Fokus Utama | Langkah Konkret yang Dilakukan Ayah/Bunda | Respons Saat Anak Menolak | Indikator Keberhasilan**
   - Mencakup 6 Fase Berkesinambungan:
     * **Hari 1–3 (Fase 1: Reset Feeding Environment)**: Penertiban jadwal lapar-kenyang, penghentian gadget/jalan-jalan, aturan durasi 30 menit.
     * **Hari 4–6 (Fase 2: Improve Meal Structure & Disiplin Susu)**: Pengaturan porsi awal kecil, penataan batas volume susu, dan tidak memberikan susu kompensasi saat mogok makan.
     * **Hari 7 (Fase 3: Evaluasi Minggu Ke-1)**: Audit durasi makan, emosi anak di meja makan, dan kesiapan lanjut ke minggu ke-2.
     * **Hari 8–10 (Fase 4: Graduated Sensory & Food Exposure)**: Teknik paparan bertahap tanpa paksaan (*Lihat → Sentuh → Cium → Cicip → Kunyah/Telan*).
     * **Hari 11–13 (Fase 5: Oral-Motor, Tekstur & Self-Feeding Progression)**: Stimulasi mengunyah, latihan tekstur bertahap, dan pelibatan anak makan mandiri (*finger food* / sendok sendiri).
     * **Hari 14 (Fase 6: Evaluasi Akhir Hari 1 vs Hari 14)**: Evaluasi komparatif perilaku makan, variasi makanan, durasi, dan penimbangan berat badan.
3. **TARGET CAPAIAN 14 HARI (SPESIFIK & TERUKUR)**
   - Target perilaku makan, target adaptasi tekstur/oral motor, target perluasan *food repertoire*, dan target pemantauan tren pertumbuhan.
4. **TABEL CHECKLIST MONITORING HARIAN BUNDA (HARI 1 – HARI 14)**
   - Buat tabel checklist HTML siap cetak yang dapat dicentang orang tua dari Hari 1 sampai Hari 14.
5. **KOTAK PERINGATAN RED FLAGS (\`.alert-redflag\`)**
   - Daftar tanda bahaya medis (tersedak, batuk saat menelan, napas berbunyi setelah makan, penurunan BB, muntah berulang) yang mewajibkan konsultasi dokter segera.

${formatConsistentHtmlDesignSpec(
  'ACTIONABLE PLAN 14 HARI (2 WEEKS FEEDING & BEHAVIOR PROTOCOL)',
  'Bagian 4 · Protokol Harian IDAI Feeding Rules, Eksposur Sensorik & Monitoring 14 Hari'
)}`;
}

/**
 * Dispatcher function to generate section-specific prompt master.
 */
export function generateSectionPrompt(
  section: MasterPromptSection,
  data: Partial<PaidScreeningData>,
  calculatedAge?: string
): string {
  switch (section) {
    case 'resume':
      return generateResumePrompt(data, calculatedAge);
    case 'status_nutrisi':
      return generateNutritionStatusPrompt(data, calculatedAge);
    case 'meal_plan':
      return generateMealPlanPrompt(data, calculatedAge);
    case 'actionable_2weeks':
      return generateActionable2WeeksPrompt(data, calculatedAge);
    case 'all':
    default:
      return generateMasterPrompt(data, calculatedAge);
  }
}
