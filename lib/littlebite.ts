import { FoodRepertoireRow, Gender } from '@/types/screening';
import { calculateAgeFromDob, evaluateAnthropometry, parseMetricNumber } from './anthropometry';

export type FeedingRuleCode =
  | 'R1'
  | 'R2'
  | 'R3'
  | 'R4'
  | 'R5'
  | 'R6'
  | 'R7'
  | 'R8'
  | 'R9'
  | 'R10'
  | 'R11';

export interface FeedingRuleDefinition {
  code: FeedingRuleCode;
  targetTitle: string;
  triggerQuestions: string;
  parentCorrectionText: string;
  positiveSummaryText: string;
}

export const FEEDING_RULES_MAP: Record<FeedingRuleCode, FeedingRuleDefinition> = {
  R1: {
    code: 'R1',
    targetTitle: 'Jadwal tetap: 3 makan utama dan 2 selingan di jam yang sama tiap hari',
    triggerQuestions: '6.1, 6.3',
    parentCorrectionText:
      'Atur 3 kali makan utama dan 2 kali selingan di jam yang sama setiap hari. Tulis jadwalnya di kulkas supaya semua pengasuh mengikuti.',
    positiveSummaryText: 'Jadwal 3 kali makan utama dan jam makan harian sudah teratur',
  },
  R2: {
    code: 'R2',
    targetTitle: 'Jeda 2 sampai 3 jam antar waktu makan, tidak ngemil atau minum manis di luar jadwal',
    triggerQuestions: '6.2, 6.4, 6.14',
    parentCorrectionText:
      'Beri jeda 2 sampai 3 jam antar waktu makan. Di luar jadwal hanya air putih. Rasa lapar yang cukup membuat anak mau makan saat jadwalnya tiba.',
    positiveSummaryText: 'Jeda antar waktu makan 2–3 jam terjaga dan tidak ngemil di luar jadwal',
  },
  R3: {
    code: 'R3',
    targetTitle: 'Satu kali makan maksimal 30 menit',
    triggerQuestions: '6.5',
    parentCorrectionText:
      'Batasi satu kali makan maksimal 30 menit. Setelah itu angkat piringnya tanpa komentar, dan tawarkan lagi di jadwal berikutnya.',
    positiveSummaryText: 'Durasi satu kali makan sudah baik (maksimal 30 menit)',
  },
  R4: {
    code: 'R4',
    targetTitle: 'Tempat tetap, duduk di kursi makan',
    triggerQuestions: '6.6',
    parentCorrectionText:
      'Dudukkan anak di kursi makan di tempat yang sama setiap kali. Hentikan makan sambil berjalan, digendong, atau dikejar.',
    positiveSummaryText: 'Anak sudah makan dengan duduk tenang di kursi makan atau meja',
  },
  R5: {
    code: 'R5',
    targetTitle: 'Tanpa layar (TV, HP, video) dan tanpa mainan',
    triggerQuestions: '6.7',
    parentCorrectionText:
      'Matikan TV, simpan HP dan mainan selama makan. Perhatian anak harus tertuju pada makanan dan orang di meja.',
    positiveSummaryText: 'Sesi makan bebas dari layar (TV/HP/video) dan mainan',
  },
  R6: {
    code: 'R6',
    targetTitle: 'Tanpa paksaan, ancaman, atau hadiah; makanan diangkat dengan tenang bila ditolak',
    triggerQuestions: '6.8',
    parentCorrectionText:
      'Jangan memaksa, mengancam, atau menjanjikan hadiah. Tugas orang tua menyajikan makanan; anak yang memutuskan makan atau tidak, dan berapa banyak.',
    positiveSummaryText: 'Orang tua merespons penolakan makan dengan tenang tanpa paksaan',
  },
  R7: {
    code: 'R7',
    targetTitle: 'Anak diberi kesempatan makan sendiri sesuai usia',
    triggerQuestions: '6.9',
    parentCorrectionText:
      'Biarkan anak memegang sendok atau makanan jari. Berantakan itu bagian dari belajar makan.',
    positiveSummaryText: 'Anak sudah diberi kesempatan belajar makan mandiri sesuai usia',
  },
  R8: {
    code: 'R8',
    targetTitle: 'Susu dan minum dibatasi dan tidak mengganggu makan',
    triggerQuestions: '3.a sampai 3.g',
    parentCorrectionText:
      'Atur susu dan minum di luar waktu makan, dan jangan memberikannya 1 jam sebelum makan utama. Ganti botol dengan gelas sesuai usia. Hentikan susu kental manis.',
    positiveSummaryText: 'Pemberian susu dan cairan sudah teratur serta tidak mengganggu jam makan utama',
  },
  R9: {
    code: 'R9',
    targetTitle: 'Makanan baru ditawarkan berulang, sekitar 10 sampai 15 kali',
    triggerQuestions: '6.12',
    parentCorrectionText:
      'Tawarkan makanan baru berulang sampai 10 sampai 15 kali dalam porsi sangat kecil, tanpa tekanan. Penolakan awal itu normal.',
    positiveSummaryText: 'Makanan baru dikenalkan secara sabar dan berulang (>10 kali)',
  },
  R10: {
    code: 'R10',
    targetTitle: 'Semua pengasuh konsisten dan anak makan bersama keluarga',
    triggerQuestions: '6.10, 6.11',
    parentCorrectionText:
      'Samakan aturan antar pengasuh. Ajak anak makan bersama keluarga dengan menu yang sama, dan beri contoh dengan ikut makan.',
    positiveSummaryText: 'Aturan makan antar pengasuh konsisten dan anak makan bersama keluarga',
  },
  R11: {
    code: 'R11',
    targetTitle: 'Porsi kecil dan bertahap, sesuai usia',
    triggerQuestions: '6.13',
    parentCorrectionText:
      'Sajikan porsi kecil dulu (1 sampai 2 sendok per jenis), tambah bila anak minta. Piring penuh sering membuat anak menolak.',
    positiveSummaryText: 'Penyajian porsi makan bertahap dan sesuai kemampuan usia anak',
  },
};

