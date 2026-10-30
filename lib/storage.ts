import { FreeScreeningData, PaidScreeningData, ScreeningRecord, RiskLevel } from '@/types/screening';
import { supabase } from './supabase';
import {
  calculateAgeFromDob,
  evaluateAnthropometry,
  AnthropometryEvaluation,
} from './anthropometry';

const LOCAL_STORAGE_KEY = 'tka_screening_records_v1';

export interface ClinicalScreeningResult {
  risk_level: RiskLevel;
  clinical_category: string;
  age_info: {
    totalMonths: number;
    formatted: string;
  };
  anthropometry: AnthropometryEvaluation | null;
  problem_areas: string[];
  summary: string;
  feeding_rule_violations: string[];
  idai_guidance: string[];
}

// Algoritma Penilai Risiko Berbasis Pedoman Klinis UKK Nutrisi & Penyakit Metabolik IDAI,
// Klasifikasi Kesulitan Makan (Kerzner et al.), Permenkes RI No. 2 Tahun 2020, & WHO (2006)
export function evaluateFreeScreening(data: FreeScreeningData): ClinicalScreeningResult {
  const problems: string[] = [];
  const feedingRuleViolations: string[] = [];
  const idaiGuidance: string[] = [];
  let redFlagCount = 0;
  let behavioralScore = 0;

  // 1. EVALUASI USIA DARI TANGGAL LAHIR (DOB) & 3 INDEKS ANTROPOMETRI (WHO 2006 & Permenkes RI No. 2/2020)
  const age = calculateAgeFromDob(data.tanggalLahir || '');
  const totalMonths = age.totalMonths;
  const anthropometry = evaluateAnthropometry(
    data.tanggalLahir || '',
    data.jenisKelamin,
    data.bbTerakhir,
    data.tbTerakhir,
    data.tanggalPengukuran || data.usiaPengukuran
  );

  if (anthropometry) {
    // A. Evaluasi Indeks BB/PB atau BB/TB (Status Gizi Akut / Wasting - Prioritas Klinis ANP IDAI)
    if (anthropometry.wfhCategory.includes('Gizi Buruk')) {
      problems.push(
        `🚨 Status Gizi Akut (BB/TB WHO): ${anthropometry.wfhCategory}. Proporsi berat badan (${data.bbTerakhir} kg) terhadap tinggi badan (${data.tbTerakhir} cm) berada di bawah -3 SD (Berat Badan Ideal: ~${anthropometry.idealBodyWeightKg} kg). Membutuhkan tata laksana nutrisi medis segera.`
      );
      redFlagCount += 2;
    } else if (anthropometry.wfhCategory.includes('Gizi Kurang')) {
      problems.push(
        `⚖️ Status Gizi Akut (BB/TB WHO): ${anthropometry.wfhCategory}. Proporsi BB terhadap TB berada di bawah -2 SD (Berat Badan Ideal: ~${anthropometry.idealBodyWeightKg} kg; Target energi: ~${anthropometry.estimatedDailyCaloriesKcal} kkal/hari).`
      );
      redFlagCount += 1;
      behavioralScore += 2;
    }

    // B. Evaluasi Indeks BB/U (Berat Badan menurut Umur)
    if (anthropometry.weightCategory.includes('Sangat Kurang')) {
      problems.push(
        `📉 Indeks BB/U (Permenkes No. 2/2020): ${anthropometry.weightCategory}. BB aktual (${data.bbTerakhir} kg) jauh di bawah median usia ${age.formatted} (~${anthropometry.medianWeightForAge} kg).`
      );
      redFlagCount += 2;
    } else if (anthropometry.weightCategory.includes('Berat Badan Kurang')) {
      problems.push(
        `📉 Indeks BB/U (Permenkes No. 2/2020): ${anthropometry.weightCategory}. BB aktual (${data.bbTerakhir} kg) berada di bawah -2 SD kurva WHO (median usia: ~${anthropometry.medianWeightForAge} kg).`
      );
      redFlagCount += 1;
      behavioralScore += 1.5;
    }

    // C. Evaluasi Indeks PB/U atau TB/U (Stunting / Pertumbuhan Linier)
    if (anthropometry.heightCategory.includes('Sangat Pendek')) {
      problems.push(
        `📏 Indeks TB/U (WHO Standards): ${anthropometry.heightCategory} (${data.tbTerakhir} cm vs median ~${anthropometry.medianHeightForAge} cm). Indikasi defisit nutrisi kronis yang memerlukan evaluasi dokter.`
      );
      redFlagCount += 2;
    } else if (anthropometry.heightCategory.includes('Pendek')) {
      problems.push(
        `📏 Indeks TB/U (WHO Standards): ${anthropometry.heightCategory} (${data.tbTerakhir} cm vs median ~${anthropometry.medianHeightForAge} cm). Asupan protein hewani setiap makan utama sangat krusial untuk kejar tumbuh linier.`
      );
      redFlagCount += 1;
      behavioralScore += 1.5;
    }

    // D. Evaluasi Kebaruan Pengukuran
    if (anthropometry.measurementRecencyNote.includes('⚠️')) {
      problems.push(`📅 Validitas Antropometri: ${anthropometry.measurementRecencyNote}`);
    }
  }

  // 2. EVALUASI SPESIFIK TAHAPAN USIA & 3 PILAR FEEDING RULES IDAI (JADWAL, LINGKUNGAN, PROSEDUR)
  if (totalMonths < 6) {
    // Bayi 0-5 Bulan: Fase ASI Eksklusif / Cair (Belum MPASI kecuali indikasi medis 4-6 bulan)
    idaiGuidance.push(
      'Pada usia 0–5 bulan (< 6 bulan), nutrisi utama bayi adalah ASI eksklusif on-demand (8–12x/hari) atau susu formula sesuai indikasi medis. MPASI padat baru dimulai saat usia genap 6 bulan (atau 4–6 bulan hanya jika ada indikasi medis dokter & kesiapan kepala tegak).'
    );
  } else {
    // Anak Usia 6–60 Bulan (Fase MPASI & Makanan Keluarga)
    const jadwalUtama = (data.jadwalMakanUtama || '').toLowerCase();
    const jadwalSnack = (data.jadwalSnack || '').toLowerCase();
    const susuText = (data.susuHarian || '').toLowerCase();

    // A. PILAR JADWAL (Schedule)
    if (jadwalUtama.includes('1x sehari')) {
      feedingRuleViolations.push('Frekuensi makan utama sangat kurang (1x/hari)');
      problems.push(
        '⏰ Pilar Jadwal (IDAI): Frekuensi makan utama hanya 1x sehari. Anak usia ≥6 bulan membutuhkan 2–3x makan utama (usia 6–8 bln) dan 3x makan utama penuh (usia ≥9 bln) untuk memenuhi kebutuhan makronutrien dan zat besi.'
      );
      behavioralScore += 2;
      idaiGuidance.push(
        'Tetapkan jadwal baku 3x makan utama (pagi, siang, sore/malam) dengan jeda pengosongan lambung 2,5–3 jam.'
      );
    } else if (jadwalUtama.includes('2x sehari') && totalMonths >= 9) {
      feedingRuleViolations.push('Frekuensi makan utama kurang dari 3x/hari');
      problems.push(
        `⏰ Pilar Jadwal (IDAI): Pada usia ${age.formatted}, frekuensi makan utama 2x sehari belum mencukupi target energi harian (~${anthropometry?.estimatedDailyCaloriesKcal || 1000} kkal/hari). Standar IDAI untuk usia ≥9 bulan adalah 3x makan utama.`
      );
      behavioralScore += 1;
      idaiGuidance.push(
        'Tingkatkan frekuensi makan utama menjadi 3x sehari (pagi, siang, malam) dengan porsi bertahap.'
      );
    } else if (
      jadwalUtama.includes('tidak tentu') ||
      jadwalUtama.includes('sesuka') ||
      jadwalUtama.includes('tidak teratur')
    ) {
      feedingRuleViolations.push('Jadwal makan tidak teratur');
      problems.push(
        '⏰ Pilar Jadwal (IDAI): Jadwal makan tidak teratur / mengikuti kemauan anak. Ketidakteraturan jadwal mengacaukan bioritme hormon ghrelin (pemicu lapar) dan leptin (sinyal kenyang).'
      );
      behavioralScore += 1.5;
      idaiGuidance.push(
        'Buat jadwal makan terstruktur dan konsisten pada jam yang sama setiap hari (3x makan utama, 2x camilan, durasi maksimal 30 menit).'
      );
    }

    // Evaluasi Jadwal Snack (Grazing check)
    if (jadwalSnack.includes('grazing') || jadwalSnack.includes('terus-menerus') || jadwalSnack.includes('sering')) {
      feedingRuleViolations.push('Ngemil terus-menerus (Grazing)');
      problems.push(
        '🍪 Pilar Jadwal (Grazing): Pemberian camilan yang terlalu sering/terus-menerus membuat lambung tidak pernah kosong sehingga anak tidak pernah merasakan lapar sejati saat jam makan utama.'
      );
      behavioralScore += 1.5;
      idaiGuidance.push(
        'Hentikan kebiasaan ngemil di luar jadwal (grazing); batasi snack hanya 2x sehari pada jam terjadwal (misal pk 10.00 & 16.00) berjarak minimal 2 jam sebelum makan utama.'
      );
    }

    // Evaluasi Asupan Susu / ASI berdasarkan Usia
    if (totalMonths >= 12) {
      if (
        susuText.includes('>600') ||
        susuText.includes('banyak') ||
        susuText.includes('700') ||
        susuText.includes('800')
      ) {
        feedingRuleViolations.push('Asupan susu berlebih (>500-600 ml/hari pada usia >1 tahun)');
        problems.push(
          '🍼 Komposisi Kalori Cair Berlebih: Pada usia ≥1 tahun, konsumsi susu >500–600 ml/hari menyebabkan kenyang cairan (milk-induced satiety), menurunkan nafsu makan padat, dan meningkatkan risiko anemia defisiensi besi.'
        );
        behavioralScore += 1.5;
        idaiGuidance.push(
          'Batasi konsumsi susu maksimal 400–500 ml/hari (2 gelas) pada anak usia >1 tahun dan berikan hanya setelah makan padat atau menjelang tidur.'
        );
      } else if (susuText.includes('hanya asi') && susuText.includes('sering')) {
        feedingRuleViolations.push('Menyusu ASI on-demand terlalu sering di usia >1 tahun');
        problems.push(
          '🤱 Pola Menyusu Usia >1 Tahun: Pada usia ≥12 bulan, ASI hanya memenuhi ~30% kebutuhan kalori; menyusu on-demand terlalu sering terutama mendekati jam makan membuat anak menolak makanan keluarga.'
        );
        behavioralScore += 1;
        idaiGuidance.push(
          'Pada usia >1 tahun, prioritaskan makanan keluarga 3x sehari terlebih dahulu; jadwalkan menyusu ASI di luar jam makan utama (beri jeda minimal 1,5–2 jam sebelum makan).'
        );
      }
    }

    // B. PILAR LINGKUNGAN (Environment)
    if (data.makanSambilGadget === 'Ya') {
      feedingRuleViolations.push('Ketergantungan gadget/TV saat makan');
      problems.push(
        '📱 Pilar Lingkungan (IDAI & AAP): Makan dengan distraksi layar (gadget/TV). Distraksi visual membajak fokus sensorik anak sehingga anak menelan secara refleks tanpa mengenali sinyal lapar-kenyang dan tekstur makanan.'
      );
      behavioralScore += 1.5;
      idaiGuidance.push(
        'Terapkan Zero Screen Time saat makan: matikan TV/gadget, dudukkan anak di kursi makan, dan bangun interaksi tatap muka yang menyenangkan.'
      );
    } else if (data.makanSambilGadget === 'Kadang') {
      feedingRuleViolations.push('Distraksi gadget/TV intermiten saat makan');
      problems.push(
        '📱 Pilar Lingkungan: Masih ada penggunaan gadget/TV sesekali saat anak sulit makan, yang berisiko menciptakan ketergantungan bersyarat.'
      );
      behavioralScore += 0.5;
    }

    if (data.seringDipaksaBujuk === 'Ya') {
      feedingRuleViolations.push('Pemaksaan / tekanan emosional saat makan (Coercive Feeding)');
      problems.push(
        '⚡ Pilar Lingkungan Emosional: Adanya paksaan atau bujukan berlebih memicu pelepasan hormon stres (kortisol & adrenalin) yang menekan motilitas lambung dan memicu trauma makan (food aversion).'
      );
      behavioralScore += 1.5;
      idaiGuidance.push(
        'Terapkan prinsip Satter Division of Responsibility: Orang tua mengatur APA, KAPAN, dan DI MANA anak makan; anak berhak menentukan BERAPA BANYAK yang ia makan tanpa paksaan.'
      );
    } else if (data.seringDipaksaBujuk === 'Kadang') {
      feedingRuleViolations.push('Kadang masih dibujuk/dipaksa saat makan');
      problems.push(
        '⚡ Pilar Lingkungan Emosional: Bujukan/paksaan sesekali saat anak menutup mulut dapat memperkuat perilaku penolakan makan.'
      );
      behavioralScore += 0.5;
    }

    // C. PILAR PROSEDUR (Procedure)
    if (data.digantiSusuSnack === 'Ya') {
      feedingRuleViolations.push('Makanan utama diganti susu/snack saat menolak makan');
      problems.push(
        '🥛 Pilar Prosedur (Kompensasi Negatif): Mengganti makanan utama yang ditolak dengan susu atau biskuit mengajarkan anak bahwa aksi GTM akan dihadiahi susu/camilan kesukaannya.'
      );
      behavioralScore += 1.5;
      idaiGuidance.push(
        'Bila dalam 30 menit anak menolak makan, akhiri sesi makan secara netral tanpa marah dan JANGAN langsung diganti susu/camilan; tawarkan kembali makanan pada jadwal makan berikutnya.'
      );
    } else if (data.digantiSusuSnack === 'Kadang') {
      feedingRuleViolations.push('Kadang makanan utama diganti susu/camilan');
      problems.push(
        '🥛 Pilar Prosedur: Pemberian susu/snack pengganti saat anak mogok makan menghambat pembentukan rasa lapar alami untuk jam makan berikutnya.'
      );
      behavioralScore += 0.5;
    }
  }

  // Backward compatibility check for Oral-Motor Red Flags
  if (data.pernahTersedak === 'Ya') {
    problems.push(
      '⚠️ Red Flag Oral-Motor: Riwayat tersedak saat makan (risiko disfagia orofaringeal / inkoordinasi menelan).'
    );
    redFlagCount += 2;
  }
  if (data.kesulitanKunyahTelan === 'Ya') {
    problems.push(
      '⚠️ Red Flag Oral-Motor: Kesulitan mengunyah atau menelan makanan padat sesuai tahapan usia.'
    );
    redFlagCount += 2;
  }

  // 3. PENENTUAN STATUS & KATEGORI KLINIS AKHIR (SESUAI ALUR DIAGNOSIS IDAI)
  let risk_level: RiskLevel = 'NORMAL';
  let clinical_category = 'Pola Makan Fisiologis Sesuai Tahapan Usia & Status Gizi Baik';
  let summary = '';

  if (redFlagCount >= 2 || (redFlagCount >= 1 && behavioralScore >= 2)) {
    risk_level = 'BUTUH PERHATIAN KHUSUS';
    clinical_category =
      'Indikasi Masalah Makan dengan Risiko Defisit Pertumbuhan / Red Flag Klinis (Wajib Evaluasi Dokter)';
    summary = `Berdasarkan standar antropometri WHO/Permenkes RI dan alur klinis IDAI, ditemukan indikasi gangguan pertumbuhan (BB/U, TB/U, atau BB/TB di bawah batas normal) dan/atau pelanggaran multipel aturan makan (feeding rules). Ananda memerlukan evaluasi medis mendalam, perhitungan kejar tumbuh (catch-up growth ~${anthropometry?.estimatedDailyCaloriesKcal || 1000} kkal/hari), serta rencana intervensi makan terstruktur bersama dokter.`;
  } else if (redFlagCount === 1 || behavioralScore >= 1.5 || feedingRuleViolations.length >= 2) {
    risk_level = 'PERLU DIPERHATIKAN';
    clinical_category =
      'Inappropriate Feeding Practice & Gejala Kesulitan Makan Perilaku (Disarankan Evaluasi Lanjutan)';
    summary = `Berdasarkan pedoman UKK Nutrisi & Penyakit Metabolik IDAI, ditemukan ketidaksesuaian praktik pemberian makan (feeding rules) pada aspek jadwal, lingkungan, atau prosedur makan yang berisiko memicu Gerakan Tutup Mulut (GTM) berkepanjangan dan stagnasi berat badan (weight faltering) bila tidak segera dikoreksi.`;
  } else {
    risk_level = 'NORMAL';
    clinical_category = 'Praktik Pemberian Makan & Pertumbuhan Sesuai Tahapan Usia (Normal)';
    summary = `Secara umum, status pertumbuhan dan pola pemberian makan ananda usia ${age.formatted || '-'} berada dalam koridor normal sesuai acuan IDAI dan WHO (target energi harian ~${anthropometry?.estimatedDailyCaloriesKcal || 950} kkal/hari). Pertahankan konsistensi feeding rules dan variasi menu gizi seimbang.`;
    if (problems.length === 0) {
      problems.push(
        '✨ Praktik Makan Sesuai Acuan IDAI: Jadwal makan terstruktur, kontrol lingkungan makan baik, dan kurva antropometri dalam rentang normal.'
      );
    }
  }

  return {
    risk_level,
    clinical_category,
    age_info: {
      totalMonths: age.totalMonths,
      formatted: age.formatted,
    },
    anthropometry,
    problem_areas: problems,
    summary,
    feeding_rule_violations: feedingRuleViolations,
    idai_guidance: idaiGuidance,
  };
}

