'use client';

import React, { useState, useMemo } from 'react';
import {
  FoodRepertoireRow,
  Gender,
} from '@/types/screening';
import {
  generateCommunityRecordId,
  createCommunityRecordFromFormData,
  saveCommunityAssessmentRecord,
} from '@/lib/community-storage';
import {
  calculateAgeFromDob,
  getDobBounds,
  getAgeSpecificAnthropometryBounds,
  validatePersonName,
  validateWhatsAppNumber,
  validateChildWeightAndHeight,
  validateBirthWeightAndGestation,
  validateWeightHistory,
} from '@/lib/anthropometry';
import {
  LittleBiteScreeningData,
  LittleBiteEvaluationResult,
  FEEDING_RULES_MAP,
  PRIORITY_RULE_ORDER,
  RED_FLAG_GROUPS,
} from '@/lib/littlebite';
import {
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  MessageCircle,
  Copy,
  Check,
  RotateCcw,
  FileCheck2,
  Stethoscope,
  ClipboardList,
  CheckCircle2,
} from 'lucide-react';

const INITIAL_REPERTOIRE: FoodRepertoireRow[] = [
  { kategori: 'Karbohidrat', makananMau: '', makananTidakMau: '' },
  { kategori: 'Protein hewani', makananMau: '', makananTidakMau: '' },
  { kategori: 'Protein nabati', makananMau: '', makananTidakMau: '' },
  { kategori: 'Sayur', makananMau: '', makananTidakMau: '' },
  { kategori: 'Buah', makananMau: '', makananTidakMau: '' },
  { kategori: 'Dairy', makananMau: '', makananTidakMau: '' },
  { kategori: 'Snack', makananMau: '', makananTidakMau: '' },
];

const TEXTURE_OPTIONS = [
  'Puree',
  'Lumat',
  'Cincang',
  'Lunak',
  'Makanan keluarga',
];

const BEHAVIOR_OPTIONS = [
  'Menutup mulut',
  'Memalingkan wajah',
  'Menangis',
  'Kabur dari meja makan',
  'Melempar makanan',
  'Memukul / menolak pengasuh',
  'Harus disuapi',
  'Harus sambil gadget',
  'Harus sambil bermain',
  'Hanya mau makan dengan orang tertentu',
  'Sangat lama menghabiskan makanan',
];

const SENSORY_OPTIONS = [
  'Tekstur',
  'Warna',
  'Aroma',
  'Rasa',
  'Suhu',
  'Bentuk',
  'Campuran makanan',
  'Takut makanan baru',
  'Tidak diketahui',
];

const MAIN_COMPLAINT_OPTIONS = [
  'GTM (Gerakan Tutup Mulut)',
  'Porsi makan sedikit',
  'Pilih-pilih makanan (Picky Eating)',
  'Tidak mau protein',
  'Tidak mau sayur/buah',
  'Sulit naik tekstur',
  'Lama makan (>30 menit)',
  'Sering melepeh makanan',
  'Gagging / batuk / tersedak',
  'BB sulit naik / stagnan',
];