// Urutan prioritas koreksi sesuai PDF Hal. 9: R6, R2, R5, R8, R3, R4, R1, R9, R7, R10, R11
export const PRIORITY_RULE_ORDER: FeedingRuleCode[] = [
  'R6',
  'R2',
  'R5',
  'R8',
  'R3',
  'R4',
  'R1',
  'R9',
  'R7',
  'R10',
  'R11',
];

export interface RedFlagGroupItem {
  id: string;
  kelompok: string;
  gejala: string;
}

export const RED_FLAG_GROUPS: RedFlagGroupItem[] = [
  {
    id: 'rf_menelan_napas',
    kelompok: 'Sering tersedak atau batuk saat makan',
    gejala: 'Anak sering tersedak, batuk-batuk, suara napas terdengar "grok-grok" saat/habis makan, atau sering batuk pilek berulang',
  },
  {
    id: 'rf_pencernaan',
    kelompok: 'Masalah perut & pencernaan',
    gejala: 'Sering muntah menyembur, BAB ada darah, sering rewel kesakitan perut, atau sembelit (tidak BAB lebih dari 3 hari)',
  },
  {
    id: 'rf_pertumbuhan',
    kelompok: 'Berat badan tidak naik / turun',
    gejala: 'Berat badan turun atau jalan di tempat (tidak naik sama sekali) selama 2 bulan terakhir',
  },
  {
    id: 'rf_dehidrasi_umum',
    kelompok: 'Anak tampak lemas atau jarang pipis',
    gejala: 'Pipis sangat sedikit (kurang dari 3 kali sehari), wajah tampak pucat, anak terlihat lemas/lesu, atau sering demam',
  },
  {
    id: 'rf_pola_makan_ekstrem',
    kelompok: 'Sangat pilih-pilih makanan',
    gejala: 'Sama sekali menolak satu jenis makanan (misal tidak mau semua jenis daging/ikan/telur), makanan yang mau dimakan kurang dari 10 macam, atau belum mau makanan padat padahal usia sudah di atas 1 tahun',
  },
  {
    id: 'rf_perilaku',
    kelompok: 'Takut atau menangis hebat saat makan',
    gejala: 'Anak tampak takut makan (misal karena pernah tersedak), atau langsung menangis histeris/panik setiap melihat makanan',
  },
  {
    id: 'rf_perkembangan',
    kelompok: 'Perkembangan bicara atau gerak',
    gejala: 'Pernah diberitahu dokter atau bidan bahwa anak agak terlambat bicara atau terlambat gerak (seperti duduk/berjalan)',
  },
];