// Generate unique ID format Rekam Medis
export function generateRecordId(type: 'free' | 'paid'): string {
  const prefix = type === 'paid' ? 'RM-PRO' : 'RM-FREE';
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${randomSuffix}`;
}

// Default Seed Rekam Medis untuk pertama kali jika kosong
export const INITIAL_SAMPLE_RECORDS: ScreeningRecord[] = [
  {
    id: 'RM-PRO-2026-1024',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    type: 'paid',
    status: 'Dalam Review',
    risk_level: 'BUTUH PERHATIAN KHUSUS',
    child_name: 'Arsya Bagas Pratama',
    mother_name: 'Bunda Rina Wardhani',
    father_name: 'Ayah Dimas Pratama',
    phone: '081234567890',
    secondary_phone: '081398765432',
    age_text: '2 tahun 4 bulan',
    gender: 'Laki-laki',
    last_weight: '10.2 kg',
    last_height: '84 cm',
    measurement_date: '2026-09-28',
    summary:
      'GTM kronis sejak usia 14 bulan. Hanya mau nasi kecap dan biskuit. Melepeh makanan berserat, sering muntah jika dipaksa mengunyah daging.',
    clinical_notes:
      'Tim Ziad Medika: Jadwalkan telekonsultasi GMeet Kamis ini. Perlu assessment oral motor mendalam terkait hiper-sensitivitas tekstur.',
    problem_areas: [
      'GTM dan porsi makan sangat minim',
      'Tekstur stagnan di semi-lunak (sulit naik ke makanan keluarga)',
      'BB stagnan 3 bulan berturut-turut',
      'Ketergantungan gadget saat disuapi',
    ],
    paid_data: {
      namaAyah: 'Dimas Pratama',
      waAyah: '081398765432',
      namaIbu: 'Rina Wardhani',
      waIbu: '081234567890',
      email: 'rina.wardhani@gmail.com',
      domisili: 'Cirebon Kota',
      namaLengkapAnak: 'Arsya Bagas Pratama',
      dob: '2024-05-15',
      usiaTerkalkulasi: '2 tahun 4 bulan',
      jenisKelamin: 'Laki-laki',
      bbSekarang: '10.2 kg',
      tbPB: '84 cm',
      tanggalUkur: '2026-09-28',
      bbLahir: '3.1 kg',
      usiaGestasi: '38 minggu',
      riwayatNICU: 'Tidak ada',
      riwayatPenyakit: 'Batuk pilek berulang',
      obatSuplemen: 'Curcuma plus (jarang diminum)',
      alergiIntoleransi: 'Tidak ada alergi yang terkonfirmasi',
      jenisSusu: 'Sufor (SGM Eksplor)',
      jumlahSusuPerHari: '600 ml (4 botol)',
      frekuensiMakanUtama: '2 kali (sering tidak habis)',
      frekuensiSnack: '3-4 kali camilan manis/biskuit',
      durasiMakan: '> 45 menit',
      lokasiMakan: 'Depan TV / digendong keliling',
      pemberiMakan: 'Ibu dan Nenek',
      jadwalMakanHarian: 'Tidak teratur, tergantung kemauan anak',
      makanSambilGadget: 'Ya, nonton YouTube Cocomelon',
      makanSambilJalan: 'Ya, sering keliling komplek',
      seringDibujukDipaksa: 'Ya, sering sampai menangis',
      repertoire: [
        { kategori: 'Karbohidrat', makananMau: 'Nasi lembek, kentang goreng', makananTidakMau: 'Nasi tim, jagung, ubi' },
        { kategori: 'Protein hewani', makananMau: 'Telur dadar tipis, sosis', makananTidakMau: 'Daging sapi, ayam, ikan kembung' },
        { kategori: 'Protein nabati', makananMau: 'Tahu goreng garing', makananTidakMau: 'Tempe, kacang hijau' },
        { kategori: 'Sayur', makananMau: 'Hanya kuah sup bening', makananTidakMau: 'Wortel, bayam, brokoli' },
        { kategori: 'Buah', makananMau: 'Pisang cavendish', makananTidakMau: 'Pepaya, mangga, alpukat' },
        { kategori: 'Dairy', makananMau: 'Keju slice, yogurt pouch', makananTidakMau: 'Susu UHT tawar' },
        { kategori: 'Snack', makananMau: 'Biskuit marie, wafer cokelat', makananTidakMau: 'Buah potong' },
      ],
      jumlahJenisDiterima: '8 jenis makanan',
      teksturDiterima: ['Lunak', 'Cincang halus'],
      bisaMengunyah: 'Bisa tapi malas mengunyah makanan berserat',
      seringGagging: 'Ya, sering saat ada tekstur kasar',
      seringBatuk: 'Kadang-kadang',
      pernahTersedak: 'Pernah saat makan potongan daging ayam',
      melepehMakanan: 'Ya, sangat sering jika merasa ada serat',
      lamaDiMulut: 'Ya, makanan sering dikemut sampai 20 menit',
      sulitNaikTekstur: 'Sangat sulit, muntah jika dipaksa',
      hanyaMauTeksturTertentu: 'Ya, suka yang renyah kering atau kuah bening',
      perilakuMakan: ['Menutup mulut', 'Memalingkan wajah', 'Menangis', 'Harus sambil gadget', 'Sangat lama menghabiskan makanan'],
      alasanSensorik: ['Tekstur', 'Aroma', 'Campuran makanan', 'Takut makanan baru'],
      foodRecall: {
        bangunSusu: 'Sufor 150 ml (jam 06.30)',
        sarapanMenu: 'Nasi lembek 3 suap + telur dadar',
        sarapanPorsi: '1/4 mangkuk kecil',
        snackPagiMenu: 'Biskuit marie 2 keping + sufor 120 ml',
        snackPagiPorsi: 'Habis',
        makanSiangMenu: 'Nasi kuah sop (sayur dilepeh)',
        makanSiangPorsi: '3-4 sendok makan',
        snackSoreMenu: 'Keripik kentang & yogurt',
        snackSorePorsi: '1 pouch yogurt',
        makanMalamMenu: 'Nasi kecap + sosis goreng',
        makanMalamPorsi: '1/3 porsi anak',
        susuSebelumTidur: 'Sufor 180 ml (jam 21.00)',
      },
      riwayatBB: {
        bb1BulanLalu: '10.2 kg',
        bb2BulanLalu: '10.3 kg',
        bb3BulanLalu: '10.2 kg',
        bbSekarang: '10.2 kg',
        bbStagnan: 'Ya, sudah 3 bulan tidak ada kenaikan',
        pernahTurunBB: 'Pernah turun 200 gram saat demam',
        targetBB: '11.5 kg (sesuai kurva WHO)',
      },
      keluhanUtama: ['GTM (Gerakan Tutup Mulut)', 'Porsi makan sedikit', 'Pilih-pilih makanan (Picky Eating)', 'Sulit naik tekstur', 'BB sulit naik / stagnan'],
      keluhanLainnya: 'Sering drama saat jam makan',
      ceritaKondisi:
        'Bunda merasa sangat stress setiap kali tiba jam makan. Arsya langsung histeris kalau lihat mangkuk makan. Harus dibujuk pakai HP dan digendong, itu pun hanya masuk 3-4 suap lalu dikemut lama sekali.',
      pertanyaanDokter1: 'Apakah berat badan Arsya (10.2 kg pada usia 28 bulan) sudah masuk kategori gagal tumbuh dan butuh susu tinggi kalori?',
      pertanyaanDokter2: 'Bagaimana cara mengatasi kebiasaan mengemut makanan hingga 20 menit dan rasa takut terhadap serat daging/sayur?',
      pertanyaanDokter3: 'Apakah kami harus langsung menyetop tontonan HP dan bujukan saat makan secara mendadak atau ada fase adaptasinya?',
      doctorSubmission: {
        isSentToDoctor: true,
        sentAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        sentByAdminName: 'Admin Rekam Medis',
        reportContent: `LAPORAN PASIEN ASESMEN LENGKAP — ARSYA BAGAS PRATAMA (28 Bulan / BB 10.2 kg / TB 84 cm)\n\n1. Ringkasan Masalah Utama:\n- BB stagnan 3 bulan di 10.2 kg (Wasting / Gizi Kurang akut perlu kejar tumbuh).\n- GTM berat disertai mengemut makanan (pocketing) >20 menit dan melepeh serat daging/sayur.\n- Ketergantungan layar HP dan makan sambil digendong.\n\n2. Draf Rekomendasi untuk Direview dr. Harys Maulana:\n- Evaluasi suplementasi Zat Besi & Zinc selama 2-4 minggu.\n- Terapkan aturan makan IDAI (maks 30 menit, duduk di kursi makan, bertahap kurangi layar).\n- Modifikasi tekstur protein hewani menjadi olahan empuk berlemak (perkedel daging giling, rolade ayam kukus santan).`,
        isAcc: false,
        lastEditedBy: 'admin',
        updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
    },
  },
  {
    id: 'RM-PRO-2026-1089',
    created_at: new Date(Date.now() - 3600000 * 9).toISOString(),
    type: 'paid',
    status: 'Baru',
    risk_level: 'PERLU DIPERHATIKAN',
    child_name: 'Alesha Zahra Putri',
    mother_name: 'Bunda Nabila Putri',
    father_name: 'Ayah Reza Mahendra',
    phone: '081288991122',
    secondary_phone: '081288993344',
    age_text: '1 Tahun 3 Bulan (15 Bulan)',
    gender: 'Perempuan',
    last_weight: '8.7 kg',
    last_height: '76.5 cm',
    measurement_date: 'Minggu ini',
    summary:
      'Anak menolak nasi tim/keluarga, hanya mau bubur halus dan susu formula >700 ml/hari. Sering gagging saat mencoba tekstur cincang.',
    clinical_notes:
      'dr. Harys Maulana: Indikasi milk displacement (asupan sufor >700 ml menekan lapar makan padat) disertai hipersensitivitas oral terhadap tekstur kasar.',
    problem_areas: [
      'Asupan susu berlebih (>700 ml/hari) menekan nafsu makan padat',
      'Sulit naik tekstur dari bubur halus ke nasi tim/keluarga',
      'Gagging saat menyentuh makanan bertekstur kasar',
    ],
    paid_data: {
      namaAyah: 'Reza Mahendra',
      waAyah: '081288993344',
      namaIbu: 'Nabila Putri',
      waIbu: '081288991122',
      email: 'nabila.putri@gmail.com',
      domisili: 'Bandung',
      namaLengkapAnak: 'Alesha Zahra Putri',
      dob: '2025-07-12',
      usiaTerkalkulasi: '1 Tahun 3 Bulan (15 Bulan)',
      jenisKelamin: 'Perempuan',
      bbSekarang: '8.7',
      tbPB: '76.5',
      tanggalUkur: '2026-10-20',
      bbLahir: '2.9 kg',
      usiaGestasi: '38 minggu',
      riwayatNICU: 'Tidak',
      riwayatPenyakit: 'Tidak ada',
      obatSuplemen: 'Vitamin D3 400 IU',
      alergiIntoleransi: 'Alergi Seafood (Udang)',
      jenisSusu: 'Sufor',
      jumlahSusuPerHari: '> 600 ml (> 3 botol)',
      frekuensiMakanUtama: '2x sehari',
      frekuensiSnack: '1x sehari',
      durasiMakan: '30-45 menit',
      lokasiMakan: 'Meja makan / kursi makan',
      pemberiMakan: 'Ibu',
      jadwalMakanHarian: 'Kadang maju/mundur',
      makanSambilGadget: 'Tidak',
      makanSambilJalan: 'Ya',
      seringDibujukDipaksa: 'Ya',
      repertoire: [
        { kategori: 'Karbohidrat', makananMau: 'Bubur beras halus, kentang tumbuk', makananTidakMau: 'Nasi utuh, nasi lembek kasar' },
        { kategori: 'Protein hewani', makananMau: 'Kaldu ayam, telur kukus lembut, ikan salmon blender', makananTidakMau: 'Daging sapi cincang, ayam suwir' },
        { kategori: 'Protein nabati', makananMau: 'Tahu sutra kukus', makananTidakMau: 'Tempe goreng, kacang merah' },
        { kategori: 'Sayur', makananMau: 'Labu kuning kukus, wortel puree', makananTidakMau: 'Brokoli, buncis' },
        { kategori: 'Buah', makananMau: 'Alpukat kerok, pisang lumat', makananTidakMau: 'Apel potong, pir' },
        { kategori: 'Dairy', makananMau: 'Keju belcube, butter', makananTidakMau: '-' },
        { kategori: 'Snack', makananMau: 'Puff bayi lumer, puding susu', makananTidakMau: 'Biskuit keras' },
      ],
      jumlahJenisDiterima: '5-10 jenis',
      teksturDiterima: ['Puree', 'Lumat'],
      bisaMengunyah: 'Tidak',
      seringGagging: 'Ya',
      seringBatuk: 'Tidak',
      pernahTersedak: 'Tidak',
      melepehMakanan: 'Ya',
      lamaDiMulut: 'Tidak',
      sulitNaikTekstur: 'Ya',
      hanyaMauTeksturTertentu: 'Ya',
      perilakuMakan: ['Menutup mulut', 'Memalingkan wajah', 'Harus disuapi'],
      alasanSensorik: ['Tekstur', 'Campuran makanan'],
      foodRecall: {
        bangunSusu: 'Sufor 180 ml (jam 06.00)',
        sarapanMenu: 'Bubur ayam halus + keju',
        sarapanPorsi: '4 sendok makan kecil',
        snackPagiMenu: 'Sufor 150 ml + puff bayi',
        snackPagiPorsi: 'Habis',
        makanSiangMenu: 'Kentang tumbuk + telur kukus',
        makanSiangPorsi: 'Setengah mangkuk kecil',
        snackSoreMenu: 'Sufor 180 ml + alpukat kerok',
        snackSorePorsi: '3 sendok teh alpukat',
        makanMalamMenu: 'Tidak makan malam karena kenyang susu',
        makanMalamPorsi: '-',
        susuSebelumTidur: 'Sufor 200 ml (jam 20.30)',
      },
      riwayatBB: {
        bb3BulanLalu: '8.4 kg',
        bb2BulanLalu: '8.5 kg',
        bb1BulanLalu: '8.6 kg',
        bbSekarang: '8.7 kg',
        bbStagnan: 'Ya',
        pernahTurunBB: 'Tidak',
        targetBB: '9.6 kg',
      },
      keluhanUtama: ['Sulit naik tekstur', 'Gagging / batuk / tersedak', 'Porsi makan sedikit', 'BB sulit naik / stagnan'],
      keluhanLainnya: 'Langsung mual kalau ada butiran nasi',
      ceritaKondisi:
        'Alesha sudah 15 bulan tapi masih belum bisa makan nasi tim kasar atau nasi keluarga. Kalau ada butiran sedikit langsung gagging (mual) dan melepeh. Sehari minum sufor bisa 5 botol @150-180ml.',
      pertanyaanDokter1: 'Bagaimana tahapan menaikkan tekstur dari bubur lumat ke makanan keluarga untuk anak 15 bulan yang mudah gagging?',
      pertanyaanDokter2: 'Berapa takaran maksimal susu formula per hari agar Alesha mau lapar saat jam makan utama?',
      pertanyaanDokter3: 'Apakah Alesha memerlukan suplemen zat besi tambahan untuk membantu nafsu makannya?',
    },
  },
  {
    id: 'RM-PRO-2026-1105',
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    type: 'paid',
    status: 'Selesai',
    risk_level: 'PERLU DIPERHATIKAN',
    child_name: 'Kiano Malik Ibrahim',
    mother_name: 'Bunda Tiara Andini',
    father_name: 'Ayah Fajar Ibrahim',
    phone: '081377889900',
    secondary_phone: '081377889911',
    age_text: '3 Tahun 2 Bulan (38 Bulan)',
    gender: 'Laki-laki',
    last_weight: '12.8 kg',
    last_height: '94 cm',
    measurement_date: 'Bulan ini',
    summary:
      'Picky eating selektif terhadap protein hewani (hanya mau nugget/telur) dan menolak semua sayuran serta buah potong. Takut mencoba makanan baru (food neophobia).',
    clinical_notes:
      'dr. Harys Maulana: Program Food Chaining 14 hari sudah dikirimkan ke Bunda. Respon minggu pertama positif, mulai mau mencoba ayam katsu buatan rumah.',
    problem_areas: [
      'Picky eating & Food Neophobia (takut makanan baru)',
      'Penolakan protein hewani utuh & sayuran',
      'Durasi makan >30 menit bila menu baru',
    ],
    paid_data: {
      namaAyah: 'Fajar Ibrahim',
      waAyah: '081377889911',
      namaIbu: 'Tiara Andini',
      waIbu: '081377889900',
      email: 'tiara.ibrahim@gmail.com',
      domisili: 'Jakarta Selatan',
      namaLengkapAnak: 'Kiano Malik Ibrahim',
      dob: '2023-08-18',
      usiaTerkalkulasi: '3 Tahun 2 Bulan (38 Bulan)',
      jenisKelamin: 'Laki-laki',
      bbSekarang: '12.8',
      tbPB: '94',
      tanggalUkur: '2026-10-15',
      bbLahir: '3.3 kg',
      usiaGestasi: '39 minggu',
      riwayatNICU: 'Tidak',
      riwayatPenyakit: 'Sembelit / konstipasi ringan',
      obatSuplemen: 'Probiotik L. reuteri',
      alergiIntoleransi: 'Tidak',
      jenisSusu: 'UHT',
      jumlahSusuPerHari: '400-500 ml (2-3 botol)',
      frekuensiMakanUtama: '3x sehari',
      frekuensiSnack: '2x sehari',
      durasiMakan: '30-45 menit',
      lokasiMakan: 'Meja makan / kursi makan',
      pemberiMakan: 'Ibu',
      jadwalMakanHarian: 'Terjadwal teratur (Jam tetap)',
      makanSambilGadget: 'Tidak',
      makanSambilJalan: 'Tidak',
      seringDibujukDipaksa: 'Ya',
      repertoire: [
        { kategori: 'Karbohidrat', makananMau: 'Nasi putih, roti tawar, mie goreng, kentang goreng', makananTidakMau: 'Nasi merah, bubur' },
        { kategori: 'Protein hewani', makananMau: 'Telur dadar garing, nugget ayam, abon sapi', makananTidakMau: 'Ikan basah, ayam kuah, daging semur' },
        { kategori: 'Protein nabati', makananMau: 'Tempe krispi tipis', makananTidakMau: 'Tahu kuah, edamame' },
        { kategori: 'Sayur', makananMau: 'Hanya wortel parut tipis di dalam nugget', makananTidakMau: 'Semua sayur berdaun hijau' },
        { kategori: 'Buah', makananMau: 'Jus jeruk peras, apel potong tipis', makananTidakMau: 'Pepaya, pisang, buah bertekstur lembek' },
        { kategori: 'Dairy', makananMau: 'Susu UHT cokelat/plain, keju cheddar', makananTidakMau: 'Yogurt asam' },
        { kategori: 'Snack', makananMau: 'Risol mayo, biskuit gandum, stik keju', makananTidakMau: 'Kue basah tradisional' },
      ],
      jumlahJenisDiterima: '10-15 jenis',
      teksturDiterima: ['Makanan keluarga'],
      bisaMengunyah: 'Ya',
      seringGagging: 'Tidak',
      seringBatuk: 'Tidak',
      pernahTersedak: 'Tidak',
      melepehMakanan: 'Tidak',
      lamaDiMulut: 'Tidak',
      sulitNaikTekstur: 'Tidak',
      hanyaMauTeksturTertentu: 'Ya',
      perilakuMakan: ['Menutup mulut', 'Hanya mau makan dengan orang tertentu'],
      alasanSensorik: ['Warna', 'Aroma', 'Bentuk', 'Takut makanan baru'],
      foodRecall: {
        bangunSusu: 'Susu UHT 125 ml (jam 06.30)',
        sarapanMenu: 'Nasi putih + telur dadar garing',
        sarapanPorsi: '1 porsi anak habis',
        snackPagiMenu: 'Roti bakar keju',
        snackPagiPorsi: '1 lembar',
        makanSiangMenu: 'Nasi putih + nugget ayam homemade',
        makanSiangPorsi: '3/4 porsi',
        snackSoreMenu: 'Apel potong tipis + stik keju',
        snackSorePorsi: '4 iris apel',
        makanMalamMenu: 'Mie goreng telur + abon sapi',
        makanMalamPorsi: 'Habis',
        susuSebelumTidur: 'Susu UHT 200 ml (jam 20.00)',
      },
      riwayatBB: {
        bb3BulanLalu: '12.4 kg',
        bb2BulanLalu: '12.5 kg',
        bb1BulanLalu: '12.7 kg',
        bbSekarang: '12.8 kg',
        bbStagnan: 'Tidak',
        pernahTurunBB: 'Tidak',
        targetBB: '14.0 kg',
      },
      keluhanUtama: ['Pilih-pilih makanan (Picky Eating)', 'Tidak mau protein', 'Tidak mau sayur/buah'],
      keluhanLainnya: 'Takut melihat makanan berwarna hijau atau berkuah kental',
      ceritaKondisi:
        'Kiano makannya sebenarnya lahap kalau menunya telur dadar atau nugget terus, tapi menolak keras kalau melihat sayur hijau, ikan, atau daging berkuah. Kami khawatir gizinya kurang seimbang dan sering sembelit.',
      pertanyaanDokter1: 'Bagaimana metode Food Chaining dari telur dadar dan nugget agar Kiano mau makan ikan dan daging ayam utuh?',
      pertanyaanDokter2: 'Bagaimana cara mengenalkan sayur dan buah tanpa membuat Kiano trauma atau menutup mulut?',
      pertanyaanDokter3: 'Apakah konstipasi ringan Kiano berkaitan dengan kurangnya serat atau kelebihan produk dairy/susu?',
      doctorSubmission: {
        isSentToDoctor: true,
        sentAt: new Date(Date.now() - 3600000 * 10).toISOString(),
        sentByAdminName: 'Admin Rekam Medis',
        reportContent: `LAPORAN PASIEN ASESMEN LENGKAP — KIANO MALIK IBRAHIM (38 Bulan / BB 12.8 kg / TB 94 cm)\n\n1. Evaluasi Klinis & Food Chaining (Telah Direview dr. Harys Maulana):\n- Status gizi proporsional namun mengalami Selective Eating / Food Neophobia terhadap protein basah dan sayur hijau.\n- Program Food Chaining 14 Hari: Jembatani dari nugget ayam ke chicken katsu homemade -> fish finger -> bola daging panggang.\n- Batasi susu UHT maksimal 350-400 ml/hari dan tingkatkan asupan cairan + buah apel/pir untuk mengatasi konstipasi ringan.`,
        isAcc: true,
        accAt: new Date(Date.now() - 3600000 * 6).toISOString(),
        lastEditedBy: 'dokter',
        updatedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      },
    },
  },
  {
    id: 'RM-FREE-2026-8821',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    type: 'free',
    status: 'Baru',
    risk_level: 'PERLU DIPERHATIKAN',
    child_name: 'Mikayla Zanna Kirana',
    mother_name: 'Bunda Novita Sari',
    phone: '085712349988',
    age_text: '18 bulan',
    gender: 'Perempuan',
    last_weight: '9.4 kg',
    last_height: '78 cm',
    measurement_date: '2026-10-01',
    summary:
      'Anak mulai menolak nasi dan sayuran, durasi makan sering >30 menit dan harus disetelkan video lagu anak agar mau mangap.',
    clinical_notes: '',
    problem_areas: [
      '🍽️ Pola makan: Mulai menunjukkan tanda selektivitas makan',
      '⏰ Durasi makan: Cenderung berlarut-larut (>30 menit)',
      '📱 Distraksi: Masih bergantung pada video lagu anak',
    ],
    free_data: {
      namaAnak: 'Mikayla Zanna Kirana',
      namaIbu: 'Novita Sari',
      noHp: '085712349988',
      tanggalLahir: '2025-04-10',
      usiaAnak: '18 bulan',
      jenisKelamin: 'Perempuan',
      bbTerakhir: '9.4 kg',
      tbTerakhir: '78 cm',
      usiaPengukuran: '17 bulan',
      seringMenolak: 'Kadang',
      hanyaMauTertentu: 'Ya',
      menolakMakananBaru: 'Ya',
      porsiSangatSedikit: 'Kadang',
      butuhDistraksi: 'Ya',
      waktuMakanLebih30Mnt: 'Ya',
      responMenolak: 'Kadang',
      melepehMakanan: 'Kadang',
      kesulitanKunyahTelan: 'Tidak',
      pernahTersedak: 'Tidak',
      karbohidratMau: 'Kentang, mie, roti',
      proteinMau: 'Ayam krispi, keju',
      sayurMau: 'Sangat jarang, hampir tidak mau',
      buahMau: 'Semangka, jeruk manis',
      makananDitolak: 'Nasi putih, brokoli, ikan kukus',
      teksturDiterima: 'Garing dan renyah',
      jadwalMakanUtama: 'Jam 08.00, 13.00, 19.00',
      jadwalSnack: 'Jam 10.30 & 16.00',
      susuHarian: 'UHT 400 ml/hari',
      makanSambilGadget: 'Ya',
      seringDipaksaBujuk: 'Kadang',
      digantiSusuSnack: 'Ya',
    },
  },
  {
    id: 'RM-FREE-2026-3012',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    type: 'free',
    status: 'Selesai',
    risk_level: 'NORMAL',
    child_name: 'Kenzo Althaf',
    mother_name: 'Bunda Fitriani',
    phone: '081908765411',
    age_text: '3 tahun',
    gender: 'Laki-laki',
    last_weight: '14.1 kg',
    last_height: '96 cm',
    measurement_date: '2026-09-20',
    summary:
      'Pola makan secara umum baik, nafsu makan stabil, hanya kadang menolak sayuran hijau baru.',
    clinical_notes: 'Sudah follow up via WA. Bunda diedukasi teknik food bridging untuk sayuran.',
    problem_areas: ['✨ Feeding habits: Menunjukkan sinyal positif dan respons adaptif'],
    free_data: {
      namaAnak: 'Kenzo Althaf',
      namaIbu: 'Fitriani',
      noHp: '081908765411',
      tanggalLahir: '2023-09-15',
      usiaAnak: '3 tahun',
      jenisKelamin: 'Laki-laki',
      bbTerakhir: '14.1 kg',
      tbTerakhir: '96 cm',
      usiaPengukuran: '36 bulan',
      seringMenolak: 'Tidak',
      hanyaMauTertentu: 'Kadang',
      menolakMakananBaru: 'Kadang',
      porsiSangatSedikit: 'Tidak',
      butuhDistraksi: 'Tidak',
      waktuMakanLebih30Mnt: 'Tidak',
      responMenolak: 'Tidak',
      melepehMakanan: 'Tidak',
      kesulitanKunyahTelan: 'Tidak',
      pernahTersedak: 'Tidak',
      karbohidratMau: 'Nasi, mie, kentang, roti',
      proteinMau: 'Ayam, telur, ikan nila, tahu, tempe',
      sayurMau: 'Wortel sup, bayam bening',
      buahMau: 'Pisang, pepaya, apel',
      makananDitolak: 'Pare, brokoli mentah',
      teksturDiterima: 'Makanan keluarga normal',
      jadwalMakanUtama: 'Teratur 3x sehari bersama keluarga',
      jadwalSnack: '2x sehari buah / biskuit',
      susuHarian: 'UHT 250 ml menjelang tidur',
      makanSambilGadget: 'Tidak',
      seringDipaksaBujuk: 'Tidak',
      digantiSusuSnack: 'Tidak',
    },
  },
];

// Helper memeriksa apakah record berasal dari /community (agar tidak pernah bocor ke /rm)
function isCommunityRecordLeak(rec: Partial<ScreeningRecord>): boolean {
  if (!rec) return false;
  const id = String(rec.id || '');
  const summary = String(rec.summary || '');
  return (
    id.startsWith('LB-COMM-') ||
    id.startsWith('COMM-') ||
    summary.startsWith('[Little Bite')
  );
}

// Helper Mengambil data dari localStorage (khusus /rm & /screening, terpisah dari /community)
function getLocalRecords(): ScreeningRecord[] {
  if (typeof window === 'undefined') return INITIAL_SAMPLE_RECORDS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_SAMPLE_RECORDS));
      return INITIAL_SAMPLE_RECORDS;
    }
    const parsedRaw: ScreeningRecord[] = JSON.parse(raw);
    if (!Array.isArray(parsedRaw)) return INITIAL_SAMPLE_RECORDS;

    // Bersihkan jika ada data lama dari /community yang pernah tersimpan di localStorage /rm
    const parsed = parsedRaw.filter((r) => !isCommunityRecordLeak(r));
    const hadLeakedCommunityData = parsed.length !== parsedRaw.length;

    const existingIds = new Set(parsed.map((r: ScreeningRecord) => r.id));
    const missingSamples = INITIAL_SAMPLE_RECORDS.filter((s) => !existingIds.has(s.id));

    let changed = missingSamples.length > 0 || hadLeakedCommunityData;
    const upgraded = parsed.map((rec) => {
      const sampleMatch = INITIAL_SAMPLE_RECORDS.find((s) => s.id === rec.id);
      if (
        sampleMatch?.paid_data?.doctorSubmission &&
        rec.paid_data &&
        !rec.paid_data.doctorSubmission
      ) {
        changed = true;
        return {
          ...rec,
          paid_data: {
            ...rec.paid_data,
            doctorSubmission: sampleMatch.paid_data.doctorSubmission,
          },
        };
      }
      return rec;
    });

    const finalRecords = [...upgraded, ...missingSamples];
    if (changed) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(finalRecords));
    }
    return finalRecords;
  } catch (e) {
    console.error('Failed to read local records:', e);
    return INITIAL_SAMPLE_RECORDS;
  }
}

// Simpan ke Local Storage
function setLocalRecords(records: ScreeningRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save to local storage:', e);
  }
}

// SIMPAN RECORD BARU (Dual-Write: Local Storage + Supabase)
export async function saveScreeningRecord(record: ScreeningRecord): Promise<{
  success: boolean;
  id: string;
  supabaseSynced: boolean;
  error?: string;
}> {
  // 1. Simpan ke local storage selalu berhasil dan instan
  const existing = getLocalRecords();
  const updated = [record, ...existing.filter((r) => r.id !== record.id)];
  setLocalRecords(updated);

  let supabaseSynced = false;
  let supabaseError = '';

  // 2. Coba simpan ke Supabase
  try {
    const { error } = await supabase.from('screenings').upsert([
      {
        id: record.id,
        created_at: record.created_at,
        type: record.type,
        status: record.status,
        risk_level: record.risk_level,
        child_name: record.child_name,
        mother_name: record.mother_name,
        father_name: record.father_name || null,
        phone: record.phone,
        secondary_phone: record.secondary_phone || null,
        age_text: record.age_text,
        gender: record.gender,
        last_weight: record.last_weight,
        last_height: record.last_height,
        measurement_date: record.measurement_date || null,
        summary: record.summary,
        problem_areas: record.problem_areas || [],
        clinical_notes: record.clinical_notes || '',
        free_data: record.free_data || null,
        paid_data: record.paid_data || null,
      },
    ]);

    if (!error) {
      supabaseSynced = true;
    } else {
      supabaseError = error.message;
      console.warn('Supabase upsert note:', error.message);
    }
  } catch (err: any) {
    supabaseError = err?.message || 'Network / Supabase schema issue';
    console.warn('Supabase sync exception:', supabaseError);
  }

  return {
    success: true,
    id: record.id,
    supabaseSynced,
    error: supabaseError,
  };
}

// AMBIL SEMUA RECORD (Merge dari Supabase jika ada, fallback local storage)
export async function fetchAllScreenings(): Promise<{
  records: ScreeningRecord[];
  fromSupabase: boolean;
}> {
  const localList = getLocalRecords();

  try {
    const { data, error } = await supabase
      .from('screenings')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      // Format Supabase data ke tipe ScreeningRecord (pastikan tidak mencampur data /community)
      const remoteRecords: ScreeningRecord[] = data
        .filter((item) => !isCommunityRecordLeak(item))
        .map((item) => ({
          id: item.id,
          created_at: item.created_at || new Date().toISOString(),
          type: item.type as any,
          status: (item.status as any) || 'Baru',
          risk_level: (item.risk_level as any) || 'PERLU DIPERHATIKAN',
          child_name: item.child_name || 'Tanpa Nama',
          mother_name: item.mother_name || '-',
          father_name: item.father_name || undefined,
          phone: item.phone || '',
          secondary_phone: item.secondary_phone || undefined,
          age_text: item.age_text || '-',
          gender: item.gender || 'Laki-laki',
          last_weight: item.last_weight || '-',
          last_height: item.last_height || '-',
          measurement_date: item.measurement_date || undefined,
          summary: item.summary || '',
          clinical_notes: item.clinical_notes || '',
          problem_areas: item.problem_areas || [],
          free_data: item.free_data || undefined,
          paid_data: item.paid_data || undefined,
        }));

      // Merge dengan data local yang belum ada di remote
      const remoteIds = new Set(remoteRecords.map((r) => r.id));
      const unmergedLocals = localList.filter((l) => !remoteIds.has(l.id));
      const merged = [...remoteRecords, ...unmergedLocals];

      setLocalRecords(merged);
      return { records: merged, fromSupabase: true };
    }
  } catch (e) {
    console.warn('Could not fetch from Supabase table directly, using local store:', e);
  }

  return { records: localList, fromSupabase: false };
}

// UPDATE STATUS, CATATAN KLINIS, ATAU KOLOM LAPORAN DOKTER (REALTIME SYNC)
export async function updateRecordDetails(
  id: string,
  updates: Partial<Pick<ScreeningRecord, 'status' | 'clinical_notes' | 'paid_data'>>
): Promise<boolean> {
  const records = getLocalRecords();
  const index = records.findIndex((r) => r.id === id);
  if (index !== -1) {
    records[index] = {
      ...records[index],
      ...updates,
      paid_data: updates.paid_data
        ? { ...records[index].paid_data, ...updates.paid_data }
        : records[index].paid_data,
    };
    setLocalRecords(records);
  }

  // Broadcast realtime ke tab Admin / Dokter lain di browser yang sama
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new Event('storage'));
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('tka_rm_realtime_channel');
        bc.postMessage({ type: 'RECORD_UPDATED', id, timestamp: Date.now() });
        bc.close();
      }
    } catch (err) {
      console.warn('BroadcastChannel note:', err);
    }
  }

  try {
    await supabase.from('screenings').update(updates).eq('id', id);
  } catch (e) {
    console.warn('Supabase update note:', e);
  }

  return true;
}

// HAPUS RECORD
export async function deleteRecord(id: string): Promise<boolean> {
  const records = getLocalRecords();
  const filtered = records.filter((r) => r.id !== id);
  setLocalRecords(filtered);

  try {
    await supabase.from('screenings').delete().eq('id', id);
  } catch (e) {
    console.warn('Supabase delete note:', e);
  }

  return true;
}

// SINKRONISASI SEMUA RECORD KE SUPABASE (1-CLICK CLOUD SYNC DARI /rm)
export async function syncRecordsToSupabase(recordsToSync: ScreeningRecord[]): Promise<{
  success: boolean;
  syncedCount: number;
  error?: string;
}> {
  if (!recordsToSync.length) {
    return { success: true, syncedCount: 0 };
  }

  try {
    const payload = recordsToSync.map((record) => ({
      id: record.id,
      created_at: record.created_at,
      type: record.type,
      status: record.status,
      risk_level: record.risk_level,
      child_name: record.child_name,
      mother_name: record.mother_name,
      father_name: record.father_name || null,
      phone: record.phone,
      secondary_phone: record.secondary_phone || null,
      age_text: record.age_text,
      gender: record.gender,
      last_weight: record.last_weight,
      last_height: record.last_height,
      measurement_date: record.measurement_date || null,
      summary: record.summary,
      problem_areas: record.problem_areas || [],
      clinical_notes: record.clinical_notes || '',
      free_data: record.free_data || null,
      paid_data: record.paid_data || null,
    }));

    const { error } = await supabase
      .from('screenings')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      return {
        success: false,
        syncedCount: 0,
        error: error.message,
      };
    }

    return {
      success: true,
      syncedCount: payload.length,
    };
  } catch (e: any) {
    return {
      success: false,
      syncedCount: 0,
      error: e?.message || 'Gagal menghubungi server Supabase',
    };
  }
}