export function LittleBiteScreeningForm() {
  const [formData, setFormData] = useState<LittleBiteScreeningData>({
    // Bagian 1: Data Orang Tua (Sama seperti /assessment)
    namaAyah: '',
    waAyah: '',
    namaIbu: '',
    waIbu: '',
    email: '',
    domisili: '',

    // Bagian 2: Data Anak (Sama seperti /assessment)
    namaLengkapAnak: '',
    dob: '',
    jenisKelamin: 'Laki-laki',
    bbSekarang: '',
    tbPB: '',
    tanggalUkur: '',
    statusKelahiran: 'Cukup bulan',
    usiaKehamilanMinggu: '',
    bbLahir: '',
    pbLahir: '',
    asiEksklusifBulan: '6',
    usiaMulaiMpasiBulan: '6',
    teksturMpasiPertama: 'Puree halus / Bubur saring',
    adaAlergi: 'Tidak',
    pemicuAlergi: '',
    penyakitPenyertaRawatInap: 'Tidak',
    obatSuplemenRutin: '',
    adaKeterlambatanPerkembangan: 'Tidak',
    detailKeterlambatanPerkembangan: '',

    // Bagian 3: Riwayat Makan & Susu
    q3a_minumanUtama: ['Susu formula'],
    q3b_totalSusu24Jam: '450',
    q3b_satuanSusu: 'ml/hari',
    q3c_caraMinumSusu: 'Botol atau dot',
    q3d_waktuMinumSusu: ['Menjelang tidur'],
    q3e_gelasAirPutih: '3 sampai 5',
    q3f_minumanManisKemasan: 'Tidak',
    q3g_minumBanyakSaatMakan: 'Tidak',

    // Bagian 4: Food Repertoire
    repertoire: INITIAL_REPERTOIRE,
    jumlahJenisDiterima: '5-10 jenis',

    // Bagian 5: Tekstur & Oral Motor
    teksturDiterima: ['Lunak'],
    bisaMengunyah: 'Ya',
    seringGagging: 'Tidak',
    seringBatuk: 'Tidak',
    pernahTersedak: 'Tidak',
    melepehMakanan: 'Tidak',
    lamaDiMulut: 'Tidak',
    sulitNaikTekstur: 'Tidak',
    hanyaMauTeksturTertentu: 'Tidak',

    // Bagian 6 (dan Bagian 11): Feeding Rules R1–R11
    q6_1_frekuensiMakanUtama: '3 kali',
    q6_2_frekuensiSelingan: '1 sampai 2 kali',
    q6_3_jamMakanSama: 'Kadang',
    q6_4_jedaTerpendek: 'Kurang dari 2 jam',
    q6_5_durasiMakan: '30 sampai 45 menit',
    q6_6_lokasiCaraMakan: ['Kursi makan'],
    q6_7_pendampingMakan: ['HP atau tablet'],
    q6_8_responMenolakMakan: ['Membujuk terus'],
    q6_9_kemandirianMakan: 'Disuapi penuh',
    q6_10_pengasuhMenyuapi: ['Ibu'],
    q6_10_konsistensiAturan: 'Sama',
    q6_11_makanBersamaKeluarga: 'Beberapa kali seminggu',
    q6_12_tawaranMakananBaru: '3 sampai 5 kali',
    q6_13_porsiDisajikan: 'Sesuai usia',
    q6_14_mintaCamilanLuarJadwal: 'Kadang diberi',

    // Bagian 6 (/assessment): Perilaku Saat Makan
    perilakuMakan: ['Menutup mulut', 'Harus disuapi'],

    // Bagian 7 (/assessment): Sensorik
    alasanSensorik: ['Tekstur'],

    // Bagian 8 (/assessment): 24-Hour Food Recall
    foodRecall: {
      bangunSusu: '',
      sarapanMenu: '',
      sarapanPorsi: '',
      snackPagiMenu: '',
      snackPagiPorsi: '',
      makanSiangMenu: '',
      makanSiangPorsi: '',
      snackSoreMenu: '',
      snackSorePorsi: '',
      makanMalamMenu: '',
      makanMalamPorsi: '',
      susuSebelumTidur: '',
    },

    // Bagian 9 (/assessment): Riwayat Berat Badan
    riwayatBB: {
      bb3BulanLalu: '',
      bb2BulanLalu: '',
      bb1BulanLalu: '',
      bbSekarang: '',
      tbTerakhir: '',
      tanggalUkurTerakhir: '',
      lingkarKepalaTerakhir: '',
      fotoKurvaDataUrl: undefined,
      fotoKurvaNamaFile: undefined,
      bbStagnan: 'Ya',
      pernahTurunBB: 'Tidak',
      targetBB: '',
    },

    // Bagian 10 (/assessment): Keluhan Utama & 3 Pertanyaan untuk Dokter
    redFlagsSelected: [],
    sejakKapanMasalahMakan: '',
    upayaYangSudahDicoba: '',
    harapanOrangTuaPilihan: [],
    harapanOrangTuaIsian: '',
    keluhanUtama: ['GTM (Gerakan Tutup Mulut)', 'Porsi makan sedikit'],
    ceritaKondisi: '',
    pertanyaanDokter1: '',
    pertanyaanDokter2: '',
    pertanyaanDokter3: '',
    persetujuanDataTimMedis: true,
    persetujuanKontakWhatsApp: true,
  });

  // UI state tambahan agar 100% identik dengan /assessment
  const [keluhanLainnya, setKeluhanLainnya] = useState<string>('');
  const [riwayatNICU, setRiwayatNICU] = useState<'Ya' | 'Tidak'>('Tidak');
  const [jenisSusuSimple, setJenisSusuSimple] = useState<string>('Sufor');
  const [jumlahSusuSimple, setJumlahSusuSimple] = useState<string>('400-500 ml (2-3 botol)');
  const [frekuensiMakanSimple, setFrekuensiMakanSimple] = useState<string>('3x sehari');
  const [frekuensiSnackSimple, setFrekuensiSnackSimple] = useState<string>('2x sehari');
  const [durasiMakanSimple, setDurasiMakanSimple] = useState<string>('30-45 menit');
  const [lokasiMakanSimple, setLokasiMakanSimple] = useState<string>('Meja makan / kursi makan');
  const [jadwalMakanSimple, setJadwalMakanSimple] = useState<string>('Kadang maju/mundur');
  const [makanSambilGadgetSimple, setMakanSambilGadgetSimple] = useState<'Ya' | 'Tidak'>('Ya');
  const [makanSambilJalanSimple, setMakanSambilJalanSimple] = useState<'Ya' | 'Tidak'>('Tidak');
  const [seringDibujukDipaksaSimple, setSeringDibujukDipaksaSimple] = useState<'Ya' | 'Tidak'>('Ya');

  // 11 Bagian: Bagian 1 s/d 10 sama persis dengan /assessment + Bagian 11 Tambahan Feeding Rules (R1–R11)
  const totalSteps = 11;
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedRecordId, setSubmittedRecordId] = useState<string | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<LittleBiteEvaluationResult | null>(null);
  const [copiedWaTemplate, setCopiedWaTemplate] = useState<boolean>(false);

  const dobBounds = useMemo(() => getDobBounds(), []);
  const ageEvaluation = useMemo(() => calculateAgeFromDob(formData.dob), [formData.dob]);
  const ageBounds = useMemo(
    () => getAgeSpecificAnthropometryBounds(formData.dob, formData.jenisKelamin),
    [formData.dob, formData.jenisKelamin]
  );

  const liveAnthError = useMemo(() => {
    if (!formData.bbSekarang || !formData.tbPB) return null;
    return validateChildWeightAndHeight(
      formData.dob,
      formData.bbSekarang,
      formData.tbPB,
      formData.jenisKelamin
    );
  }, [formData.dob, formData.bbSekarang, formData.tbPB, formData.jenisKelamin]);

  const scrollToTop = () => {
    window.scrollTo({ top: 150, behavior: 'smooth' });
  };

  const handleDobChange = (dobValue: string) => {
    setStepError(null);
    setFormData((prev) => ({
      ...prev,
      dob: dobValue,
    }));
  };

  const toggleArrayItem = (
    field:
      | 'teksturDiterima'
      | 'perilakuMakan'
      | 'alasanSensorik'
      | 'keluhanUtama'
      | 'q3a_minumanUtama'
      | 'q3d_waktuMinumSusu'
      | 'q6_6_lokasiCaraMakan'
      | 'q6_7_pendampingMakan'
      | 'q6_8_responMenolakMakan'
      | 'q6_10_pengasuhMenyuapi'
      | 'redFlagsSelected',
    item: string
  ) => {
    setStepError(null);
    setFormData((prev) => {
      const arr = prev[field] as string[];
      if (field === 'q6_7_pendampingMakan') {
        if (item === 'Tidak ada') {
          return { ...prev, q6_7_pendampingMakan: ['Tidak ada'] };
        }
        const withoutNone = arr.filter((x) => x !== 'Tidak ada');
        const exists = withoutNone.includes(item);
        const next = exists ? withoutNone.filter((x) => x !== item) : [...withoutNone, item];
        return { ...prev, q6_7_pendampingMakan: next.length ? next : ['Tidak ada'] };
      }

      if (field === 'q3a_minumanUtama') {
        if (item === 'Tidak minum susu') {
          return { ...prev, q3a_minumanUtama: ['Tidak minum susu'] };
        }
        const withoutNone = arr.filter((x) => x !== 'Tidak minum susu');
        const exists = withoutNone.includes(item);
        const next = exists ? withoutNone.filter((x) => x !== item) : [...withoutNone, item];
        return { ...prev, q3a_minumanUtama: next.length ? next : ['Tidak minum susu'] };
      }

      const exists = arr.includes(item);
      return {
        ...prev,
        [field]: exists ? arr.filter((i) => i !== item) : [...arr, item],
      };
    });
  };

  const handleRepertoireChange = (
    index: number,
    key: 'makananMau' | 'makananTidakMau',
    val: string
  ) => {
    setFormData((prev) => {
      const updated = [...prev.repertoire];
      updated[index] = { ...updated[index], [key]: val };
      return { ...prev, repertoire: updated };
    });
  };

  const handleFoodRecallChange = (
    key: keyof LittleBiteScreeningData['foodRecall'],
    val: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      foodRecall: { ...prev.foodRecall, [key]: val },
    }));
  };

  const handleRiwayatBBChange = (
    key: keyof LittleBiteScreeningData['riwayatBB'],
    val: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      riwayatBB: { ...prev.riwayatBB, [key]: val },
    }));
  };

  const validatePaidStep = (step: number): string | null => {
    if (step === 1) {
      const motherNameErr = validatePersonName(formData.namaIbu, 'Nama Ibu');
      if (motherNameErr) return motherNameErr;

      const waErr = validateWhatsAppNumber(formData.waIbu);
      if (waErr) return waErr;
    }

    if (step === 2) {
      const childNameErr = validatePersonName(formData.namaLengkapAnak, 'Nama Lengkap Anak');
      if (childNameErr) return childNameErr;

      if (!formData.dob || !ageEvaluation.isValidAgeRange) {
        return (
          ageEvaluation.errorMessage ||
          'Tanggal lahir anak wajib diisi dan harus berusia 0–5 tahun (0–60 bulan).'
        );
      }

      const anthErr = validateChildWeightAndHeight(
        formData.dob,
        formData.bbSekarang,
        formData.tbPB,
        formData.jenisKelamin
      );
      if (anthErr) return anthErr;

      const birthErr = validateBirthWeightAndGestation(
        formData.bbLahir,
        formData.usiaKehamilanMinggu,
        formData.bbSekarang,
        ageEvaluation.totalMonths
      );
      if (birthErr) return birthErr;
    }

    if (step === 9) {
      const weightHistErr = validateWeightHistory(
        formData.dob,
        formData.jenisKelamin,
        formData.bbSekarang,
        formData.riwayatBB
      );
      if (weightHistErr) return weightHistErr;
    }

    if (step === 10) {
      if (!formData.ceritaKondisi.trim() || formData.ceritaKondisi.trim().length < 10) {
        return 'Mohon ceritakan secara singkat kondisi makan anak saat ini (minimal 1 kalimat) pada Bagian 10.';
      }
    }

    return null;
  };

  const handleNextPaidStep = () => {
    const err = validatePaidStep(currentStep);
    if (err) {
      setStepError(err);
      scrollToTop();
      return;
    }
    setStepError(null);
    setCurrentStep((prev) => Math.min(totalSteps, prev + 1));
    scrollToTop();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    for (const stepToCheck of [1, 2, 9, 10]) {
      const err = validatePaidStep(stepToCheck);
      if (err) {
        setCurrentStep(stepToCheck);
        setStepError(err);
        scrollToTop();
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const combinedKeluhan = keluhanLainnya.trim()
        ? [...formData.keluhanUtama, `Lainnya: ${keluhanLainnya.trim()}`]
        : formData.keluhanUtama;

      const finalData: LittleBiteScreeningData = {
        ...formData,
        keluhanUtama: combinedKeluhan,
        penyakitPenyertaRawatInap:
          riwayatNICU === 'Ya' ? 'Riwayat perawatan NICU' : 'Tidak ada riwayat NICU',
      };

      const recordId = generateCommunityRecordId();
      const nowIso = new Date().toISOString();
      const communityRecord = createCommunityRecordFromFormData(
        recordId,
        nowIso,
        'Baru',
        finalData
      );

      await saveCommunityAssessmentRecord(communityRecord);
      setSubmittedRecordId(recordId);
      setEvaluationResult(communityRecord.evaluation_result);
      scrollToTop();
    } catch (err) {
      console.error(err);
      setStepError(
        'Terjadi kendala saat menyimpan data asesmen. Silakan periksa koneksi internet dan coba kembali.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyWaTemplate = async () => {
    if (!evaluationResult) return;
    try {
      await navigator.clipboard.writeText(evaluationResult.whatsappMessageTemplate);
      setCopiedWaTemplate(true);
      setTimeout(() => setCopiedWaTemplate(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const STEP_LABELS = [
    '1. Data Ibu',
    '2. Data Anak',
    '3. Riwayat Makan',
    '4. Food Repertoire',
    '5. Tekstur & Oral',
    '6. Perilaku Makan',
    '7. Sensorik',
    '8. 24h Recall',
    '9. Riwayat BB',
    '10. Keluhan & Tanya Dokter',
    '11. Feeding Rules',
  ];

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
      {submittedRecordId && evaluationResult ? (
        /* ================= HASIL REVIEW ASESMEN & FEEDING RULES ================= */
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-lg space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Data Berhasil Tersimpan · ID: {submittedRecordId}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Hasil Asesmen &amp; Evaluasi Feeding Rules: {formData.namaLengkapAnak}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Ibu <strong>{formData.namaIbu}</strong> · Usia Anak:{' '}
                <strong>{evaluationResult.ageFormatted}</strong> ({formData.jenisKelamin} · BB{' '}
                {formData.bbSekarang} kg / TB {formData.tbPB} cm)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start">
              <button
                type="button"
                onClick={() => {
                  setSubmittedRecordId(null);
                  setEvaluationResult(null);
                  setCurrentStep(1);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Isi Data Baru</span>
              </button>
            </div>
          </div>

          {evaluationResult.hasRedFlags && (
            <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-950 space-y-2">
              <div className="flex items-center gap-2 font-black text-sm sm:text-base text-rose-800">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>Perhatian Medis (Tanda Bahaya / Red Flag Terdeteksi)</span>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed">
                Berdasarkan asesmen, ditemukan kondisi yang sebaiknya diperiksakan langsung ke dokter bersamaan dengan perbaikan aturan makan di rumah:
              </p>
              <ul className="list-disc list-inside text-xs sm:text-sm font-semibold space-y-1">
                {evaluationResult.redFlagLabels.map((rf, i) => (
                  <li key={i}>{rf}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-1">
              <span className="text-[11px] text-slate-400 font-semibold">Kategori Utama</span>
              <div className="text-base sm:text-lg font-black text-[#ccff00]">
                {evaluationResult.category}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                {evaluationResult.categoryReason}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] text-slate-500 font-semibold">Evaluasi Feeding Rules</span>
              <div className="text-sm font-bold text-slate-900">
                {evaluationResult.totalViolatedCount} dari 11 Aturan Makan Perlu Koreksi
              </div>
              <p className="text-xs text-slate-600 pt-1">
                Langkah lanjut: <strong>{evaluationResult.nextStepText}</strong>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-1">
              <span className="text-[11px] text-indigo-700 font-semibold">
                Rekomendasi Program Pendampingan
              </span>
              <div className="text-sm sm:text-base font-black text-indigo-950">
                {evaluationResult.recommendedPackage}
              </div>
              <p className="text-xs text-indigo-800 pt-1">
                Program EAT &amp; GROW bersama dr. Harys Maulana, Sp.A
              </p>
            </div>
          </div>

          {evaluationResult.isHomeFeedingPatternMainCause && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs sm:text-sm font-semibold">
              Catatan Evaluasi Feeding Rules: Karena terdapat {evaluationResult.totalViolatedCount} dari 11 aturan makan yang perlu dikoreksi, pola pemberian makan di rumah kemungkinan besar menjadi penyebab utama masalah makan saat ini.
            </div>
          )}

          {/* 3 Koreksi Prioritas */}
          <div className="space-y-3">
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              3 Koreksi Prioritas Feeding Rules Minggu Ini
            </h3>
            {evaluationResult.top3PriorityCorrections.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {evaluationResult.top3PriorityCorrections.map((rule, idx) => (
                  <div
                    key={rule.code}
                    className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 font-semibold">
                      <span>
                        Prioritas #{idx + 1} ({rule.code}) · {rule.definition.targetTitle}
                      </span>
                      <span className="text-rose-600 font-bold">Perlu Koreksi</span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 leading-relaxed">
                      {rule.definition.parentCorrectionText}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-bold">
                Seluruh 11 Aturan Makan (Feeding Rules R1–R11) di rumah sudah sesuai target!
              </div>
            )}
          </div>

          {/* Tabel Status Lengkap 11 Feeding Rules (R1-R11) */}
          <div className="space-y-2.5">
            <h3 className="text-sm sm:text-base font-black text-slate-900">
              Rincian Evaluasi 11 Aturan Makan (Feeding Rules R1–R11)
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase font-black">
                  <tr>
                    <th className="p-3 w-16">Kode</th>
                    <th className="p-3">Aturan Makan (Feeding Rules)</th>
                    <th className="p-3 w-36">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {PRIORITY_RULE_ORDER.slice()
                    .sort((a, b) => Number(a.replace('R', '')) - Number(b.replace('R', '')))
                    .map((code) => {
                      const st = evaluationResult.ruleStatuses[code];
                      return (
                        <tr key={code} className="hover:bg-slate-50">
                          <td className="p-3 font-black text-slate-900">{code}</td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">
                              {st.definition.targetTitle}
                            </div>
                            {st.triggers.length > 0 && (
                              <div className="text-[11px] text-rose-700 mt-0.5">
                                Temuan: {st.triggers.join(' · ')}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-black ${
                                st.status === 'Sesuai'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {st.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-4 sm:p-6 rounded-2xl bg-slate-950 text-white space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#ccff00]">
                  Ringkasan Hasil untuk WhatsApp
                </h3>
                <p className="text-xs text-slate-400">
                  Salin atau kirimkan hasil asesmen ini ke WhatsApp Admin / Dokter:
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCopyWaTemplate}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  {copiedWaTemplate ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#ccff00]" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Hasil</span>
                    </>
                  )}
                </button>
                <a
                  href={`https://wa.me/6285129992305?text=${encodeURIComponent(
                    evaluationResult.whatsappMessageTemplate
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ccff00] hover:bg-[#b8e600] text-slate-950 text-xs font-black transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Kirim ke WhatsApp</span>
                </a>
              </div>
            </div>

            <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
              {evaluationResult.whatsappMessageTemplate}
            </pre>
          </div>
        </div>
      ) : (
        /* ================= FORM ASESMEN LENGKAP + FEEDING RULES (11 BAGIAN) ================= */
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-slate-200 shadow-lg space-y-6"
        >
          {/* Form Header & Stepper */}
          <div className="border-b border-slate-100 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 font-semibold mb-1">
              <span>FORMULIR PRE-ASSESSMENT &amp; FEEDING RULES</span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-[#ccff00] font-bold">
                Bagian {currentStep} dari {totalSteps}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              ASESMEN MASALAH MAKAN, TUMBUH KEMBANG &amp; FEEDING RULES ANAK
            </h2>

            {/* Step Progress Bar */}
            <div className="mt-3 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-slate-900 h-full transition-all duration-300 rounded-full"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>

            {/* Step Quick Pills */}
            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {STEP_LABELS.map((label, idx) => {
                const stepNum = idx + 1;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      if (stepNum < currentStep) {
                        setStepError(null);
                        setCurrentStep(stepNum);
                      } else {
                        const err = validatePaidStep(currentStep);
                        if (err) {
                          setStepError(err);
                          return;
                        }
                        setStepError(null);
                        setCurrentStep(stepNum);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                      currentStep === stepNum
                        ? 'bg-slate-900 text-[#ccff00]'
                        : stepNum < currentStep
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {stepError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs sm:text-sm font-bold flex items-start gap-2 animate-fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{stepError}</span>
            </div>
          )}

          {/* ===================== STEP 1: DATA IBU (HANYA NAMA IBU, TANPA NAMA AYAH) ===================== */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 border-l-4 border-slate-900 pl-3">
                <h3 className="text-lg font-bold text-slate-900">BAGIAN 1 — DATA IBU</h3>
              </div>
              <p className="text-xs text-slate-500">
                Informasi kontak Ibu/Bunda untuk pengiriman hasil review dan tindak lanjut rekam medis.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nama Ibu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Rina Wardhani"
                    value={formData.namaIbu}
                    onChange={(e) => setFormData({ ...formData, namaIbu: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-slate-900 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    No. WhatsApp Ibu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Contoh: 081234567890"
                    value={formData.waIbu}
                    onChange={(e) => setFormData({ ...formData, waIbu: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-slate-900 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email (opsional)
                  </label>
                  <input
                    type="email"
                    placeholder="Contoh: rina.wardhani@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-slate-900 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Domisili Kota / Kabupaten (opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Cirebon / Indramayu / Majalengka"
                    value={formData.domisili}
                    onChange={(e) => setFormData({ ...formData, domisili: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-slate-900 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ===================== STEP 2: DATA ANAK (SAMA SEPERTI /ASSESSMENT) ===================== */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 border-l-4 border-slate-900 pl-3">
                <h3 className="text-lg font-bold text-slate-900">BAGIAN 2 — DATA ANAK</h3>
              </div>
              <p className="text-xs text-slate-500">
                Tanggal lahir anak (DOB) sangat penting supaya usia dihitung secara tepat saat assessment.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nama Lengkap Anak <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Arsya Bagas Pratama"
                    value={formData.namaLengkapAnak}
                    onChange={(e) => setFormData({ ...formData, namaLengkapAnak: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-slate-900 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tanggal Lahir (DOB — Usia 0–5 Tahun) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    min={dobBounds.minDate}
                    max={dobBounds.maxDate}
                    value={formData.dob}
                    onChange={(e) => handleDobChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-slate-900 text-sm"
                  />
                  {formData.dob && ageEvaluation.isValidAgeRange && (
                    <div className="mt-1.5 text-xs text-indigo-700 font-bold bg-indigo-50 px-2.5 py-1 rounded-md inline-block border border-indigo-100">
                      Usia Terhitung: {ageEvaluation.formatted} (Valid 0–5 Tahun)
                    </div>
                  )}
                  {formData.dob && !ageEvaluation.isValidAgeRange && (
                    <div className="mt-1.5 text-xs text-rose-700 font-bold bg-rose-50 px-2.5 py-1.5 rounded-md flex items-center gap-1.5 border border-rose-200">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                      <span>{ageEvaluation.errorMessage}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Jenis Kelamin
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Laki-laki', 'Perempuan'] as Gender[]).map((gender) => (
                      <button
                        key={gender}
                        type="button"
                        onClick={() => setFormData({ ...formData, jenisKelamin: gender })}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                          formData.jenisKelamin === gender
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        {gender}
                      </button>
                    ))}
                  </div>
                </div>

                {ageBounds && (
                  <div className="sm:col-span-2 p-3 rounded-xl bg-indigo-50/90 border border-indigo-200 text-xs text-indigo-950">
                    <span className="font-bold block">
                      Acuan Standar WHO Anak {formData.jenisKelamin} Usia {ageEvaluation.formatted}:
                    </span>
                    <span className="text-indigo-800 mt-0.5 block">
                      • Berat Badan (BB) Valid: <strong>{ageBounds.minWeightKg} – {ageBounds.maxWeightKg} kg</strong> (Rata-rata Normal WHO: ~{ageBounds.medianWeightKg} kg) • Tinggi/Panjang Badan (TB/PB) Valid: <strong>{ageBounds.minHeightCm} – {ageBounds.maxHeightCm} cm</strong> (Rata-rata Normal WHO: ~{Math.round(ageBounds.medianHeightCm)} cm)
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    BB Sekarang (kg) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={ageBounds ? ageBounds.minWeightKg : 2.0}
                    max={ageBounds ? ageBounds.maxWeightKg : 30}
                    required
                    placeholder={ageBounds ? `Contoh: ${ageBounds.medianWeightKg}` : 'Contoh: 10.2'}
                    value={formData.bbSekarang}
                    onKeyDown={(e) => {
                      if (['e', 'E', '+', '-'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStepError(null);
                      setFormData((prev) => ({
                        ...prev,
                        bbSekarang: val,
                        riwayatBB: {
                          ...prev.riwayatBB,
                          bbSekarang: val,
                        },
                      }));
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-slate-900 text-sm"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {ageBounds
                      ? `Rentang valid usia ${ageEvaluation.formatted}: ${ageBounds.minWeightKg} – ${ageBounds.maxWeightKg} kg`
                      : 'Rentang wajar 0–5 thn: 2.0 – 30 kg'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    TB / PB Sekarang (cm) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={ageBounds ? ageBounds.minHeightCm : 44}
                    max={ageBounds ? ageBounds.maxHeightCm : 128}
                    required
                    placeholder={ageBounds ? `Contoh: ${Math.round(ageBounds.medianHeightCm)}` : 'Contoh: 84'}
                    value={formData.tbPB}
                    onKeyDown={(e) => {
                      if (['e', 'E', '+', '-'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStepError(null);
                      setFormData((prev) => ({
                        ...prev,
                        tbPB: val,
                        riwayatBB: {
                          ...prev.riwayatBB,
                          tbTerakhir: val,
                        },
                      }));
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-slate-900 text-sm"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {ageBounds
                      ? `Rentang valid usia ${ageEvaluation.formatted}: ${ageBounds.minHeightCm} – ${ageBounds.maxHeightCm} cm`
                      : 'Rentang wajar 0–5 thn: 44 – 128 cm'}
                  </span>
                </div>

                {liveAnthError && (
                  <div className="sm:col-span-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{liveAnthError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tanggal Pengukuran BB/TB
                  </label>
                  <input
                    type="date"
                    max={dobBounds.maxDate}
                    value={formData.tanggalUkur}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        tanggalUkur: e.target.value,
                        riwayatBB: {
                          ...prev.riwayatBB,
                          tanggalUkurTerakhir: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-slate-900 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    BB Lahir (kg) &amp; Usia Gestasi (minggu)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0.8"
                      max="5.2"
                      placeholder="BB Lahir (misal: 3.1)"
                      value={formData.bbLahir}
                      onKeyDown={(e) => {
                        if (['e', 'E', '+', '-'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      onChange={(e) => {
                        setStepError(null);
                        setFormData({ ...formData, bbLahir: e.target.value });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                    <input
                      type="number"
                      min="24"
                      max="43"
                      placeholder="Gestasi (misal: 38)"
                      value={formData.usiaKehamilanMinggu}
                      onKeyDown={(e) => {
                        if (['e', 'E', '+', '-'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        const num = Number(val);
                        setStepError(null);
                        setFormData({
                          ...formData,
                          usiaKehamilanMinggu: val,
                          statusKelahiran: !isNaN(num) && num > 0 && num < 37 ? 'Prematur' : 'Cukup bulan',
                        });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Apakah Ada Riwayat Perawatan NICU?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Ya', 'Tidak'] as const).map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setRiwayatNICU(val)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          riwayatNICU === val
                            ? 'bg-slate-900 text-[#ccff00] border-slate-900 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Apakah Ada Alergi / Intoleransi Makanan?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Ya', 'Tidak'] as const).map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            adaAlergi: val,
                          })
                        }
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          formData.adaAlergi === val
                            ? 'bg-slate-900 text-[#ccff00] border-slate-900 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                  {formData.adaAlergi === 'Ya' && (
                    <input
                      type="text"
                      placeholder="Sebutkan alergi (misal: Susu sapi / Telur)"
                      value={formData.pemicuAlergi}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pemicuAlergi: e.target.value,
                        })
                      }
                      className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                    />
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Riwayat Penyakit &amp; Obat/Suplemen yang Sedang Dikonsumsi (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Vitamin D / Zat Besi / Tidak ada"
                    value={formData.obatSuplemenRutin}
                    onChange={(e) => setFormData({ ...formData, obatSuplemenRutin: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-slate-900 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ===================== STEP 3: RIWAYAT MAKAN (SAMA SEPERTI /ASSESSMENT) ===================== */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 border-l-4 border-slate-900 pl-3">
                <h3 className="text-lg font-bold text-slate-900">BAGIAN 3 — RIWAYAT MAKAN</h3>
              </div>
              <p className="text-xs text-slate-500">
                Klik pilihan yang sesuai dengan pola konsumsi susu harian dan kebiasaan makan di rumah:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Jenis Susu Saat Ini
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {['ASI', 'Sufor', 'UHT', 'Kombinasi', 'Tidak Minum Susu'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setJenisSusuSimple(opt);
                          const mappedMilk =
                            opt === 'ASI'
                              ? ['ASI']
                              : opt === 'Sufor'
                              ? ['Susu formula']
                              : opt === 'UHT'
                              ? ['Susu UHT']
                              : opt === 'Kombinasi'
                              ? ['ASI', 'Susu formula']
                              : ['Tidak minum susu'];
                          setFormData((prev) => ({ ...prev, q3a_minumanUtama: mappedMilk }));
                        }}
                        className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          jenisSusuSimple === opt
                            ? 'bg-slate-900 text-[#ccff00] border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Jumlah Susu Per Hari
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      '< 300 ml / sedikit',
                      '400-500 ml (2-3 botol)',
                      '> 600 ml (> 3 botol)',
                      'Menyusu langsung (On demand)',
                    ].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setJumlahSusuSimple(opt);
                          if (opt.includes('< 300')) {
                            setFormData((prev) => ({
                              ...prev,
                              q3b_totalSusu24Jam: '250',
                              q3b_satuanSusu: 'ml/hari',
                            }));
                          } else if (opt.includes('400-500')) {
                            setFormData((prev) => ({
                              ...prev,
                              q3b_totalSusu24Jam: '450',
                              q3b_satuanSusu: 'ml/hari',
                            }));
                          } else if (opt.includes('> 600')) {
                            setFormData((prev) => ({
                              ...prev,
                              q3b_totalSusu24Jam: '700',
                              q3b_satuanSusu: 'ml/hari',
                            }));
                          } else {
                            setFormData((prev) => ({
                              ...prev,
                              q3b_totalSusu24Jam: '6',
                              q3b_satuanSusu: 'kali menyusu langsung/hari',
                            }));
                          }
                        }}
                        className={`py-2 px-2.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          jumlahSusuSimple === opt
                            ? 'bg-slate-900 text-[#ccff00] border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Frekuensi Makan Utama
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {['3x sehari', '2x sehari', '1x sehari', 'Tidak tentu'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setFrekuensiMakanSimple(opt);
                          const mappedFreq =
                            opt === '3x sehari'
                              ? '3 kali'
                              : opt === '2x sehari'
                              ? '2 kali'
                              : opt === '1x sehari'
                              ? '1 kali'
                              : 'Tidak tentu';
                          setFormData((prev) => ({
                            ...prev,
                            q6_1_frekuensiMakanUtama: mappedFreq,
                          }));
                        }}
                        className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          frekuensiMakanSimple === opt
                            ? 'bg-slate-900 text-[#ccff00] border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Frekuensi Snack / Camilan
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {['2x sehari', '1x sehari', 'Sering (>3x)', 'Jarang / Tidak'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setFrekuensiSnackSimple(opt);
                          const mappedSnack =
                            opt === '2x sehari' || opt === '1x sehari'
                              ? '1 sampai 2 kali'
                              : opt === 'Sering (>3x)'
                              ? '3 kali atau lebih'
                              : 'Tidak ada';
                          setFormData((prev) => ({
                            ...prev,
                            q6_2_frekuensiSelingan: mappedSnack,
                          }));
                        }}
                        className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          frekuensiSnackSimple === opt
                            ? 'bg-slate-900 text-[#ccff00] border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Durasi Setiap Sesi Makan
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {['< 15 menit', '15-30 menit', '30-45 menit', '> 45 menit (Lama)'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setDurasiMakanSimple(opt);
                          const mappedDur =
                            opt === '< 15 menit'
                              ? 'Kurang dari 15 menit'
                              : opt === '15-30 menit'
                              ? '15 sampai 30 menit'
                              : opt === '30-45 menit'
                              ? '30 sampai 45 menit'
                              : 'Lebih dari 45 menit';
                          setFormData((prev) => ({
                            ...prev,
                            q6_5_durasiMakan: mappedDur,
                          }));
                        }}
                        className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          durasiMakanSimple === opt
                            ? 'bg-slate-900 text-[#ccff00] border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Lokasi Makan Anak
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      'Meja makan / kursi makan',
                      'Ruang TV / sofa',
                      'Sambil digendong / keliling',
                      'Berpindah-pindah',
                    ].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setLokasiMakanSimple(opt);
                          const mappedLoc =
                            opt === 'Meja makan / kursi makan'
                              ? ['Kursi makan']
                              : opt === 'Ruang TV / sofa'
                              ? ['Meja atau lantai sambil duduk']
                              : opt === 'Sambil digendong / keliling'
                              ? ['Digendong']
                              : ['Sambil berjalan atau berlari'];
                          setFormData((prev) => ({
                            ...prev,
                            q6_6_lokasiCaraMakan: mappedLoc,
                          }));
                        }}
                        className={`py-2 px-2.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          lokasiMakanSimple === opt
                            ? 'bg-slate-900 text-[#ccff00] border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Keteraturan Jadwal Makan Harian
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      'Terjadwal teratur (Jam tetap)',
                      'Kadang maju/mundur',
                      'Tidak terjadwal / sesuka anak',
                    ].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setJadwalMakanSimple(opt);
                          const mappedJadwal =
                            opt === 'Terjadwal teratur (Jam tetap)'
                              ? 'Ya, hampir selalu'
                              : opt === 'Kadang maju/mundur'
                              ? 'Kadang'
                              : 'Tidak teratur';
                          setFormData((prev) => ({
                            ...prev,
                            q6_3_jamMakanSama: mappedJadwal,
                          }));
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          jadwalMakanSimple === opt
                            ? 'bg-slate-900 text-[#ccff00] border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-800 block mb-2">
                      Apakah makan sambil gadget?
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['Ya', 'Tidak'] as const).map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            setMakanSambilGadgetSimple(val);
                            setFormData((prev) => ({
                              ...prev,
                              q6_7_pendampingMakan: val === 'Ya' ? ['HP atau tablet'] : ['Tidak ada'],
                            }));
                          }}
                          className={`py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            makanSambilGadgetSimple === val
                              ? val === 'Ya'
                                ? 'bg-slate-900 text-[#ccff00] border-slate-900 shadow-2xs'
                                : 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-800 block mb-2">
                      Apakah makan sambil jalan-jalan?
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['Ya', 'Tidak'] as const).map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            setMakanSambilJalanSimple(val);
                            if (val === 'Ya') {
                              setFormData((prev) => ({
                                ...prev,
                                q6_6_lokasiCaraMakan: ['Sambil berjalan atau berlari'],
                              }));
                            }
                          }}
                          className={`py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            makanSambilJalanSimple === val
                              ? val === 'Ya'
                                ? 'bg-slate-900 text-[#ccff00] border-slate-900 shadow-2xs'
                                : 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-800 block mb-2">
                      Apakah sering dibujuk / dipaksa?
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['Ya', 'Tidak'] as const).map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            setSeringDibujukDipaksaSimple(val);
                            setFormData((prev) => ({
                              ...prev,
                              q6_8_responMenolakMakan:
                                val === 'Ya'
                                  ? ['Membujuk terus', 'Memaksa atau membuka mulut anak']
                                  : ['Makanan diangkat dengan tenang'],
                            }));
                          }}
                          className={`py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            seringDibujukDipaksaSimple === val
                              ? val === 'Ya'
                                ? 'bg-slate-900 text-[#ccff00] border-slate-900 shadow-2xs'
                                : 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================== STEP 4: FOOD REPERTOIRE (SAMA SEPERTI /ASSESSMENT) ===================== */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 border-l-4 border-slate-900 pl-3">
                <h3 className="text-lg font-bold text-slate-900">BAGIAN 4 — FOOD REPERTOIRE</h3>
              </div>
              <p className="text-xs text-slate-500">
                Tuliskan ragam makanan yang diterima (MAU) vs ditolak (TIDAK MAU) untuk setiap kelompok:
              </p>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-black tracking-wider text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="p-3 w-1/4">Kelompok</th>
                      <th className="p-3 w-3/8 text-emerald-800">Makanan yang MAU</th>
                      <th className="p-3 w-3/8 text-rose-800">Makanan yang TIDAK MAU</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {formData.repertoire.map((row, idx) => (
                      <tr key={row.kategori} className="hover:bg-slate-50/60">
                        <td className="p-3 font-bold text-slate-900 bg-slate-50/50">
                          {row.kategori}
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="Contoh jenis yg mau..."
                            value={row.makananMau}
                            onChange={(e) => handleRepertoireChange(idx, 'makananMau', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 focus:border-slate-900 text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="Contoh jenis yg ditolak..."
                            value={row.makananTidakMau}
                            onChange={(e) =>
                              handleRepertoireChange(idx, 'makananTidakMau', e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 focus:border-slate-900 text-xs"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Jumlah jenis makanan yang masih diterima anak (Pilih salah satu):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    '< 5 jenis (Sangat pilih-pilih)',
                    '5-10 jenis',
                    '10-15 jenis',
                    '> 15 jenis (Beragam)',
                  ].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFormData({ ...formData, jumlahJenisDiterima: opt })}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        formData.jumlahJenisDiterima === opt
                          ? 'bg-slate-900 text-[#ccff00] border-slate-900 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===================== STEP 5: TEKSTUR & ORAL MOTOR (SAMA SEPERTI /ASSESSMENT) ===================== */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 border-l-4 border-slate-900 pl-3">
                <h3 className="text-lg font-bold text-slate-900">BAGIAN 5 — TEKSTUR &amp; ORAL MOTOR</h3>
              </div>
              <p className="text-xs text-slate-500">
                Evaluasi kemampuan mengunyah, refleks menelan, dan adaptasi tekstur:
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Tekstur yang bisa diterima anak saat ini: (Pilih semua yang sesuai)
                </label>
                <div className="flex flex-wrap gap-2">
                  {TEXTURE_OPTIONS.map((tekstur) => {
                    const isSelected = formData.teksturDiterima.includes(tekstur);
                    return (
                      <button
                        key={tekstur}
                        type="button"
                        onClick={() => toggleArrayItem('teksturDiterima', tekstur)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {tekstur}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                {[
                  { field: 'bisaMengunyah', label: 'Apakah bisa mengunyah makanan?' },
                  { field: 'seringGagging', label: 'Apakah sering gagging (mual/mau muntah)?' },
                  { field: 'seringBatuk', label: 'Apakah sering batuk saat makan?' },
                  { field: 'pernahTersedak', label: 'Apakah pernah tersedak?' },
                  { field: 'melepehMakanan', label: 'Apakah sering melepeh makanan?' },
                  { field: 'lamaDiMulut', label: 'Apakah makanan lama berada di mulut (mengemut)?' },
                  { field: 'sulitNaikTekstur', label: 'Apakah sulit naik tekstur?' },
                  { field: 'hanyaMauTeksturTertentu', label: 'Apakah hanya mau tekstur tertentu?' },
                ].map((item) => {
                  const currentVal = (formData as unknown as Record<string, string>)[item.field];
                  return (
                    <div key={item.field} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-xs font-bold text-slate-800 block mb-2">
                        {item.label}
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {['Ya', 'Tidak'].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setFormData({ ...formData, [item.field]: val })}
                            className={`py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              currentVal === val
                                ? val === 'Ya'
                                  ? 'bg-slate-900 text-[#ccff00] border-slate-900 shadow-2xs'
                                  : 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===================== STEP 6: PERILAKU SAAT MAKAN (SAMA SEPERTI /ASSESSMENT) ===================== */}
          {currentStep === 6 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 border-l-4 border-slate-900 pl-3">
                <h3 className="text-lg font-bold text-slate-900">BAGIAN 6 — PERILAKU SAAT MAKAN</h3>
              </div>
              <p className="text-xs text-slate-500">
                Pilih perilaku yang sering ditunjukkan anak saat sesi makan (Centang yang sesuai):
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {BEHAVIOR_OPTIONS.map((item) => {
                  const checked = formData.perilakuMakan.includes(item);
                  return (
                    <label
                      key={item}
                      onClick={() => toggleArrayItem('perilakuMakan', item)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-xs sm:text-sm font-semibold cursor-pointer transition-all ${
                        checked
                          ? 'bg-rose-50/70 border-rose-300 text-rose-950 font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-slate-900 focus:ring-0"
                      />
                      <span>{item}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===================== STEP 7: SENSORIK (SAMA SEPERTI /ASSESSMENT) ===================== */}
          {currentStep === 7 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 border-l-4 border-slate-900 pl-3">
                <h3 className="text-lg font-bold text-slate-900">BAGIAN 7 — SENSORIK</h3>
              </div>
              <p className="text-xs text-slate-500">
                Anak biasanya menolak makanan karena faktor apa saja? (Bisa pilih lebih dari satu):
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {SENSORY_OPTIONS.map((item) => {
                  const checked = formData.alasanSensorik.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleArrayItem('alasanSensorik', item)}
                      className={`p-3 rounded-xl border text-xs sm:text-sm font-bold text-left transition-all flex items-center justify-between ${
                        checked
                          ? 'bg-[#ccff00]/40 border-slate-900 text-slate-950'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{item}</span>
                      <span className="text-xs font-black">{checked ? '✓' : '+'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===================== STEP 8: 24-HOUR FOOD RECALL (SAMA SEPERTI /ASSESSMENT) ===================== */}
          {currentStep === 8 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 border-l-4 border-slate-900 pl-3">
                <h3 className="text-lg font-bold text-slate-900">BAGIAN 8 — 24-HOUR FOOD RECALL</h3>
              </div>
              <p className="text-xs text-slate-500">
                Catatan riwayat asupan makan &amp; minum si kecil kemarin (dari bangun tidur sampai tidur kembali):
              </p>

              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Bangun Tidur (ASI / Susu):
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Sufor 150 ml (jam 06.30)"
                    value={formData.foodRecall.bangunSusu}
                    onChange={(e) => handleFoodRecallChange('bangunSusu', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Sarapan (Menu):
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Nasi uduk + telur ceplok"
                      value={formData.foodRecall.sarapanMenu}
                      onChange={(e) => handleFoodRecallChange('sarapanMenu', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Sarapan (Jumlah / Porsi):
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Hanya 3 suap"
                      value={formData.foodRecall.sarapanPorsi}
                      onChange={(e) => handleFoodRecallChange('sarapanPorsi', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Snack Pagi (Menu):
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Biskuit marie + susu"
                      value={formData.foodRecall.snackPagiMenu}
                      onChange={(e) => handleFoodRecallChange('snackPagiMenu', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Snack Pagi (Porsi):
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 2 keping"
                      value={formData.foodRecall.snackPagiPorsi}
                      onChange={(e) => handleFoodRecallChange('snackPagiPorsi', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Makan Siang (Menu):
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Nasi sop ayam"
                      value={formData.foodRecall.makanSiangMenu}
                      onChange={(e) => handleFoodRecallChange('makanSiangMenu', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Makan Siang (Porsi):
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Setengah mangkuk"
                      value={formData.foodRecall.makanSiangPorsi}
                      onChange={(e) => handleFoodRecallChange('makanSiangPorsi', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Snack Sore (Menu):
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Pisang / wafer"
                      value={formData.foodRecall.snackSoreMenu}
                      onChange={(e) => handleFoodRecallChange('snackSoreMenu', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Snack Sore (Porsi):
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 1 buah"
                      value={formData.foodRecall.snackSorePorsi}
                      onChange={(e) => handleFoodRecallChange('snackSorePorsi', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Makan Malam (Menu):
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Nasi kecap + sosis"
                      value={formData.foodRecall.makanMalamMenu}
                      onChange={(e) => handleFoodRecallChange('makanMalamMenu', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Makan Malam (Porsi):
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 4-5 suap"
                      value={formData.foodRecall.makanMalamPorsi}
                      onChange={(e) => handleFoodRecallChange('makanMalamPorsi', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Susu / ASI Sebelum Tidur:
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Sufor 180 ml (jam 21.00)"
                    value={formData.foodRecall.susuSebelumTidur}
                    onChange={(e) => handleFoodRecallChange('susuSebelumTidur', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ===================== STEP 9: RIWAYAT BERAT BADAN (SAMA SEPERTI /ASSESSMENT) ===================== */}
          {currentStep === 9 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 border-l-4 border-slate-900 pl-3">
                <h3 className="text-lg font-bold text-slate-900">BAGIAN 9 — RIWAYAT BERAT BADAN</h3>
              </div>
              <p className="text-xs text-slate-500">
                Penting untuk memantau kurva pertumbuhan dan mendeteksi kenaikan berat badan yang tidak adekuat:
              </p>

              {ageBounds && (
                <div className="p-3 rounded-xl bg-indigo-50/90 border border-indigo-200 text-xs text-indigo-950">
                  <strong>Panduan Pengisian Riwayat BB ({ageEvaluation.formatted}):</strong> Masukkan angka dalam satuan <strong>kilogram (kg)</strong> sesuai rentang fisiologis WHO ({ageBounds.minWeightKg} – {ageBounds.maxWeightKg} kg).
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    BB 3 Bulan Lalu (kg) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.8"
                    max="32"
                    required
                    placeholder="Contoh: 9.8"
                    value={formData.riwayatBB.bb3BulanLalu}
                    onKeyDown={(e) => {
                      if (['e', 'E', '+', '-'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      setStepError(null);
                      handleRiwayatBBChange('bb3BulanLalu', e.target.value);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    BB 2 Bulan Lalu (kg) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.8"
                    max="32"
                    required
                    placeholder="Contoh: 10.0"
                    value={formData.riwayatBB.bb2BulanLalu}
                    onKeyDown={(e) => {
                      if (['e', 'E', '+', '-'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      setStepError(null);
                      handleRiwayatBBChange('bb2BulanLalu', e.target.value);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    BB 1 Bulan Lalu (kg) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.8"
                    max="32"
                    required
                    placeholder="Contoh: 10.1"
                    value={formData.riwayatBB.bb1BulanLalu}
                    onKeyDown={(e) => {
                      if (['e', 'E', '+', '-'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      setStepError(null);
                      handleRiwayatBBChange('bb1BulanLalu', e.target.value);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    BB Sekarang (kg) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={ageBounds ? ageBounds.minWeightKg : 1.8}
                    max={ageBounds ? ageBounds.maxWeightKg : 32}
                    required
                    placeholder="Contoh: 10.2"
                    value={formData.riwayatBB.bbSekarang}
                    onKeyDown={(e) => {
                      if (['e', 'E', '+', '-'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStepError(null);
                      setFormData((prev) => ({
                        ...prev,
                        bbSekarang: val,
                        riwayatBB: {
                          ...prev.riwayatBB,
                          bbSekarang: val,
                        },
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-800 block mb-2">
                    Apakah BB stagnan?
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {['Ya', 'Tidak'].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleRiwayatBBChange('bbStagnan', val)}
                        className={`py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          formData.riwayatBB.bbStagnan === val
                            ? val === 'Ya'
                              ? 'bg-slate-900 text-[#ccff00] border-slate-900 shadow-2xs'
                              : 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-800 block mb-2">
                    Pernah mengalami penurunan BB?
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {['Ya', 'Tidak'].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleRiwayatBBChange('pernahTurunBB', val)}
                        className={`py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          formData.riwayatBB.pernahTurunBB === val
                            ? val === 'Ya'
                              ? 'bg-slate-900 text-[#ccff00] border-slate-900 shadow-2xs'
                              : 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-700 block mb-1.5">
                    Target Kenaikan BB dalam kg (Opsional):
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    min={formData.bbSekarang || 2.0}
                    max={ageBounds ? ageBounds.maxWeightKg + 2.5 : 35}
                    placeholder={ageBounds ? `Contoh: ${ageBounds.medianWeightKg}` : 'Contoh: 11.5'}
                    value={formData.riwayatBB.targetBB}
                    onKeyDown={(e) => {
                      if (['e', 'E', '+', '-'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      setStepError(null);
                      handleRiwayatBBChange('targetBB', e.target.value);
                    }}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ===================== STEP 10: KELUHAN UTAMA & 3 PERTANYAAN UNTUK DOKTER (SAMA SEPERTI /ASSESSMENT) ===================== */}
          {currentStep === 10 && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center gap-2 border-l-4 border-slate-900 pl-3">
                <h3 className="text-lg font-bold text-slate-900">
                  BAGIAN 10 — KELUHAN UTAMA &amp; 3 PERTANYAAN UNTUK DOKTER
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Penting untuk mengetahui apa yang paling membuat orang tua khawatir saat ini, serta pertanyaan prioritas untuk dijawab dokter:
              </p>

              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  &quot;Apa masalah makan anak yang paling ingin Bunda bantu?&quot; (Bisa pilih beberapa):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MAIN_COMPLAINT_OPTIONS.map((item) => {
                    const checked = formData.keluhanUtama.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleArrayItem('keluhanUtama', item)}
                        className={`p-3 rounded-xl border text-xs sm:text-sm font-bold text-left transition-all flex items-center justify-between ${
                          checked
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{item}</span>
                        <span className="text-xs font-bold">{checked ? '✓' : '+'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Keluhan Lainnya (jika ada):
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Sering muntah kalau lihat sayur"
                  value={keluhanLainnya}
                  onChange={(e) => setKeluhanLainnya(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Ceritakan dengan singkat kondisi makan anak saat ini: <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Ceritakan drama jam makan, sejak kapan masalah makan berlangsung, apa yang sudah dicoba orang tua, serta kekhawatiran terbesar Bunda..."
                  value={formData.ceritaKondisi}
                  onChange={(e) => setFormData({ ...formData, ceritaKondisi: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-slate-900 text-sm leading-relaxed"
                />
              </div>

              {/* KOLOM 3 PERTANYAAN UNTUK DOKTER */}
              <div className="mt-6 pt-5 border-t-2 border-dashed border-indigo-200 bg-linear-to-b from-indigo-50/80 to-white p-4 sm:p-6 rounded-2xl border border-indigo-200 shadow-xs space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-950 text-[#ccff00] flex items-center justify-center shrink-0 shadow-xs">
                    <Stethoscope className="w-5 h-5 text-[#ccff00]" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm sm:text-base font-black text-slate-950">
                        3 Pertanyaan untuk Dokter Spesialis Anak
                      </h4>
                      <span className="text-[10px] font-black uppercase bg-[#ccff00] text-slate-950 px-2 py-0.5 rounded-full border border-slate-900/10">
                        Penting Dijawab
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Tuliskan 3 pertanyaan terpenting yang ingin Bunda konsultasikan langsung ke dokter spesialis anak mengenai nutrisi, pola makan, atau tumbuh kembang anak:
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5 pt-1">
                  <div>
                    <label className="flex items-center justify-between text-xs font-bold text-slate-900 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-[#ccff00] text-[11px] font-black inline-flex items-center justify-center">
                          1
                        </span>
                        <span>Pertanyaan Pertama untuk Dokter</span>
                      </span>
                      <span className="text-[11px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md">
                        Prioritas Utama
                      </span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Apakah berat badan & gizi anak saya saat ini masih aman atau butuh susu tinggi kalori / suplemen khusus?"
                      value={formData.pertanyaanDokter1 || ''}
                      onChange={(e) => setFormData({ ...formData, pertanyaanDokter1: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="flex items-center justify-between text-xs font-bold text-slate-900 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-[#ccff00] text-[11px] font-black inline-flex items-center justify-center">
                          2
                        </span>
                        <span>Pertanyaan Kedua untuk Dokter</span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">Tekstur &amp; Oromotor</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Bagaimana langkah bertahap melatih oromotor dan naik tekstur tanpa membuat anak tersedak atau muntah?"
                      value={formData.pertanyaanDokter2 || ''}
                      onChange={(e) => setFormData({ ...formData, pertanyaanDokter2: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="flex items-center justify-between text-xs font-bold text-slate-900 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-[#ccff00] text-[11px] font-black inline-flex items-center justify-center">
                          3
                        </span>
                        <span>Pertanyaan Ketiga untuk Dokter</span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">Feeding Rules &amp; Perilaku</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Apakah kebiasaan makan dengan gadget harus langsung disetop drastis atau ada tahapan adaptasinya?"
                      value={formData.pertanyaanDokter3 || ''}
                      onChange={(e) => setFormData({ ...formData, pertanyaanDokter3: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================== STEP 11: TAMBAHAN FEEDING RULES (R1–R11) ===================== */}
          {currentStep === 11 && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center gap-2 border-l-4 border-slate-900 pl-3">
                <h3 className="text-lg font-bold text-slate-900">
                  BAGIAN 11 — TAMBAHAN: EVALUASI FEEDING RULES (ATURAN MAKAN R1–R11)
                </h3>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2">
                <div className="flex items-center gap-2 text-[#ccff00] font-black text-xs sm:text-sm">
                  <ClipboardList className="w-4 h-4 shrink-0" />
                  <span>Instrumen Evaluasi 11 Aturan Makan (Feeding Rules Bernard-Bonnin / IDAI)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Lengkapi pertanyaan aturan makan (Jadwal, Lingkungan, &amp; Prosedur Makan) di bawah ini agar sistem dapat mengevaluasi 11 Feeding Rules (R1–R11) dan menyusun 3 koreksi prioritas untuk anak Anda:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* R1: Frekuensi Makan Utama & Keteraturan Jam Makan */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-900 text-[#ccff00]">
                      R1 · JADWAL MAKAN UTAMA
                    </span>
                  </div>
                  <label className="block text-xs font-bold text-slate-800">
                    1. Apakah jam makan utama selalu di jam yang sama setiap hari?
                  </label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {['Ya, hampir selalu', 'Kadang', 'Tidak teratur'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setFormData({ ...formData, q6_3_jamMakanSama: opt })}
                        className={`py-2 px-3 rounded-lg text-xs font-bold border text-left transition-all cursor-pointer ${
                          formData.q6_3_jamMakanSama === opt
                            ? 'bg-slate-900 text-[#ccff00] border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* R2: Jeda Antar Waktu Makan & Camilan Luar Jadwal */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-900 text-[#ccff00]">
                      R2 · JEDA LAPAR 2–3 JAM
                    </span>
                  </div>
                  <label className="block text-xs font-bold text-slate-800">
                    2. Berapa jeda terpendek antara makan/susu dengan jam makan berikutnya?
                  </label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {['Kurang dari 2 jam', '2 sampai 3 jam', 'Lebih dari 3 jam'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setFormData({ ...formData, q6_4_jedaTerpendek: opt })}
                        className={`py-2 px-3 rounded-lg text-xs font-bold border text-left transition-all cursor-pointer ${
                          formData.q6_4_jedaTerpendek === opt
                            ? 'bg-slate-900 text-[#ccff00] border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  <label className="block text-xs font-bold text-slate-800 pt-1">
                    Bila anak minta camilan/biskuit/susu di luar jadwal makan:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['Tidak diberi', 'Kadang diberi', 'Sering diberi'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, q6_14_mintaCamilanLuarJadwal: opt })
                        }
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          formData.q6_14_mintaCamilanLuarJadwal === opt
                            ? 'bg-slate-900 text-[#ccff00] border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* R3: Durasi Makan Maksimal 30 Menit */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-900 text-[#ccff00] inline-block">
                    R3 · DURASI MAKSIMAL 30 MENIT
                  </span>
                  <label className="block text-xs font-bold text-slate-800">
                    3. Berapa lama rata-rata durasi satu kali sesi makan berlangsung?
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      'Kurang dari 15 menit',
                      '15 sampai 30 menit',
                      '30 sampai 45 menit',
                      'Lebih dari 45 menit',
                    ].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setFormData({ ...formData, q6_5_durasiMakan: opt })}
                        className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          formData.q6_5_durasiMakan === opt
                            ? 'bg-slate-900 text-[#ccff00] border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* R4: Tempat Tetap & Duduk di Kursi Makan */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-900 text-[#ccff00] inline-block">
                    R4 · POSISI &amp; TEMPAT MAKAN TETAP
                  </span>
                  <label className="block text-xs font-bold text-slate-800">
                    4. Di mana dan bagaimana posisi anak saat makan? (Bisa pilih beberapa)
                  </label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      'Kursi makan',
                      'Meja atau lantai sambil duduk',
                      'Digendong',
                      'Sambil berjalan atau berlari',
                    ].map((opt) => {
                      const checked = formData.q6_6_lokasiCaraMakan.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleArrayItem('q6_6_lokasiCaraMakan', opt)}
                          className={`py-2 px-3 rounded-lg text-xs font-bold border text-left flex items-center justify-between cursor-pointer ${
                            checked
                              ? 'bg-slate-900 text-[#ccff00] border-slate-900'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span>{opt}</span>
                          <span>{checked ? '✓' : '+'}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* R5: Tanpa Layar (TV/HP) & Tanpa Mainan */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-900 text-[#ccff00] inline-block">
                    R5 · LINGKUNGAN NETRAL TANPA DISTRAKSI
                  </span>
                  <label className="block text-xs font-bold text-slate-800">
                    5. Apa yang biasanya menemani anak saat sesi makan?
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {['Tidak ada', 'HP atau tablet', 'TV', 'Mainan', 'Jalan keliling'].map(
                      (opt) => {
                        const checked = formData.q6_7_pendampingMakan.includes(opt);
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => toggleArrayItem('q6_7_pendampingMakan', opt)}
                            className={`py-2 px-2.5 rounded-lg text-xs font-bold border text-left flex items-center justify-between cursor-pointer ${
                              checked
                                ? 'bg-slate-900 text-[#ccff00] border-slate-900'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span>{opt}</span>
                            <span>{checked ? '✓' : '+'}</span>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* R6: Tanpa Paksaan / Bujukan Saat Menolak Makan */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-900 text-[#ccff00] inline-block">
                    R6 · SIKAP NETRAL TANPA PAKSAAN
                  </span>
                  <label className="block text-xs font-bold text-slate-800">
                    6. Apa respons orang tua bila anak menolak makan / tutup mulut?
                  </label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      'Makanan diangkat dengan tenang',
                      'Membujuk terus',
                      'Memaksa atau membuka mulut anak',
                      'Menawarkan menu pengganti',
                      'Memberi susu sebagai pengganti',
                    ].map((opt) => {
                      const checked = formData.q6_8_responMenolakMakan.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleArrayItem('q6_8_responMenolakMakan', opt)}
                          className={`py-2 px-3 rounded-lg text-xs font-bold border text-left flex items-center justify-between cursor-pointer ${
                            checked
                              ? 'bg-slate-900 text-[#ccff00] border-slate-900'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span>{opt}</span>
                          <span>{checked ? '✓' : '+'}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* R7: Kemandirian Makan Sesuai Usia */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-900 text-[#ccff00] inline-block">
                    R7 · KEMANDIRIAN MAKAN ANAK
                  </span>
                  <label className="block text-xs font-bold text-slate-800">
                    7. Apakah anak diberi kesempatan makan sendiri (pegang sendok/finger food)?
                  </label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      'Makan sendiri dibantu',
                      'Makan sendiri penuh',
                      'Disuapi penuh',
                      'Tidak dibolehkan berantakan',
                    ].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setFormData({ ...formData, q6_9_kemandirianMakan: opt })}
                        className={`py-2 px-3 rounded-lg text-xs font-bold border text-left cursor-pointer ${
                          formData.q6_9_kemandirianMakan === opt
                            ? 'bg-slate-900 text-[#ccff00] border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* R8: Aturan Susu & Cairan */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-900 text-[#ccff00] inline-block">
                    R8 · ATURAN SUSU &amp; MINUMAN
                  </span>
                  <label className="block text-xs font-bold text-slate-800">
                    8. Bagaimana cara &amp; waktu anak minum susu?
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      'Cangkir atau gelas',
                      'Botol atau dot',
                      'Menyusu langsung',
                      'Tidur sambil minum susu',
                    ].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setFormData({ ...formData, q3c_caraMinumSusu: opt })}
                        className={`py-2 px-2 rounded-lg text-[11px] font-bold border text-left cursor-pointer ${
                          formData.q3c_caraMinumSusu === opt
                            ? 'bg-slate-900 text-[#ccff00] border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  <label className="block text-xs font-bold text-slate-800 pt-1">
                    Apakah anak minum susu &lt; 1 jam sebelum makan utama atau banyak minum saat makan?
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      {
                        label: 'Ya, dekat/saat jam makan',
                        waktu: ['Sebelum makan utama'],
                        minumBanyak: 'Sering',
                      },
                      {
                        label: 'Tidak (Hanya di luar jam makan)',
                        waktu: ['Menjelang tidur'],
                        minumBanyak: 'Tidak',
                      },
                    ].map((item) => {
                      const active = formData.q3d_waktuMinumSusu.includes('Sebelum makan utama')
                        ? item.minumBanyak === 'Sering'
                        : item.minumBanyak === 'Tidak';
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              q3d_waktuMinumSusu: item.waktu,
                              q3g_minumBanyakSaatMakan: item.minumBanyak,
                            })
                          }
                          className={`py-2 px-2.5 rounded-lg text-[11px] font-bold border text-left cursor-pointer ${
                            active
                              ? 'bg-slate-900 text-[#ccff00] border-slate-900'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* R9: Pengenalan Makanan Baru Berulang 10–15x */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-900 text-[#ccff00] inline-block">
                    R9 · PENGENALAN MAKANAN BARU (10–15X)
                  </span>
                  <label className="block text-xs font-bold text-slate-800">
                    9. Berapa kali makanan baru biasanya tetap ditawarkan sebelum orang tua menyerah?
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      '1 sampai 2 kali lalu berhenti',
                      '3 sampai 5 kali',
                      '6 sampai 10 kali',
                      'Lebih dari 10 kali',
                    ].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setFormData({ ...formData, q6_12_tawaranMakananBaru: opt })}
                        className={`py-2 px-2.5 rounded-lg text-[11px] font-bold border text-left cursor-pointer ${
                          formData.q6_12_tawaranMakananBaru === opt
                            ? 'bg-slate-900 text-[#ccff00] border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* R10: Konsistensi Pengasuh & Makan Bersama Keluarga */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-900 text-[#ccff00] inline-block">
                    R10 · KONSISTENSI PENGASUH &amp; KELUARGA
                  </span>
                  <label className="block text-xs font-bold text-slate-800">
                    10. Apakah aturan makan antar pengasuh di rumah kompak &amp; sering makan bersama keluarga?
                  </label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      {
                        label: 'Kompak & rutin makan bersama keluarga',
                        pengasuh: ['Ibu'],
                        konsisten: 'Sama' as const,
                        keluarga: 'Setiap hari',
                      },
                      {
                        label: 'Aturan pengasuh kadang beda (misal Nenek/ART masih suka kasih camilan)',
                        pengasuh: ['Ibu', 'Nenek atau kakek'],
                        konsisten: 'Berbeda' as const,
                        keluarga: 'Beberapa kali seminggu',
                      },
                      {
                        label: 'Anak selalu makan sendirian (Jarang makan bersama keluarga)',
                        pengasuh: ['Ibu'],
                        konsisten: 'Sama' as const,
                        keluarga: 'Jarang',
                      },
                    ].map((item) => {
                      const active =
                        formData.q6_10_konsistensiAturan === item.konsisten &&
                        formData.q6_11_makanBersamaKeluarga === item.keluarga;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              q6_10_pengasuhMenyuapi: item.pengasuh,
                              q6_10_konsistensiAturan: item.konsisten,
                              q6_11_makanBersamaKeluarga: item.keluarga,
                            })
                          }
                          className={`py-2 px-3 rounded-lg text-[11px] font-bold border text-left cursor-pointer ${
                            active
                              ? 'bg-slate-900 text-[#ccff00] border-slate-900'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* R11: Porsi Kecil & Bertahap Sesuai Usia */}
                <div className="sm:col-span-2 p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-900 text-[#ccff00] inline-block">
                    R11 · PORSI KECIL &amp; BERTAHAP SESUAI USIA
                  </span>
                  <label className="block text-xs font-bold text-slate-800">
                    11. Bagaimana ukuran porsi makanan yang disajikan di piring anak?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      {
                        val: 'Kecil dulu lalu tambah bila mau',
                        label: 'Porsi kecil bertahap (Tambah bila anak minta)',
                      },
                      {
                        val: 'Sesuai usia',
                        label: 'Sesuai takaran usia anak',
                      },
                      {
                        val: 'Lebih besar dari kemampuan anak',
                        label: 'Piring penuh / lebih besar supaya kenyang',
                      },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setFormData({ ...formData, q6_13_porsiDisajikan: opt.val })}
                        className={`py-2.5 px-3 rounded-lg text-xs font-bold border text-left cursor-pointer ${
                          formData.q6_13_porsiDisajikan === opt.val
                            ? 'bg-slate-900 text-[#ccff00] border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Skrining Tanda Bahaya Klinis (Red Flags) */}
              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2.5">
                <label className="block text-xs sm:text-sm font-black text-rose-950">
                  Skrining Tanda Bahaya Medis (Red Flags) — Centang bila ada yang dialami anak (Lewati bila tidak ada):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {RED_FLAG_GROUPS.map((rf) => {
                    const checked = formData.redFlagsSelected.includes(rf.id);
                    return (
                      <button
                        key={rf.id}
                        type="button"
                        onClick={() => toggleArrayItem('redFlagsSelected', rf.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          checked
                            ? 'bg-rose-900 text-white border-rose-900'
                            : 'bg-white text-slate-800 border-rose-200 hover:bg-rose-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs font-bold">
                          <span>{rf.kelompok}</span>
                          <span>{checked ? '✓' : '+'}</span>
                        </div>
                        <p
                          className={`text-[11px] mt-1 leading-relaxed ${
                            checked ? 'text-rose-100' : 'text-slate-500'
                          }`}
                        >
                          {rf.gejala}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="pt-5 border-t border-slate-200 flex items-center justify-between gap-2">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setStepError(null);
                  setCurrentStep((prev) => prev - 1);
                  scrollToTop();
                }}
                className="inline-flex items-center gap-1 px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-bold transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Sebelumnya</span>
              </button>
            ) : (
              <div />
            )}

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNextPaidStep}
                className="inline-flex items-center gap-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer"
              >
                <span>Lanjut ({currentStep + 1}/{totalSteps})</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 sm:px-8 py-2.5 sm:py-3.5 bg-[#ccff00] hover:bg-[#b8e600] text-slate-950 font-black text-xs sm:text-base rounded-xl transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Mengirimkan...</span>
                ) : (
                  <>
                    <FileCheck2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Kirim &amp; Selesaikan</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