export interface LittleBiteScreeningData {
  // Bagian 1: Data Orang Tua
  namaAyah: string;
  waAyah: string;
  namaIbu: string;
  waIbu: string;
  email: string;
  domisili: string;

  // Bagian 2: Data Anak (Diperluas)
  namaLengkapAnak: string;
  dob: string;
  jenisKelamin: Gender;
  bbSekarang: string;
  tbPB: string;
  tanggalUkur: string;
  statusKelahiran: 'Cukup bulan' | 'Prematur';
  usiaKehamilanMinggu: string;
  bbLahir: string;
  pbLahir: string;
  asiEksklusifBulan: string;
  usiaMulaiMpasiBulan: string;
  teksturMpasiPertama: string;
  adaAlergi: 'Ya' | 'Tidak';
  pemicuAlergi: string;
  penyakitPenyertaRawatInap: string;
  obatSuplemenRutin: string;
  adaKeterlambatanPerkembangan: 'Ya' | 'Tidak';
  detailKeterlambatanPerkembangan: string;

  // Bagian 3: Riwayat Makan + Susu dan Minum (3.a s/d 3.g -> R8)
  q3a_minumanUtama: string[];
  q3b_totalSusu24Jam: string;
  q3b_satuanSusu: 'ml/hari' | 'botol/hari' | 'kali menyusu langsung/hari';
  q3c_caraMinumSusu: string;
  q3d_waktuMinumSusu: string[];
  q3e_gelasAirPutih: string;
  q3f_minumanManisKemasan: string;
  q3g_minumBanyakSaatMakan: string;

  // Bagian 4: Food Repertoire
  repertoire: FoodRepertoireRow[];
  jumlahJenisDiterima: string;

  // Bagian 5: Tekstur & Oral Motor
  teksturDiterima: string[];
  bisaMengunyah: string;
  seringGagging: string;
  seringBatuk: string;
  pernahTersedak: string;
  melepehMakanan: string;
  lamaDiMulut: string;
  sulitNaikTekstur: string;
  hanyaMauTeksturTertentu: string;

  // Bagian 6: Kebiasaan & Aturan Makan (6.1 s/d 6.14 -> R1 s/d R11)
  q6_1_frekuensiMakanUtama: string;
  q6_2_frekuensiSelingan: string;
  q6_3_jamMakanSama: string;
  q6_4_jedaTerpendek: string;
  q6_5_durasiMakan: string;
  q6_6_lokasiCaraMakan: string[];
  q6_7_pendampingMakan: string[];
  q6_8_responMenolakMakan: string[];
  q6_9_kemandirianMakan: string;
  q6_10_pengasuhMenyuapi: string[];
  q6_10_konsistensiAturan: 'Sama' | 'Berbeda' | 'Tidak tahu';
  q6_11_makanBersamaKeluarga: string;
  q6_12_tawaranMakananBaru: string;
  q6_13_porsiDisajikan: string;
  q6_14_mintaCamilanLuarJadwal: string;

