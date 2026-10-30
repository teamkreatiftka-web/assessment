import { getSupabaseClient } from './supabase';
import {
  LittleBiteScreeningData,
  LittleBiteEvaluationResult,
  LittleBiteCategoryName,
  FeedingRuleCode,
  evaluateLittleBiteAssessment,
} from './littlebite';
import { Gender } from '@/types/screening';

export type CommunityRecordStatus = 'Baru' | 'Dalam Review' | 'Selesai' | 'Follow-Up';

export interface CommunityAssessmentRecord {
  id: string;
  created_at: string;
  updated_at?: string;
  status: CommunityRecordStatus;
  child_name: string;
  mother_name: string;
  father_name?: string;
  phone: string;
  domisili: string;
  age_text: string;
  age_months: number;
  gender: Gender;
  last_weight: string;
  last_height: string;
  category: LittleBiteCategoryName;
  recommended_package: string;
  next_step: string;
  has_red_flags: boolean;
  red_flag_labels: string[];
  violated_rules: FeedingRuleCode[];
  compliant_rules: FeedingRuleCode[];
  total_violated_count: number;
  top3_priority_codes: FeedingRuleCode[];
  home_feeding_is_likely_main_cause: boolean;
  whatsapp_template: string;
  reviewer_notes?: string;
  form_data: LittleBiteScreeningData;
  evaluation_result: LittleBiteEvaluationResult;
}

const COMMUNITY_LOCAL_STORAGE_KEY = 'tka_community_assessments_v2';
const LEGACY_COMMUNITY_STORAGE_KEY = 'tka_community_assessments_v1';
const COMMUNITY_BROADCAST_CHANNEL = 'tka_community_realtime_channel';
const SUPABASE_COMMUNITY_TABLE = 'community_assessments';

const LEGACY_SEED_IDS = new Set([
  'LB-COMM-2026-8841',
  'LB-COMM-2026-8842',
  'LB-COMM-2026-8843',
  'LB-COMM-2026-8844',
  'LB-COMM-2026-8845',
]);

export const SEED_COMMUNITY_IDS = new Set([
  'COMM-2026-9001',
  'COMM-2026-9002',
  'COMM-2026-9003',
  'COMM-2026-9004',
  'COMM-2026-9005',
]);

export function isUserSubmittedCommunityRecord(id: string): boolean {
  return !SEED_COMMUNITY_IDS.has(id) && !LEGACY_SEED_IDS.has(id);
}

export function generateCommunityRecordId(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `LB-COMM-${year}-${rand}`;
}

export function createCommunityRecordFromFormData(
  id: string,
  createdAt: string,
  status: CommunityRecordStatus,
  formData: LittleBiteScreeningData,
  reviewerNotes?: string
): CommunityAssessmentRecord {
  const evalResult = evaluateLittleBiteAssessment(formData, reviewerNotes);

  return {
    id,
    created_at: createdAt,
    updated_at: createdAt,
    status,
    child_name: formData.namaLengkapAnak,
    mother_name: formData.namaIbu,
    father_name: formData.namaAyah || undefined,
    phone: formData.waIbu,
    domisili: formData.domisili,
    age_text: evalResult.ageFormatted,
    age_months: evalResult.ageMonths,
    gender: formData.jenisKelamin,
    last_weight: `${formData.bbSekarang} kg`,
    last_height: `${formData.tbPB} cm`,
    category: evalResult.category,
    recommended_package: evalResult.recommendedPackage,
    next_step: evalResult.nextStepText,
    has_red_flags: evalResult.hasRedFlags,
    red_flag_labels: evalResult.redFlagLabels,
    violated_rules: evalResult.violatedRulesInPriorityOrder.map((r) => r.code),
    compliant_rules: evalResult.compliantRules.map((r) => r.code),
    total_violated_count: evalResult.totalViolatedCount,
    top3_priority_codes: evalResult.top3PriorityCorrections.map((r) => r.code),
    home_feeding_is_likely_main_cause: evalResult.isHomeFeedingPatternMainCause,
    whatsapp_template: evalResult.whatsappMessageTemplate,
    reviewer_notes: reviewerNotes || '',
    form_data: formData,
    evaluation_result: evalResult,
  };
}