  // Bagian 7: Perilaku Saat Makan
  perilakuMakan: string[];

  // Bagian 8: Sensorik
  alasanSensorik: string[];

  // Bagian 9: 24-Hour Food Recall
  foodRecall: {
    bangunSusu: string;
    sarapanMenu: string;
    sarapanPorsi: string;
    snackPagiMenu: string;
    snackPagiPorsi: string;
    makanSiangMenu: string;
    makanSiangPorsi: string;
    snackSoreMenu: string;
    snackSorePorsi: string;
    makanMalamMenu: string;
    makanMalamPorsi: string;
    susuSebelumTidur: string;
  };

  // Bagian 10: Riwayat Berat Badan (Diperluas)
  riwayatBB: {
    bb3BulanLalu: string;
    bb2BulanLalu: string;
    bb1BulanLalu: string;
    bbSekarang: string;
    tbTerakhir: string;
    tanggalUkurTerakhir: string;
    lingkarKepalaTerakhir: string;
    fotoKurvaDataUrl?: string;
    fotoKurvaNamaFile?: string;
    bbStagnan: string;
    pernahTurunBB: string;
    targetBB: string;
  };

  // Bagian 11: Keluhan, Red Flag, Tanya Dokter & Persetujuan Data
  redFlagsSelected: string[]; // IDs from RED_FLAG_GROUPS
  sejakKapanMasalahMakan: string;
  upayaYangSudahDicoba: string;
  harapanOrangTuaPilihan: string[];
  harapanOrangTuaIsian: string;
  keluhanUtama: string[];
  ceritaKondisi: string;
  pertanyaanDokter1: string;
  pertanyaanDokter2: string;
  pertanyaanDokter3: string;
  persetujuanDataTimMedis: boolean;
  persetujuanKontakWhatsApp: boolean;
}

export type LittleBiteCategoryName =
  | 'Prioritas dokter'
  | 'Masalah aturan makan'
  | 'Selective eating'
  | 'Oral-motor atau tekstur'
  | 'Nafsu makan kecil, BB baik'
  | 'Pola makan sesuai';

export interface LittleBiteRuleStatus {
  code: FeedingRuleCode;
  status: 'Sesuai' | 'Perlu koreksi';
  triggers: string[];
  definition: FeedingRuleDefinition;
}

export interface LittleBiteEvaluationResult {
  ageMonths: number;
  ageFormatted: string;
  category: LittleBiteCategoryName;
  categoryReason: string;
  nextStepText: string;
  recommendedPackage: string;
  hasRedFlags: boolean;
  redFlagLabels: string[];
  ruleStatuses: Record<FeedingRuleCode, LittleBiteRuleStatus>;
  violatedRulesInPriorityOrder: LittleBiteRuleStatus[];
  top3PriorityCorrections: LittleBiteRuleStatus[];
  compliantRules: LittleBiteRuleStatus[];
  totalViolatedCount: number;
  isHomeFeedingPatternMainCause: boolean; // True if >= 6 rules violated
  whatsappMessageTemplate: string;
}