// Data awal khusus untuk /ADMINCOMMUNITY (100% berbeda dari data pasien di /rm)
// Menggunakan timestamp masa lalu relatif agar setiap input baru dari /community selalu muncul di urutan #1 paling atas
const SEED_COMMUNITY_RECORDS: CommunityAssessmentRecord[] = [
  createCommunityRecordFromFormData(
    'COMM-2026-9001',
    new Date(Date.now() - 3600000 * 8).toISOString(),
    'Baru',
    {
      namaAyah: 'Aldi Bragi Alfarizqi',
      waAyah: '081131002299',
      namaIbu: 'Sherina Oktaviani',
      waIbu: '081231008877',
      email: 'sherina.oktaviani@email.com',
      domisili: 'Surabaya Timur',
      namaLengkapAnak: 'Zayn Malik Alfarizqi',
      dob: '2025-03-10',
      jenisKelamin: 'Laki-laki',
      bbSekarang: '8.8',
      tbPB: '78.5',
      tanggalUkur: '2026-10-20',
      statusKelahiran: 'Cukup bulan',
      usiaKehamilanMinggu: '39',
      bbLahir: '3.15',
      pbLahir: '49',
      asiEksklusifBulan: '6',
      usiaMulaiMpasiBulan: '6',
      teksturMpasiPertama: 'Puree halus / Bubur saring',
      adaAlergi: 'Tidak',
      pemicuAlergi: '',
      penyakitPenyertaRawatInap: 'Tidak ada',
      obatSuplemenRutin: 'Vitamin D3 400 IU',
      adaKeterlambatanPerkembangan: 'Tidak',
      detailKeterlambatanPerkembangan: '',
      q3a_minumanUtama: ['Susu formula', 'Susu UHT'],
      q3b_totalSusu24Jam: '780',
      q3b_satuanSusu: 'ml/hari',
      q3c_caraMinumSusu: 'Botol atau dot',
      q3d_waktuMinumSusu: ['Sebelum makan utama', 'Di antara jadwal makan', 'Menjelang tidur'],
      q3e_gelasAirPutih: 'Kurang dari 2',
      q3f_minumanManisKemasan: 'Kadang',
      q3g_minumBanyakSaatMakan: 'Sering',
      repertoire: [
        { kategori: 'Karbohidrat', makananMau: 'Nasi lembek kuah, mie, kentang rebus', makananTidakMau: 'Nasi keluarga padat, ubi' },
        { kategori: 'Protein hewani', makananMau: 'Telur orak-arik, kaldu ayam', makananTidakMau: 'Daging sapi, ikan, ayam suwir' },
        { kategori: 'Protein nabati', makananMau: 'Tahu kukus', makananTidakMau: 'Tempe, kacang merah' },
        { kategori: 'Sayur', makananMau: 'Wortel parut sedikit', makananTidakMau: 'Bayam, brokoli, buncis' },
        { kategori: 'Buah', makananMau: 'Pisang, pepaya', makananTidakMau: 'Apel, pir' },
        { kategori: 'Dairy', makananMau: 'Susu formula, keju', makananTidakMau: 'Yogurt plain' },
        { kategori: 'Snack', makananMau: 'Biskuit susu, kerupuk, puding manis', makananTidakMau: 'Buah potong' },
      ],
      jumlahJenisDiterima: '10-20 jenis',
      teksturDiterima: ['Lumat', 'Lunak'],
      bisaMengunyah: 'Ya',
      seringGagging: 'Tidak',
      seringBatuk: 'Tidak',
      pernahTersedak: 'Tidak',
      melepehMakanan: 'Ya',
      lamaDiMulut: 'Ya',
      sulitNaikTekstur: 'Tidak',
      hanyaMauTeksturTertentu: 'Tidak',
      q6_1_frekuensiMakanUtama: 'Kurang dari 3 kali',
      q6_2_frekuensiSelingan: '3 kali atau lebih',
      q6_3_jamMakanSama: 'Tidak teratur',
      q6_4_jedaTerpendek: 'Kurang dari 2 jam',
      q6_5_durasiMakan: 'Lebih dari 45 menit',
      q6_6_lokasiCaraMakan: ['Sambil berjalan atau berlari', 'Di depan TV'],
      q6_7_pendampingMakan: ['HP atau tablet', 'Video YouTube'],
      q6_8_responMenolakMakan: ['Membujuk terus', 'Memberi susu sebagai pengganti'],
      q6_9_kemandirianMakan: 'Disuapi penuh',
      q6_10_pengasuhMenyuapi: ['Ibu', 'Nenek atau kakek'],
      q6_10_konsistensiAturan: 'Berbeda',
      q6_11_makanBersamaKeluarga: 'Jarang',
      q6_12_tawaranMakananBaru: '1 sampai 2 kali',
      q6_13_porsiDisajikan: 'Lebih besar dari kemampuan anak',
      q6_14_mintaCamilanLuarJadwal: 'Sering diberi',
      perilakuMakan: ['Menutup mulut', 'Harus sambil gadget', 'Sangat lama menghabiskan makanan'],
      alasanSensorik: ['Tekstur', 'Campuran makanan'],
      foodRecall: {
        bangunSusu: '06.00 - Susu formula dot 180 ml',
        sarapanMenu: '08.00 - Nasi lembek + telur',
        sarapanPorsi: 'Hanya habis 3 suap, lanjut susu botol 150 ml',
        snackPagiMenu: '10.00 - Biskuit manis 3 keping + UHT 125 ml',
        snackPagiPorsi: 'Habis',
        makanSiangMenu: '12.30 - Nasi lembek + sayur sop ayam',
        makanSiangPorsi: '1/4 porsi, diemut 45 menit sambil nonton YouTube',
        snackSoreMenu: '15.30 - Puding susu + kerupuk',
        snackSorePorsi: 'Habis',
        makanMalamMenu: '18.30 - Mie kuah telur',
        makanMalamPorsi: '1/3 mangkuk kecil',
        susuSebelumTidur: '20.30 & 01.00 - Susu formula dot @180 ml',
      },
      riwayatBB: {
        bb3BulanLalu: '8.7',
        bb2BulanLalu: '8.75',
        bb1BulanLalu: '8.8',
        bbSekarang: '8.8',
        tbTerakhir: '78.5',
        tanggalUkurTerakhir: '2026-10-20',
        lingkarKepalaTerakhir: '47.0',
        bbStagnan: 'Ya',
        pernahTurunBB: 'Tidak',
        targetBB: '10.4',
      },
      redFlagsSelected: ['growth'],
      sejakKapanMasalahMakan: 'Sejak usia 13 bulan saat mulai kenal YouTube dan minum susu dot makin sering.',
      upayaYangSudahDicoba: 'Ganti-ganti menu, beri suplemen penambah nafsu makan, suapi sambil jalan sore.',
      harapanOrangTuaPilihan: [
        'Anak mau makan tanpa dipaksa / tanpa drama',
        'Berat badan anak naik sesuai kurva WHO',
        'Anak mau lepas dari gadget/TV saat makan',
      ],
      harapanOrangTuaIsian: 'Semoga BB Zayn segera naik dan tidak ketergantungan dot susu.',
      keluhanUtama: ['GTM (Gerakan Tutup Mulut)', 'Lama makan (>30 menit)', 'BB sulit naik / stagnan'],
      ceritaKondisi: 'Zayn selalu tutup mulut kalau melihat sendok kecuali sambil nonton YouTube. Kalau menolak makan langsung minta dot susu formula sampai 4-5 botol sehari.',
      pertanyaanDokter1: 'Bagaimana cara memangkas susu botol malam tanpa membuat anak tantrum berat?',
      pertanyaanDokter2: 'Apakah BB 8.8 kg saat ini sudah membutuhkan evaluasi langsung?',
      pertanyaanDokter3: 'Bagaimana tahapan lepas layar YouTube saat makan?',
      persetujuanDataTimMedis: true,
      persetujuanKontakWhatsApp: true,
    },
    'Volume susu harian >750 ml via dot sangat menekan sinyal lapar anak (R8). Pangkas susu bertahap ke <400 ml dan evaluasi kurva BB langsung.'
  ),
  createCommunityRecordFromFormData(
    'COMM-2026-9002',
    new Date(Date.now() - 3600000 * 16).toISOString(),
    'Dalam Review',
    {
      namaAyah: 'Vincentius Halim',
      waAyah: '081161998822',
      namaIbu: 'Veronica Halim',
      waIbu: '081260887711',
      email: 'veronica.halim@email.com',
      domisili: 'Medan Baru',
      namaLengkapAnak: 'Freya Anastasya Halim',
      dob: '2024-07-14',
      jenisKelamin: 'Perempuan',
      bbSekarang: '11.6',
      tbPB: '87.5',
      tanggalUkur: '2026-10-19',
      statusKelahiran: 'Cukup bulan',
      usiaKehamilanMinggu: '38',
      bbLahir: '3.05',
      pbLahir: '48.5',
      asiEksklusifBulan: '6',
      usiaMulaiMpasiBulan: '6',
      teksturMpasiPertama: 'Puree halus / Bubur saring',
      adaAlergi: 'Tidak',
      pemicuAlergi: '',
      penyakitPenyertaRawatInap: 'Tidak ada',
      obatSuplemenRutin: 'Tidak ada',
      adaKeterlambatanPerkembangan: 'Tidak',
      detailKeterlambatanPerkembangan: '',
      q3a_minumanUtama: ['Susu UHT'],
      q3b_totalSusu24Jam: '350',
      q3b_satuanSusu: 'ml/hari',
      q3c_caraMinumSusu: 'Cangkir atau gelas',
      q3d_waktuMinumSusu: ['Setelah makan', 'Menjelang tidur'],
      q3e_gelasAirPutih: '3 sampai 5',
      q3f_minumanManisKemasan: 'Kadang',
      q3g_minumBanyakSaatMakan: 'Tidak',
      repertoire: [
        { kategori: 'Karbohidrat', makananMau: 'Nasi putih, roti tawar, pasta, kentang', makananTidakMau: 'Jagung' },
        { kategori: 'Protein hewani', makananMau: 'Ayam goreng, telur, bakso sapi, ikan dori', makananTidakMau: 'Hati ayam' },
        { kategori: 'Protein nabati', makananMau: 'Tahu, tempe krispi', makananTidakMau: 'Edamame' },
        { kategori: 'Sayur', makananMau: 'Sup wortel, jagung manis, bayam', makananTidakMau: 'Brokoli' },
        { kategori: 'Buah', makananMau: 'Jeruk, mangga, pisang, semangka', makananTidakMau: 'Pepaya' },
        { kategori: 'Dairy', makananMau: 'Susu UHT, keju slice', makananTidakMau: '-' },
        { kategori: 'Snack', makananMau: 'Biskuit coklat, es krim, wafer, chiki', makananTidakMau: '-' },
      ],
      jumlahJenisDiterima: '>20 jenis',
      teksturDiterima: ['Makanan keluarga'],
      bisaMengunyah: 'Ya',
      seringGagging: 'Tidak',
      seringBatuk: 'Tidak',
      pernahTersedak: 'Tidak',
      melepehMakanan: 'Tidak',
      lamaDiMulut: 'Ya',
      sulitNaikTekstur: 'Tidak',
      hanyaMauTeksturTertentu: 'Tidak',
      q6_1_frekuensiMakanUtama: '3 kali',
      q6_2_frekuensiSelingan: 'Ngemil terus sepanjang hari',
      q6_3_jamMakanSama: 'Kadang',
      q6_4_jedaTerpendek: 'Kurang dari 2 jam',
      q6_5_durasiMakan: '30 sampai 45 menit',
      q6_6_lokasiCaraMakan: ['Meja atau lantai sambil duduk', 'Sambil berjalan atau berlari'],
      q6_7_pendampingMakan: ['TV', 'Mainan'],
      q6_8_responMenolakMakan: ['Membujuk terus', 'Menjanjikan hadiah', 'Menawarkan menu pengganti'],
      q6_9_kemandirianMakan: 'Disuapi dan boleh pegang sendiri',
      q6_10_pengasuhMenyuapi: ['Ibu', 'Pengasuh atau ART'],
      q6_10_konsistensiAturan: 'Berbeda',
      q6_11_makanBersamaKeluarga: 'Beberapa kali seminggu',
      q6_12_tawaranMakananBaru: '3 sampai 5 kali',
      q6_13_porsiDisajikan: 'Sesuai usia',
      q6_14_mintaCamilanLuarJadwal: 'Camilan manis sering diberikan sebelum makan',
      perilakuMakan: ['Kabur dari meja makan', 'Harus sambil bermain', 'Sangat lama menghabiskan makanan'],
      alasanSensorik: ['Tidak diketahui'],
      foodRecall: {
        bangunSusu: '07.00 - Air putih',
        sarapanMenu: '08.00 - Roti panggang keju + telur orak-arik',
        sarapanPorsi: '1/2 porsi',
        snackPagiMenu: '09.30 & 11.00 - Biskuit coklat + keripik kentang',
        snackPagiPorsi: 'Habis banyak',
        makanSiangMenu: '12.00 - Nasi + sup ayam wortel',
        makanSiangPorsi: 'Menolak makan nasi karena baru makan biskuit jam 11.00',
        snackSoreMenu: '15.00 - Es krim + roti manis',
        snackSorePorsi: 'Habis 1 cup',
        makanMalamMenu: '18.30 - Nasi + ayam goreng',
        makanMalamPorsi: 'Habis 1/2 porsi sambil dikejar keliling ruang tamu',
        susuSebelumTidur: '20.00 - Susu UHT gelas 175 ml',
      },
      riwayatBB: {
        bb3BulanLalu: '11.2',
        bb2BulanLalu: '11.4',
        bb1BulanLalu: '11.5',
        bbSekarang: '11.6',
        tbTerakhir: '87.5',
        tanggalUkurTerakhir: '2026-10-19',
        lingkarKepalaTerakhir: '',
        bbStagnan: 'Tidak',
        pernahTurunBB: 'Tidak',
        targetBB: '12.4',
      },
      redFlagsSelected: [],
      sejakKapanMasalahMakan: '3 bulan terakhir sejak pengasuh di rumah sering memberi camilan manis setiap Freya minta.',
      upayaYangSudahDicoba: 'Menjanjikan hadiah mainan kalau makan habis.',
      harapanOrangTuaPilihan: [
        'Anak mau makan tanpa dipaksa / tanpa drama',
        'Jadwal makan dan minum susu lebih teratur',
      ],
      harapanOrangTuaIsian: 'Ingin menyamakan aturan makan dengan pengasuh di rumah.',
      keluhanUtama: ['Porsi makan sedikit', 'Lama makan (>30 menit)'],
      ceritaKondisi: 'Variasi makan Freya bagus dan BB masih naik tipis, tapi tiap jam makan utama selalu drama dan lari-larian karena sudah kenyang ngemil biskuit sebelum jam makan.',
      pertanyaanDokter1: 'Bagaimana cara tegas menolak saat anak menangis minta biskuit 30 menit sebelum makan siang?',
      pertanyaanDokter2: 'Bolehkah snack sore diganti buah potong saja?',
      pertanyaanDokter3: '',
      persetujuanDataTimMedis: true,
      persetujuanKontakWhatsApp: true,
    },
    'Kasus klasik grazing (ngemil sepanjang hari - R2). Hentikan camilan manis 2 jam sebelum makan utama dan samakan aturan dengan ART (R10).'
  ),
  createCommunityRecordFromFormData(
    'COMM-2026-9003',
    new Date(Date.now() - 3600000 * 28).toISOString(),
    'Selesai',
    {
      namaAyah: 'Surya Adhitama',
      waAyah: '081724001122',
      namaIbu: 'Larasati Kusuma',
      waIbu: '081824009988',
      email: 'larasati.kusuma@email.com',
      domisili: 'Semarang Tengah',
      namaLengkapAnak: 'Bima Sena Adhitama',
      dob: '2024-02-18',
      jenisKelamin: 'Laki-laki',
      bbSekarang: '12.6',
      tbPB: '91.5',
      tanggalUkur: '2026-10-18',
      statusKelahiran: 'Cukup bulan',
      usiaKehamilanMinggu: '40',
      bbLahir: '3.3',
      pbLahir: '50',
      asiEksklusifBulan: '6',
      usiaMulaiMpasiBulan: '6',
      teksturMpasiPertama: 'Puree halus / Bubur saring',
      adaAlergi: 'Tidak',
      pemicuAlergi: '',
      penyakitPenyertaRawatInap: 'Tidak ada',
      obatSuplemenRutin: 'Tidak ada',
      adaKeterlambatanPerkembangan: 'Tidak',
      detailKeterlambatanPerkembangan: '',
      q3a_minumanUtama: ['Susu UHT'],
      q3b_totalSusu24Jam: '300',
      q3b_satuanSusu: 'ml/hari',
      q3c_caraMinumSusu: 'Cangkir atau gelas',
      q3d_waktuMinumSusu: ['Setelah makan', 'Menjelang tidur'],
      q3e_gelasAirPutih: '3 sampai 5',
      q3f_minumanManisKemasan: 'Tidak',
      q3g_minumBanyakSaatMakan: 'Tidak',
      repertoire: [
        { kategori: 'Karbohidrat', makananMau: 'Nasi putih kering, kerupuk, roti tawar putih', makananTidakMau: 'Bubur, mie basah, kentang tumbuk' },
        { kategori: 'Protein hewani', makananMau: 'Ayam goreng tepung, telur dadar kering', makananTidakMau: 'Ikan kuah, daging semur, ayam berkuah' },
        { kategori: 'Protein nabati', makananMau: 'Tempe goreng kering', makananTidakMau: 'Tahu kukus' },
        { kategori: 'Sayur', makananMau: 'Tidak mau sama sekali', makananTidakMau: 'Semua sayur berdaun dan berkuah' },
        { kategori: 'Buah', makananMau: 'Pisang', makananTidakMau: 'Buah berair (jeruk, semangka, pepaya)' },
        { kategori: 'Dairy', makananMau: 'Susu UHT', makananTidakMau: 'Keju leleh' },
        { kategori: 'Snack', makananMau: 'Biskuit kering, stik keju', makananTidakMau: 'Puding basah' },
      ],
      jumlahJenisDiterima: '5-10 jenis',
      teksturDiterima: ['Makanan keluarga'],
      bisaMengunyah: 'Ya',
      seringGagging: 'Tidak',
      seringBatuk: 'Tidak',
      pernahTersedak: 'Tidak',
      melepehMakanan: 'Ya',
      lamaDiMulut: 'Tidak',
      sulitNaikTekstur: 'Tidak',
      hanyaMauTeksturTertentu: 'Ya',
      q6_1_frekuensiMakanUtama: '3 kali',
      q6_2_frekuensiSelingan: '1 sampai 2 kali',
      q6_3_jamMakanSama: 'Ya, hampir selalu',
      q6_4_jedaTerpendek: '2 sampai 3 jam',
      q6_5_durasiMakan: '15 sampai 30 menit',
      q6_6_lokasiCaraMakan: ['Kursi makan'],
      q6_7_pendampingMakan: ['Tidak ada'],
      q6_8_responMenolakMakan: ['Makanan diangkat dengan tenang'],
      q6_9_kemandirianMakan: 'Makan sendiri',
      q6_10_pengasuhMenyuapi: ['Ibu'],
      q6_10_konsistensiAturan: 'Sama',
      q6_11_makanBersamaKeluarga: 'Hampir setiap hari',
      q6_12_tawaranMakananBaru: '3 sampai 5 kali',
      q6_13_porsiDisajikan: 'Sesuai usia',
      q6_14_mintaCamilanLuarJadwal: 'Tidak diberi',
      perilakuMakan: ['Memalingkan wajah'],
      alasanSensorik: ['Tekstur', 'Warna', 'Campuran makanan', 'Takut makanan baru'],
      foodRecall: {
        bangunSusu: '06.30 - Air putih',
        sarapanMenu: '07.30 - Nasi putih + telur dadar kering',
        sarapanPorsi: 'Habis 1 porsi',
        snackPagiMenu: '10.00 - Pisang + stik keju',
        snackPagiPorsi: 'Habis',
        makanSiangMenu: '12.30 - Nasi putih + ayam tepung homemade + tempe kering',
        makanSiangPorsi: 'Habis, sayur wortel tidak disentuh',
        snackSoreMenu: '15.30 - Roti bakar + UHT 150 ml',
        snackSorePorsi: 'Habis',
        makanMalamMenu: '18.30 - Nasi putih + ayam goreng kering',
        makanMalamPorsi: 'Habis',
        susuSebelumTidur: '20.30 - Susu UHT 150 ml',
      },
      riwayatBB: {
        bb3BulanLalu: '12.1',
        bb2BulanLalu: '12.3',
        bb1BulanLalu: '12.5',
        bbSekarang: '12.6',
        tbTerakhir: '91.5',
        tanggalUkurTerakhir: '2026-10-18',
        lingkarKepalaTerakhir: '',
        bbStagnan: 'Tidak',
        pernahTurunBB: 'Tidak',
        targetBB: '13.2',
      },
      redFlagsSelected: [],
      sejakKapanMasalahMakan: 'Sejak usia 20 bulan hanya mau makanan kering dan menolak sayur atau makanan berkuah.',
      upayaYangSudahDicoba: 'Menyembunyikan sayur di dalam adonan ayam.',
      harapanOrangTuaPilihan: ['Variasi makanan (protein & sayur) bertambah'],
      harapanOrangTuaIsian: 'Ingin Bima berani mencoba makanan baru tanpa takut.',
      keluhanUtama: ['Pilih-pilih makanan (Picky Eating)', 'Tidak mau sayur/buah'],
      ceritaKondisi: 'Jadwal makan Bima sudah teratur di high chair tanpa gadget, tapi hanya mau makanan kering/renyah. Bila ditawarkan sayur atau menu baru hanya dicoba 2-3 kali lalu kami menyerah.',
      pertanyaanDokter1: 'Bagaimana teknik food chaining dari ayam goreng kering ke lauk berkuah dan sayur?',
      pertanyaanDokter2: '',
      pertanyaanDokter3: '',
      persetujuanDataTimMedis: true,
      persetujuanKontakWhatsApp: true,
    },
    'Aturan makan di rumah sudah sangat baik (R1-R8 sesuai). Fokus utama adalah paparan berulang 10-15x (R9) dengan teknik food chaining tanpa paksaan.'
  ),
  createCommunityRecordFromFormData(
    'COMM-2026-9004',
    new Date(Date.now() - 3600000 * 42).toISOString(),
    'Follow-Up',
    {
      namaAyah: 'Gede Arya Prameswari',
      waAyah: '081936001144',
      namaIbu: 'Ni Luh Dian Prameswari',
      waIbu: '081936005577',
      email: 'dian.prameswari@email.com',
      domisili: 'Denpasar, Bali',
      namaLengkapAnak: 'Alula Nadhira Prameswari',
      dob: '2025-08-05',
      jenisKelamin: 'Perempuan',
      bbSekarang: '8.9',
      tbPB: '74.5',
      tanggalUkur: '2026-10-17',
      statusKelahiran: 'Cukup bulan',
      usiaKehamilanMinggu: '38',
      bbLahir: '3.0',
      pbLahir: '48',
      asiEksklusifBulan: '6',
      usiaMulaiMpasiBulan: '6',
      teksturMpasiPertama: 'Puree halus / Bubur saring',
      adaAlergi: 'Tidak',
      pemicuAlergi: '',
      penyakitPenyertaRawatInap: 'Tidak ada',
      obatSuplemenRutin: 'Zat besi tetes',
      adaKeterlambatanPerkembangan: 'Tidak',
      detailKeterlambatanPerkembangan: '',
      q3a_minumanUtama: ['ASI'],
      q3b_totalSusu24Jam: '5',
      q3b_satuanSusu: 'kali menyusu langsung/hari',
      q3c_caraMinumSusu: 'Menyusu langsung',
      q3d_waktuMinumSusu: ['Setelah makan', 'Menjelang tidur', 'Saat bangun malam'],
      q3e_gelasAirPutih: '3 sampai 5',
      q3f_minumanManisKemasan: 'Tidak',
      q3g_minumBanyakSaatMakan: 'Tidak',
      repertoire: [
        { kategori: 'Karbohidrat', makananMau: 'Bubur tim saring, kentang tumbuk halus', makananTidakMau: 'Nasi lembek utuh, nasi keluarga' },
        { kategori: 'Protein hewani', makananMau: 'Telur kukus, ayam blender halus, ikan kukus lumat', makananTidakMau: 'Ayam cincang kasar, daging suwir' },
        { kategori: 'Protein nabati', makananMau: 'Tahu sutra', makananTidakMau: 'Tempe potong' },
        { kategori: 'Sayur', makananMau: 'Labu kuning lumat, wortel kukus halus', makananTidakMau: 'Sayur cincang kasar' },
        { kategori: 'Buah', makananMau: 'Alpukat kerok, pisang lumat', makananTidakMau: 'Buah potong' },
        { kategori: 'Dairy', makananMau: 'ASI, keju lumer', makananTidakMau: '-' },
        { kategori: 'Snack', makananMau: 'Puff bayi lumer', makananTidakMau: 'Biskuit keras' },
      ],
      jumlahJenisDiterima: '10-20 jenis',
      teksturDiterima: ['Puree', 'Lumat'],
      bisaMengunyah: 'Tidak',
      seringGagging: 'Ya',
      seringBatuk: 'Tidak',
      pernahTersedak: 'Tidak',
      melepehMakanan: 'Ya',
      lamaDiMulut: 'Ya',
      sulitNaikTekstur: 'Ya',
      hanyaMauTeksturTertentu: 'Ya',
      q6_1_frekuensiMakanUtama: '3 kali',
      q6_2_frekuensiSelingan: '1 sampai 2 kali',
      q6_3_jamMakanSama: 'Ya, hampir selalu',
      q6_4_jedaTerpendek: '2 sampai 3 jam',
      q6_5_durasiMakan: '30 sampai 45 menit',
      q6_6_lokasiCaraMakan: ['Kursi makan'],
      q6_7_pendampingMakan: ['Mainan'],
      q6_8_responMenolakMakan: ['Makanan diangkat dengan tenang'],
      q6_9_kemandirianMakan: 'Tidak dibolehkan berantakan',
      q6_10_pengasuhMenyuapi: ['Ibu'],
      q6_10_konsistensiAturan: 'Sama',
      q6_11_makanBersamaKeluarga: 'Beberapa kali seminggu',
      q6_12_tawaranMakananBaru: '6 sampai 10 kali',
      q6_13_porsiDisajikan: 'Sesuai usia',
      q6_14_mintaCamilanLuarJadwal: 'Tidak diberi',
      perilakuMakan: ['Harus disuapi'],
      alasanSensorik: ['Tekstur'],
      foodRecall: {
        bangunSusu: '06.00 - ASI langsung',
        sarapanMenu: '08.00 - Bubur tim halus ayam + telur puyuh',
        sarapanPorsi: 'Habis 3/4 mangkuk',
        snackPagiMenu: '10.30 - Alpukat kerok halus',
        snackPagiPorsi: 'Habis',
        makanSiangMenu: '13.00 - Bubur tim ikan kembung + labu kuning',
        makanSiangPorsi: 'Bila ada butiran nasi langsung gagging & dilepeh',
        snackSoreMenu: '16.00 - Puff bayi',
        snackSorePorsi: 'Habis',
        makanMalamMenu: '18.30 - Kentang tumbuk halus + hati ayam',
        makanMalamPorsi: 'Habis 3/4 porsi',
        susuSebelumTidur: '20.30 - ASI langsung',
      },
      riwayatBB: {
        bb3BulanLalu: '8.4',
        bb2BulanLalu: '8.6',
        bb1BulanLalu: '8.75',
        bbSekarang: '8.9',
        tbTerakhir: '74.5',
        tanggalUkurTerakhir: '2026-10-17',
        lingkarKepalaTerakhir: '45.4',
        bbStagnan: 'Tidak',
        pernahTurunBB: 'Tidak',
        targetBB: '9.5',
      },
      redFlagsSelected: [],
      sejakKapanMasalahMakan: 'Sejak usia 10 bulan saat mencoba naik ke tekstur cincang kasar selalu gagging.',
      upayaYangSudahDicoba: 'Kembali ke bubur blender halus supaya makanan tetap masuk.',
      harapanOrangTuaPilihan: ['Anak bisa naik tekstur sesuai usia'],
      harapanOrangTuaIsian: 'Ingin Alula bisa makan nasi lembek/keluarga di usia 14 bulan ini.',
      keluhanUtama: ['Sulit naik tekstur', 'Sering melepeh makanan', 'Gagging / batuk / tersedak'],
      ceritaKondisi: 'Alula masih makan bubur tim halus. Setiap diberi nasi lembek atau finger food tidak lumer, langsung gagging dan melepeh.',
      pertanyaanDokter1: 'Latihan stimulasi oral motor apa yang harus dilakukan di rumah?',
      pertanyaanDokter2: 'Apakah karena selama ini tidak dibolehkan makan berantakan sendiri mempengaruhi kemampuan mengunyah?',
      pertanyaanDokter3: '',
      persetujuanDataTimMedis: true,
      persetujuanKontakWhatsApp: true,
    },
    'Berikan kesempatan eksplorasi finger food mandiri (R7) walaupun berantakan untuk melatih lateralisasi lidah dan refleks mengunyah.'
  ),
  createCommunityRecordFromFormData(
    'COMM-2026-9005',
    new Date(Date.now() - 3600000 * 60).toISOString(),
    'Selesai',
    {
      namaAyah: 'Andi Makkasau Putra',
      waAyah: '081141003388',
      namaIbu: 'Citra Kirana Maharani',
      waIbu: '081241007766',
      email: 'citra.maharani@email.com',
      domisili: 'Makassar',
      namaLengkapAnak: 'Rafaizan Xavier Putra',
      dob: '2024-12-10',
      jenisKelamin: 'Laki-laki',
      bbSekarang: '11.4',
      tbPB: '84.0',
      tanggalUkur: '2026-10-16',
      statusKelahiran: 'Cukup bulan',
      usiaKehamilanMinggu: '39',
      bbLahir: '3.25',
      pbLahir: '49.5',
      asiEksklusifBulan: '6',
      usiaMulaiMpasiBulan: '6',
      teksturMpasiPertama: 'Puree halus / Bubur saring',
      adaAlergi: 'Tidak',
      pemicuAlergi: '',
      penyakitPenyertaRawatInap: 'Tidak ada',
      obatSuplemenRutin: 'Tidak ada',
      adaKeterlambatanPerkembangan: 'Tidak',
      detailKeterlambatanPerkembangan: '',
      q3a_minumanUtama: ['Susu UHT'],
      q3b_totalSusu24Jam: '350',
      q3b_satuanSusu: 'ml/hari',
      q3c_caraMinumSusu: 'Cangkir atau gelas',
      q3d_waktuMinumSusu: ['Setelah makan', 'Menjelang tidur'],
      q3e_gelasAirPutih: '3 sampai 5',
      q3f_minumanManisKemasan: 'Tidak',
      q3g_minumBanyakSaatMakan: 'Tidak',
      repertoire: [
        { kategori: 'Karbohidrat', makananMau: 'Nasi, kentang, mie, roti, ubi', makananTidakMau: '-' },
        { kategori: 'Protein hewani', makananMau: 'Ayam, telur, ikan kembung, daging sapi, udang', makananTidakMau: '-' },
        { kategori: 'Protein nabati', makananMau: 'Tahu, tempe, kacang hijau', makananTidakMau: '-' },
        { kategori: 'Sayur', makananMau: 'Bayam, wortel, brokoli, sop sayur', makananTidakMau: 'Pare' },
        { kategori: 'Buah', makananMau: 'Pisang, pepaya, jeruk, naga, apel', makananTidakMau: '-' },
        { kategori: 'Dairy', makananMau: 'UHT, keju, yogurt', makananTidakMau: '-' },
        { kategori: 'Snack', makananMau: 'Buah potong, puding telur, kroket kentang', makananTidakMau: '-' },
      ],
      jumlahJenisDiterima: '>20 jenis',
      teksturDiterima: ['Makanan keluarga'],
      bisaMengunyah: 'Ya',
      seringGagging: 'Tidak',
      seringBatuk: 'Tidak',
      pernahTersedak: 'Tidak',
      melepehMakanan: 'Tidak',
      lamaDiMulut: 'Tidak',
      sulitNaikTekstur: 'Tidak',
      hanyaMauTeksturTertentu: 'Tidak',
      q6_1_frekuensiMakanUtama: '3 kali',
      q6_2_frekuensiSelingan: '1 sampai 2 kali',
      q6_3_jamMakanSama: 'Ya, hampir selalu',
      q6_4_jedaTerpendek: '2 sampai 3 jam',
      q6_5_durasiMakan: '15 sampai 30 menit',
      q6_6_lokasiCaraMakan: ['Kursi makan'],
      q6_7_pendampingMakan: ['Tidak ada'],
      q6_8_responMenolakMakan: ['Makanan diangkat dengan tenang'],
      q6_9_kemandirianMakan: 'Makan sendiri',
      q6_10_pengasuhMenyuapi: ['Ibu', 'Ayah'],
      q6_10_konsistensiAturan: 'Sama',
      q6_11_makanBersamaKeluarga: 'Hampir setiap hari',
      q6_12_tawaranMakananBaru: 'Lebih dari 10 kali',
      q6_13_porsiDisajikan: 'Kecil lalu ditambah bila mau',
      q6_14_mintaCamilanLuarJadwal: 'Tidak diberi',
      perilakuMakan: [],
      alasanSensorik: ['Tidak diketahui'],
      foodRecall: {
        bangunSusu: '06.30 - Air putih',
        sarapanMenu: '07.30 - Nasi + opor ayam + wortel',
        sarapanPorsi: 'Habis 1 porsi kecil',
        snackPagiMenu: '10.00 - Buah naga + keju',
        snackPagiPorsi: 'Habis',
        makanSiangMenu: '12.30 - Nasi + sup daging sapi + tahu',
        makanSiangPorsi: 'Habis',
        snackSoreMenu: '15.30 - Puding susu telur + UHT 150 ml',
        snackSorePorsi: 'Habis',
        makanMalamMenu: '18.30 - Nasi + ikan goreng + sayur bening bayam',
        makanMalamPorsi: 'Habis',
        susuSebelumTidur: '20.15 - UHT 200 ml pakai gelas',
      },
      riwayatBB: {
        bb3BulanLalu: '10.9',
        bb2BulanLalu: '11.1',
        bb1BulanLalu: '11.25',
        bbSekarang: '11.4',
        tbTerakhir: '84.0',
        tanggalUkurTerakhir: '2026-10-16',
        lingkarKepalaTerakhir: '48.2',
        bbStagnan: 'Tidak',
        pernahTurunBB: 'Tidak',
        targetBB: '12.0',
      },
      redFlagsSelected: [],
      sejakKapanMasalahMakan: 'Ingin evaluasi berkala apakah porsi dan jadwal makan sudah optimal.',
      upayaYangSudahDicoba: 'Menerapkan feeding rules sejak MPASI 6 bulan.',
      harapanOrangTuaPilihan: ['Berat badan anak naik sesuai kurva WHO'],
      harapanOrangTuaIsian: 'Memastikan jadwal makan dan susu saat ini sudah tepat untuk usia hampir 2 tahun.',
      keluhanUtama: ['Lainnya'],
      ceritaKondisi: 'Rafaizan makan lahap di kursi makan bersama keluarga tanpa gadget. Kadang porsi terlihat lebih sedikit dibanding anak tetangga tapi BB naik konsisten.',
      pertanyaanDokter1: 'Apakah volume susu 350 ml/hari sudah pas untuk anak 22 bulan?',
      pertanyaanDokter2: '',
      pertanyaanDokter3: '',
      persetujuanDataTimMedis: true,
      persetujuanKontakWhatsApp: true,
    },
    'Pola makan dan feeding rules R1-R11 sudah 100% sesuai target. Pertahankan dan pantau kurva pertumbuhan tiap 3 bulan.'
  ),
];

// Urutkan agar data yang diisi langsung oleh user di /community selalu berada di paling atas (#1)
function sortCommunityRecordsPriority(records: CommunityAssessmentRecord[]): CommunityAssessmentRecord[] {
  return [...records].sort((a, b) => {
    const aIsUser = isUserSubmittedCommunityRecord(a.id) ? 1 : 0;
    const bIsUser = isUserSubmittedCommunityRecord(b.id) ? 1 : 0;
    if (aIsUser !== bIsUser) {
      return bIsUser - aIsUser;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function notifyCommunityRealtimeUpdate() {
  if (typeof window === 'undefined') return;
  try {
    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel(COMMUNITY_BROADCAST_CHANNEL);
      bc.postMessage({ type: 'COMMUNITY_DATA_UPDATED', timestamp: Date.now() });
      bc.close();
    }
    window.dispatchEvent(new CustomEvent('tka_community_updated'));
  } catch (e) {
    console.warn('BroadcastChannel error:', e);
  }
}

export function subscribeToCommunityUpdates(onUpdate: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  let bc: BroadcastChannel | null = null;
  if ('BroadcastChannel' in window) {
    try {
      bc = new BroadcastChannel(COMMUNITY_BROADCAST_CHANNEL);
      bc.onmessage = () => {
        onUpdate();
      };
    } catch (e) {
      console.warn('BroadcastChannel subscribe error:', e);
    }
  }

  const handleStorage = (e: StorageEvent) => {
    if (e.key === COMMUNITY_LOCAL_STORAGE_KEY || e.key === LEGACY_COMMUNITY_STORAGE_KEY) {
      onUpdate();
    }
  };

  const handleCustom = () => {
    onUpdate();
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener('tka_community_updated', handleCustom);

  const supabase = getSupabaseClient();
  let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
  if (supabase) {
    try {
      channel = supabase
        .channel('realtime:community_assessments')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: SUPABASE_COMMUNITY_TABLE },
          () => {
            onUpdate();
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('Supabase community realtime subscription error:', e);
    }
  }

  return () => {
    if (bc) bc.close();
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('tka_community_updated', handleCustom);
    if (supabase && channel) {
      supabase.removeChannel(channel);
    }
  };
}

export function getLocalCommunityRecords(): CommunityAssessmentRecord[] {
  if (typeof window === 'undefined') return SEED_COMMUNITY_RECORDS;
  try {
    const raw = localStorage.getItem(COMMUNITY_LOCAL_STORAGE_KEY);
    if (!raw) {
      // Cek apakah ada input asli user di key v1 sebelumnya
      let userRecordsFromV1: CommunityAssessmentRecord[] = [];
      try {
        const legacyRaw = localStorage.getItem(LEGACY_COMMUNITY_STORAGE_KEY);
        if (legacyRaw) {
          const parsedLegacy = JSON.parse(legacyRaw) as CommunityAssessmentRecord[];
          if (Array.isArray(parsedLegacy)) {
            userRecordsFromV1 = parsedLegacy.filter(
              (r) => r && r.id && !LEGACY_SEED_IDS.has(r.id)
            );
          }
        }
      } catch {
        // ignore legacy parse error
      }

      const initialList = sortCommunityRecordsPriority([
        ...userRecordsFromV1,
        ...SEED_COMMUNITY_RECORDS,
      ]);
      localStorage.setItem(COMMUNITY_LOCAL_STORAGE_KEY, JSON.stringify(initialList));
      return initialList;
    }

    const parsed = JSON.parse(raw) as CommunityAssessmentRecord[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(COMMUNITY_LOCAL_STORAGE_KEY, JSON.stringify(SEED_COMMUNITY_RECORDS));
      return SEED_COMMUNITY_RECORDS;
    }

    return sortCommunityRecordsPriority(parsed);
  } catch (err) {
    console.error('Error reading local community records:', err);
    return SEED_COMMUNITY_RECORDS;
  }
}

export function saveLocalCommunityRecords(records: CommunityAssessmentRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    const sorted = sortCommunityRecordsPriority(records);
    localStorage.setItem(COMMUNITY_LOCAL_STORAGE_KEY, JSON.stringify(sorted));
    notifyCommunityRealtimeUpdate();
  } catch (err) {
    console.error('Error saving local community records:', err);
  }
}

export async function saveCommunityAssessmentRecord(
  record: CommunityAssessmentRecord
): Promise<{ savedToSupabase: boolean; error?: string }> {
  const existing = getLocalCommunityRecords();
  const updated = sortCommunityRecordsPriority([
    record,
    ...existing.filter((r) => r.id !== record.id),
  ]);
  saveLocalCommunityRecords(updated);

  const supabase = getSupabaseClient();
  if (!supabase) {
    return { savedToSupabase: false };
  }

  try {
    const { error } = await supabase
      .from(SUPABASE_COMMUNITY_TABLE)
      .upsert([record], { onConflict: 'id' });
    if (error) {
      console.warn('Supabase community_assessments insert warning (fallback local active):', error.message);
      return { savedToSupabase: false, error: error.message };
    }
    notifyCommunityRealtimeUpdate();
    return { savedToSupabase: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { savedToSupabase: false, error: message };
  }
}

export async function fetchAllCommunityAssessments(): Promise<{
  records: CommunityAssessmentRecord[];
  fromSupabase: boolean;
}> {
  const localRecords = getLocalCommunityRecords();
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { records: localRecords, fromSupabase: false };
  }

  try {
    const { data, error } = await supabase
      .from(SUPABASE_COMMUNITY_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      return { records: localRecords, fromSupabase: false };
    }

    const remoteRecords = (data as CommunityAssessmentRecord[]).filter(
      (r) => r && r.id && !LEGACY_SEED_IDS.has(r.id)
    );
    const mergedMap = new Map<string, CommunityAssessmentRecord>();

    for (const rec of localRecords) {
      mergedMap.set(rec.id, rec);
    }
    for (const rec of remoteRecords) {
      mergedMap.set(rec.id, rec);
    }

    const merged = sortCommunityRecordsPriority(Array.from(mergedMap.values()));
    saveLocalCommunityRecords(merged);
    return { records: merged, fromSupabase: true };
  } catch {
    return { records: localRecords, fromSupabase: false };
  }
}

export async function syncCommunityRecordsToSupabase(
  recordsToSync: CommunityAssessmentRecord[]
): Promise<{ success: boolean; syncedCount: number; error?: string }> {
  if (!recordsToSync.length) {
    return { success: true, syncedCount: 0 };
  }
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      success: false,
      syncedCount: 0,
      error: 'Supabase client tidak tersedia.',
    };
  }
  try {
    const { error } = await supabase
      .from(SUPABASE_COMMUNITY_TABLE)
      .upsert(recordsToSync, { onConflict: 'id' });

    if (error) {
      return {
        success: false,
        syncedCount: 0,
        error: error.message,
      };
    }
    notifyCommunityRealtimeUpdate();
    return {
      success: true,
      syncedCount: recordsToSync.length,
    };
  } catch (err) {
    return {
      success: false,
      syncedCount: 0,
      error: err instanceof Error ? err.message : 'Gagal menghubungi server Supabase',
    };
  }
}

export async function updateCommunityAssessmentRecord(
  id: string,
  updates: Partial<Pick<CommunityAssessmentRecord, 'status' | 'reviewer_notes' | 'whatsapp_template'>>
): Promise<CommunityAssessmentRecord[]> {
  const current = getLocalCommunityRecords();
  const nowIso = new Date().toISOString();

  const updated = sortCommunityRecordsPriority(
    current.map((r) => {
      if (r.id !== id) return r;
      const nextNotes = updates.reviewer_notes !== undefined ? updates.reviewer_notes : r.reviewer_notes;
      const nextWa =
        updates.whatsapp_template !== undefined
          ? updates.whatsapp_template
          : nextNotes !== undefined
          ? evaluateLittleBiteAssessment(r.form_data, nextNotes).whatsappMessageTemplate
          : r.whatsapp_template;

      return {
        ...r,
        ...updates,
        reviewer_notes: nextNotes,
        whatsapp_template: nextWa,
        updated_at: nowIso,
      };
    })
  );

  saveLocalCommunityRecords(updated);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const target = updated.find((r) => r.id === id);
      if (target) {
        await supabase
          .from(SUPABASE_COMMUNITY_TABLE)
          .update({
            status: target.status,
            reviewer_notes: target.reviewer_notes,
            whatsapp_template: target.whatsapp_template,
            updated_at: nowIso,
          })
          .eq('id', id);
      }
      notifyCommunityRealtimeUpdate();
    } catch (e) {
      console.warn('Supabase community update warning:', e);
    }
  }

  return updated;
}

export async function deleteCommunityAssessmentRecord(id: string): Promise<CommunityAssessmentRecord[]> {
  const current = getLocalCommunityRecords();
  const updated = current.filter((r) => r.id !== id);
  saveLocalCommunityRecords(updated);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from(SUPABASE_COMMUNITY_TABLE).delete().eq('id', id);
      notifyCommunityRealtimeUpdate();
    } catch (e) {
      console.warn('Supabase community delete warning:', e);
    }
  }

  return updated;
}