export function evaluateLittleBiteAssessment(
  data: LittleBiteScreeningData,
  reviewerDoctorNote?: string
): LittleBiteEvaluationResult {
  const age = calculateAgeFromDob(data.dob);
  const ageMonths = age.totalMonths;
  const ageFormatted = age.isValidAgeRange ? age.formatted : '-';

  const triggersByRule: Record<FeedingRuleCode, string[]> = {
    R1: [],
    R2: [],
    R3: [],
    R4: [],
    R5: [],
    R6: [],
    R7: [],
    R8: [],
    R9: [],
    R10: [],
    R11: [],
  };

  // --- Evaluasi R1 (6.1, 6.3) ---
  if (data.q6_1_frekuensiMakanUtama !== '3 kali') {
    triggersByRule.R1.push(`6.1 Makan utama: ${data.q6_1_frekuensiMakanUtama}`);
  }
  if (
    data.q6_3_jamMakanSama === 'Kadang' ||
    data.q6_3_jamMakanSama === 'Tidak teratur'
  ) {
    triggersByRule.R1.push(`6.3 Jam makan: ${data.q6_3_jamMakanSama}`);
  }

  // --- Evaluasi R2 (6.2, 6.4, 6.14) ---
  if (
    data.q6_2_frekuensiSelingan === '3 kali atau lebih' ||
    data.q6_2_frekuensiSelingan === 'Ngemil terus sepanjang hari'
  ) {
    triggersByRule.R2.push(`6.2 Selingan: ${data.q6_2_frekuensiSelingan}`);
  }
  if (data.q6_4_jedaTerpendek === 'Kurang dari 2 jam') {
    triggersByRule.R2.push('6.4 Jeda antar waktu makan kurang dari 2 jam');
  }
  if (data.q6_14_mintaCamilanLuarJadwal !== 'Tidak diberi') {
    triggersByRule.R2.push(`6.14 Camilan di luar jadwal: ${data.q6_14_mintaCamilanLuarJadwal}`);
  }

  // --- Evaluasi R3 (6.5) ---
  if (
    data.q6_5_durasiMakan === '30 sampai 45 menit' ||
    data.q6_5_durasiMakan === 'Lebih dari 45 menit'
  ) {
    triggersByRule.R3.push(`6.5 Durasi makan: ${data.q6_5_durasiMakan}`);
  }

  // --- Evaluasi R4 (6.6) ---
  const nonSeatedLocations = data.q6_6_lokasiCaraMakan.filter(
    (loc) => loc !== 'Kursi makan' && loc !== 'Meja atau lantai sambil duduk'
  );
  if (nonSeatedLocations.length > 0 || data.q6_6_lokasiCaraMakan.length === 0) {
    triggersByRule.R4.push(
      `6.6 Cara/tempat makan: ${nonSeatedLocations.join(', ') || 'Belum duduk di kursi/meja makan'}`
    );
  }

  // --- Evaluasi R5 (6.7) ---
  const distractions = data.q6_7_pendampingMakan.filter((item) => item !== 'Tidak ada');
  if (distractions.length > 0) {
    triggersByRule.R5.push(`6.7 Distraksi saat makan: ${distractions.join(', ')}`);
  }

  // --- Evaluasi R6 (6.8) ---
  const coerciveResponses = data.q6_8_responMenolakMakan.filter(
    (resp) => resp !== 'Makanan diangkat dengan tenang'
  );
  if (coerciveResponses.length > 0) {
    triggersByRule.R6.push(`6.8 Respons saat anak menolak: ${coerciveResponses.join(', ')}`);
  }

  // --- Evaluasi R7 (6.9 - Hanya untuk anak usia 6 bulan ke atas) ---
  if (ageMonths >= 6) {
    if (
      data.q6_9_kemandirianMakan === 'Disuapi penuh' ||
      data.q6_9_kemandirianMakan === 'Tidak dibolehkan berantakan'
    ) {
      triggersByRule.R7.push(`6.9 Kemandirian makan: ${data.q6_9_kemandirianMakan}`);
    }
  }

  // --- Evaluasi R8 (3.a s/d 3.g) ---
  if (data.q3a_minumanUtama.includes('Susu kental manis')) {
    triggersByRule.R8.push('3.a Minuman mengandung Susu Kental Manis');
  }
  const milkNum = parseMetricNumber(data.q3b_totalSusu24Jam);
  if (!isNaN(milkNum)) {
    if (data.q3b_satuanSusu === 'ml/hari') {
      if ((ageMonths >= 12 && milkNum > 500) || (ageMonths >= 6 && ageMonths < 12 && milkNum > 750)) {
        triggersByRule.R8.push(`3.b Total volume susu tinggi (${milkNum} ml/24 jam)`);
      }
    } else if (data.q3b_satuanSusu === 'botol/hari') {
      if (ageMonths >= 12 && milkNum > 3) {
        triggersByRule.R8.push(`3.b Frekuensi botol susu berlebih (${milkNum} botol/hari)`);
      }
    } else if (data.q3b_satuanSusu === 'kali menyusu langsung/hari') {
      if (ageMonths >= 12 && milkNum > 5) {
        triggersByRule.R8.push(`3.b Frekuensi menyusu langsung sangat sering (${milkNum}x/hari pada usia ≥1 thn)`);
      }
    }
  }
  if (data.q3c_caraMinumSusu === 'Tidur sambil minum susu') {
    triggersByRule.R8.push('3.c Tidur sambil minum susu');
  } else if (data.q3c_caraMinumSusu === 'Botol atau dot' && ageMonths >= 18) {
    triggersByRule.R8.push(`3.c Masih menggunakan botol/dot pada usia ${ageFormatted} (≥18 bulan)`);
  }
  if (
    data.q3d_waktuMinumSusu.includes('Sebelum makan utama') ||
    data.q3d_waktuMinumSusu.includes('Di antara jadwal makan')
  ) {
    triggersByRule.R8.push('3.d Susu diberikan sebelum makan utama atau di antara jadwal makan');
  }
  if (data.q3e_gelasAirPutih === 'Kurang dari 2') {
    triggersByRule.R8.push('3.e Air putih kurang dari 2 gelas/hari');
  }
  if (data.q3f_minumanManisKemasan === 'Setiap hari') {
    triggersByRule.R8.push('3.f Minum jus/teh manis/minuman kemasan setiap hari');
  }
  if (data.q3g_minumBanyakSaatMakan === 'Sering') {
    triggersByRule.R8.push('3.g Sering minum banyak sebelum atau saat makan');
  }

  // --- Evaluasi R9 (6.12) ---
  if (data.q6_12_tawaranMakananBaru !== 'Lebih dari 10 kali') {
    triggersByRule.R9.push(`6.12 Makanan baru ditawarkan: ${data.q6_12_tawaranMakananBaru}`);
  }

  // --- Evaluasi R10 (6.10, 6.11) ---
  if (
    data.q6_10_pengasuhMenyuapi.length > 1 &&
    data.q6_10_konsistensiAturan === 'Berbeda'
  ) {
    triggersByRule.R10.push('6.10 Lebih dari satu pengasuh dengan aturan makan berbeda');
  }
  if (
    data.q6_11_makanBersamaKeluarga === 'Jarang' ||
    data.q6_11_makanBersamaKeluarga === 'Tidak pernah'
  ) {
    triggersByRule.R10.push(`6.11 Makan bersama keluarga: ${data.q6_11_makanBersamaKeluarga}`);
  }

  // --- Evaluasi R11 (6.13) ---
  if (
    data.q6_13_porsiDisajikan === 'Lebih besar dari kemampuan anak' ||
    data.q6_13_porsiDisajikan === 'Mengikuti porsi dewasa'
  ) {
    triggersByRule.R11.push(`6.13 Porsi disajikan: ${data.q6_13_porsiDisajikan}`);
  }

  const ruleStatuses = {} as Record<FeedingRuleCode, LittleBiteRuleStatus>;
  (Object.keys(FEEDING_RULES_MAP) as FeedingRuleCode[]).forEach((code) => {
    const trigs = triggersByRule[code];
    ruleStatuses[code] = {
      code,
      status: trigs.length === 0 ? 'Sesuai' : 'Perlu koreksi',
      triggers: trigs,
      definition: FEEDING_RULES_MAP[code],
    };
  });

  const violatedRulesInPriorityOrder = PRIORITY_RULE_ORDER.map((code) => ruleStatuses[code]).filter(
    (r) => r.status === 'Perlu koreksi'
  );

  const top3PriorityCorrections = violatedRulesInPriorityOrder.slice(0, 3);
  const compliantRules = PRIORITY_RULE_ORDER.map((code) => ruleStatuses[code]).filter(
    (r) => r.status === 'Sesuai'
  );

  const totalViolatedCount = violatedRulesInPriorityOrder.length;
  const isHomeFeedingPatternMainCause = totalViolatedCount >= 6;

  // Evaluasi Red Flags (Bagian 11 + Antropometri / BB turun)
  const redFlagLabels = RED_FLAG_GROUPS.filter((rf) =>
    data.redFlagsSelected.includes(rf.id)
  ).map((rf) => `${rf.kelompok}: ${rf.gejala}`);

  const anth = evaluateAnthropometry(
    data.dob,
    data.jenisKelamin,
    data.bbSekarang,
    data.tbPB,
    data.tanggalUkur
  );

  const isWeightFaltering =
    data.riwayatBB.bbStagnan === 'Ya' ||
    data.riwayatBB.pernahTurunBB === 'Ya' ||
    (anth &&
      (anth.wfhCategory.includes('Gizi Buruk') ||
        anth.wfhCategory.includes('Gizi Kurang') ||
        anth.weightCategory.includes('Kurang')));

  const hasRedFlags = redFlagLabels.length > 0;

  // Cek Oral-Motor / Tekstur issue
  const hasOralMotorIssue =
    data.bisaMengunyah === 'Tidak' ||
    data.seringGagging === 'Ya' ||
    data.pernahTersedak === 'Ya' ||
    data.sulitNaikTekstur === 'Ya';

  // Cek Selective Eating / Repertoire sempit
  const isNarrowRepertoire =
    data.jumlahJenisDiterima.includes('< 5') ||
    data.jumlahJenisDiterima.includes('5-10');

  // Penentuan 1 dari 6 Kategori Utama sesuai Tabel PDF Hal. 9-10
  let category: LittleBiteCategoryName = 'Pola makan sesuai';
  let categoryReason = 'Aturan makan sesuai, tidak ada red flag';
  let nextStepText = 'Pantau dan ulangi skrining 3 bulan lagi';
  let recommendedPackage = 'Materi edukasi gratis';

  if (hasRedFlags || isWeightFaltering) {
    category = 'Prioritas dokter';
    categoryReason =
      'Ditemukan tanda bahaya (red flag) klinis atau berat badan tidak naik/turun yang memerlukan pemeriksaan langsung oleh dokter.';
    nextStepText =
      'Periksa langsung ke dokter; konsultasi dahulu sebelum koreksi pola makan';
    recommendedPackage = 'Paket lengkap Rp250.000 (konsultasi Google Meet)';
  } else if (hasOralMotorIssue) {
    category = 'Oral-motor atau tekstur';
    categoryReason =
      'Ditemukan kesulitan mengunyah, sering gagging/tersedak, atau kesulitan naik tekstur sesuai tahapan usia.';
    nextStepText = 'Evaluasi dokter, latihan tekstur bertahap';
    recommendedPackage = 'Paket lengkap Rp250.000';
  } else if (totalViolatedCount >= 3 && !isNarrowRepertoire) {
    category = 'Masalah aturan makan';
    categoryReason = `${totalViolatedCount} aturan makan berstatus "Perlu koreksi", variasi makanan cukup, tanpa tanda bahaya (red flag).`;
    nextStepText = 'Terapkan koreksi prioritas selama 2 minggu';
    recommendedPackage = 'E-course Rp99.000';
  } else if (isNarrowRepertoire) {
    category = 'Selective eating';
    categoryReason =
      'Variasi makanan (food repertoire) yang diterima anak masih sempit, sehingga membutuhkan perluasan menu bertahap.';
    nextStepText = 'Perluas menu bertahap dengan meal plan';
    recommendedPackage = 'E-course + meal plan Rp139.000';
  } else if (totalViolatedCount >= 1) {
    category = 'Nafsu makan kecil, BB baik';
    categoryReason =
      'Porsi makan tampak kecil namun kurva pertumbuhan baik; perlu perapian jadwal makan dan pemberian susu.';
    nextStepText = 'Edukasi bahwa pertumbuhan baik; rapikan jadwal dan susu';
    recommendedPackage = 'E-course Rp99.000';
  } else {
    category = 'Pola makan sesuai';
    categoryReason = 'Aturan makan di rumah sudah sesuai target dan tidak ditemukan tanda bahaya.';
    nextStepText = 'Pantau dan ulangi skrining 3 bulan lagi';
    recommendedPackage = 'Materi edukasi gratis';
  }

  // Susun Template Pesan Hasil (WhatsApp) persis sesuai PDF Hal. 10
  const goodPoints =
    compliantRules.length > 0
      ? compliantRules
          .slice(0, 2)
          .map((r) => `- ${r.definition.positiveSummaryText}`)
          .join('\n')
      : '- Orang tua telah berkomitmen memantau pola makan dan pertumbuhan anak secara aktif';

  const correctionsList =
    top3PriorityCorrections.length > 0
      ? top3PriorityCorrections
          .map((r, idx) => `${idx + 1}. ${r.definition.parentCorrectionText}`)
          .join('\n')
      : '1. Pertahankan jadwal 3x makan utama dan 2x selingan dengan jeda 2–3 jam.\n2. Lanjutkan variasi menu keluarga bergizi seimbang tanpa distraksi layar.\n3. Pantau kurva berat dan tinggi badan secara berkala setiap bulan.';

  const redFlagPreface = hasRedFlags
    ? `⚠️ Perhatian Medis: Berdasarkan asesmen, ananda menunjukkan gejala prioritas yang perlu diperiksa langsung oleh dokter sebelum/bersamaan dengan koreksi aturan makan.\n\n`
    : '';

  const sixRulesNote = isHomeFeedingPatternMainCause
    ? `\nCatatan Evaluasi Aturan Makan: Terdapat ${totalViolatedCount} dari 11 aturan makan yang perlu dikoreksi, sehingga pola pemberian makan di rumah kemungkinan besar menjadi penyebab utama masalah makan saat ini.\n`
    : '';

  const doctorNoteText =
    reviewerDoctorNote?.trim() ||
    (hasRedFlags
      ? 'Ananda disarankan menjalani evaluasi langsung dengan dokter untuk menyingkirkan faktor organik/medis sambil menata ulang aturan makan.'
      : isHomeFeedingPatternMainCause
      ? 'Fokuskan perbaikan pada 3 koreksi prioritas di atas secara konsisten selama 14 hari ke depan oleh seluruh pengasuh di rumah.'
      : 'Pertumbuhan dan respons makan dapat dioptimalkan dengan menjaga konsistensi jadwal lapar-kenyang serta variasi protein hewani setiap makan utama.');

  const whatsappMessageTemplate = `Halo Bunda ${data.namaIbu || '-'}, ini hasil review asesmen ${
    data.namaLengkapAnak || '-'
  } (${ageFormatted}).

${redFlagPreface}Kategori: ${category}

Yang sudah baik:
${goodPoints}

3 koreksi prioritas minggu ini:
${correctionsList}
${sixRulesNote}
Catatan dokter: ${doctorNoteText}

Langkah lanjut: ${nextStepText}

Bila Bunda ingin pendampingan, tersedia program EAT & GROW: ${recommendedPackage}.
Balas pesan ini bila ada pertanyaan.`;

  return {
    ageMonths,
    ageFormatted,
    category,
    categoryReason,
    nextStepText,
    recommendedPackage,
    hasRedFlags,
    redFlagLabels,
    ruleStatuses,
    violatedRulesInPriorityOrder,
    top3PriorityCorrections,
    compliantRules,
    totalViolatedCount,
    isHomeFeedingPatternMainCause,
    whatsappMessageTemplate,
  };
}
