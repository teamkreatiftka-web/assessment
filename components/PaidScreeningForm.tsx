'use client';

import React, { useState } from 'react';
import {
  PaidScreeningData,
  Gender,
  FoodRepertoireRow,
  ScreeningRecord,
} from '@/types/screening';
import { generateRecordId, saveScreeningRecord } from '@/lib/storage';
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
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  Calendar,
  HelpCircle,
  FileCheck2,
  MessageCircle,
  ShieldCheck,
  ChevronDown,
  RotateCcw,
  Sparkles,
  Stethoscope,
  MessageSquare,
  AlertTriangle,
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

const BEHAVIOR_OPTIONS = [
  'Menutup mulut',
  'Memalingkan wajah',
  'Menangis',
  'Kabur dari meja makan',
  'Melempar makanan',
  'Memukul/menolak pengasuh',
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

const TEXTURE_OPTIONS = ['Puree', 'Lumat', 'Cincang', 'Lunak', 'Makanan keluarga'];

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
  'Lainnya',
];

function computeChildAge(dob: string): string {
  if (!dob) return '';
  try {
    const birth = new Date(dob);
    const now = new Date();
    if (isNaN(birth.getTime())) return '';

    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (now.getDate() < birth.getDate()) {
      months--;
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    const totalMonths = years * 12 + months;
    if (years <= 0) {
      return `${totalMonths} Bulan`;
    }
    return `${years} Tahun ${months} Bulan (${totalMonths} Bulan)`;
  } catch {
    return '';
  }
}

export function PaidScreeningForm() {
  const [formData, setFormData] = useState<PaidScreeningData>({
    // Bagian 1
    namaAyah: '',
    waAyah: '',
    namaIbu: '',
    waIbu: '',
    email: '',
    domisili: '',

    // Bagian 2
    namaLengkapAnak: '',
    dob: '',
    usiaTerkalkulasi: '',
    jenisKelamin: 'Laki-laki',
    bbSekarang: '',
    tbPB: '',
    tanggalUkur: '',
    bbLahir: '',
    usiaGestasi: '',
    riwayatNICU: 'Tidak',
    riwayatPenyakit: '',
    obatSuplemen: '',
    alergiIntoleransi: 'Tidak',

    // Bagian 3
    jenisSusu: 'Sufor',
    jumlahSusuPerHari: '400-500 ml (2-3 botol)',
    frekuensiMakanUtama: '3x sehari',
    frekuensiSnack: '2x sehari',
    durasiMakan: '30-45 menit',
    lokasiMakan: 'Meja makan / kursi makan',
    pemberiMakan: 'Ibu',
    jadwalMakanHarian: 'Terjadwal teratur',
    makanSambilGadget: 'Ya',
    makanSambilJalan: 'Tidak',
    seringDibujukDipaksa: 'Ya',

    // Bagian 4
    repertoire: INITIAL_REPERTOIRE,
    jumlahJenisDiterima: '5-10 jenis',

    // Bagian 5
    teksturDiterima: ['Lunak'],
    bisaMengunyah: 'Ya',
    seringGagging: 'Tidak',
    seringBatuk: 'Tidak',
    pernahTersedak: 'Tidak',
    melepehMakanan: 'Ya',
    lamaDiMulut: 'Ya',
    sulitNaikTekstur: 'Ya',
    hanyaMauTeksturTertentu: 'Ya',

    // Bagian 6
    perilakuMakan: ['Menutup mulut', 'Harus disuapi'],

    // Bagian 7
    alasanSensorik: ['Tekstur', 'Campuran makanan'],

    // Bagian 8
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

    // Bagian 9
    riwayatBB: {
      bb1BulanLalu: '',
      bb2BulanLalu: '',
      bb3BulanLalu: '',
      bbSekarang: '',
      bbStagnan: 'Ya',
      pernahTurunBB: 'Tidak',
      targetBB: '',
    },

    // Bagian 10: Keluhan & 3 Pertanyaan untuk Dokter
    keluhanUtama: ['GTM (Gerakan Tutup Mulut)', 'Porsi makan sedikit'],
    keluhanLainnya: '',
    ceritaKondisi: '',
    pertanyaanDokter1: '',
    pertanyaanDokter2: '',
    pertanyaanDokter3: '',
  });

  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 10;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRecordId, setSubmittedRecordId] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  // Auto-hitung usia anak & batas DOB (0-5 Tahun)
  const dobBounds = getDobBounds();
  const ageEvaluation = calculateAgeFromDob(formData.dob);
  const calculatedAge = ageEvaluation.isValidAgeRange ? ageEvaluation.formatted : '';
  const ageBounds = getAgeSpecificAnthropometryBounds(formData.dob, formData.jenisKelamin);
  const liveAnthError =
    formData.bbSekarang && formData.tbPB
      ? validateChildWeightAndHeight(
          formData.dob,
          formData.bbSekarang,
          formData.tbPB,
          formData.jenisKelamin
        )
      : null;

  const handleDobChange = (dobVal: string) => {
    setStepError(null);
    setFormData((prev) => ({
      ...prev,
      dob: dobVal,
    }));
  };

  const handleNextPaidStep = () => {
    if (currentStep === 1) {
      const motherErr = validatePersonName(formData.namaIbu, 'Nama Ibu / Bunda');
      if (motherErr) {
        setStepError(motherErr);
        window.scrollTo({ top: 220, behavior: 'smooth' });
        return;
      }
      const waErr = validateWhatsAppNumber(formData.waIbu);
      if (waErr) {
        setStepError(waErr);
        window.scrollTo({ top: 220, behavior: 'smooth' });
        return;
      }
    }

    if (currentStep === 2) {
      const childErr = validatePersonName(formData.namaLengkapAnak, 'Nama Lengkap Anak');
      if (childErr) {
        setStepError(childErr);
        window.scrollTo({ top: 220, behavior: 'smooth' });
        return;
      }
      if (!formData.dob || !ageEvaluation.isValidAgeRange) {
        setStepError(
          ageEvaluation.errorMessage ||
            'Tanggal lahir anak wajib diisi dan harus berusia 0–5 tahun (maksimal 60 bulan).'
        );
        window.scrollTo({ top: 220, behavior: 'smooth' });
        return;
      }
      const anthErr = validateChildWeightAndHeight(
        formData.dob,
        formData.bbSekarang,
        formData.tbPB,
        formData.jenisKelamin
      );
      if (anthErr) {
        setStepError(anthErr);
        window.scrollTo({ top: 220, behavior: 'smooth' });
        return;
      }
      const birthErr = validateBirthWeightAndGestation(
        formData.bbLahir,
        formData.usiaGestasi,
        formData.bbSekarang,
        ageEvaluation.totalMonths
      );
      if (birthErr) {
        setStepError(birthErr);
        window.scrollTo({ top: 220, behavior: 'smooth' });
        return;
      }
    }

    if (currentStep === 9) {
      const historyErr = validateWeightHistory(
        formData.dob,
        formData.jenisKelamin,
        formData.bbSekarang,
        formData.riwayatBB
      );
      if (historyErr) {
        setStepError(historyErr);
        window.scrollTo({ top: 220, behavior: 'smooth' });
        return;
      }
    }

    setStepError(null);
    setCurrentStep((prev) => Math.min(totalSteps, prev + 1));
    window.scrollTo({ top: 220, behavior: 'smooth' });
  };

  const handleRepertoireChange = (
    index: number,
    field: 'makananMau' | 'makananTidakMau',
    value: string
  ) => {
    setFormData((prev) => {
      const copy = [...prev.repertoire];
      copy[index] = { ...copy[index], [field]: value };
      return { ...prev, repertoire: copy };
    });
  };

  const toggleArrayItem = (
    listField: 'teksturDiterima' | 'perilakuMakan' | 'alasanSensorik' | 'keluhanUtama',
    item: string
  ) => {
    setFormData((prev) => {
      const current = prev[listField];
      const exists = current.includes(item);
      const next = exists ? current.filter((x) => x !== item) : [...current, item];
      return { ...prev, [listField]: next };
    });
  };

  const handleFoodRecallChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      foodRecall: {
        ...prev.foodRecall,
        [field]: value,
      },
    }));
  };

  const handleRiwayatBBChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      riwayatBB: {
        ...prev.riwayatBB,
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const motherErr = validatePersonName(formData.namaIbu, 'Nama Ibu / Bunda');
    const waErr = validateWhatsAppNumber(formData.waIbu);
    if (motherErr || waErr) {
      setCurrentStep(1);
      setStepError(motherErr || waErr);
      window.scrollTo({ top: 220, behavior: 'smooth' });
      return;
    }

    const childErr = validatePersonName(formData.namaLengkapAnak, 'Nama Lengkap Anak');
    if (childErr) {
      setCurrentStep(2);
      setStepError(childErr);
      window.scrollTo({ top: 220, behavior: 'smooth' });
      return;
    }

    if (!formData.dob || !ageEvaluation.isValidAgeRange) {
      setCurrentStep(2);
      setStepError(
        ageEvaluation.errorMessage ||
          'Tanggal lahir anak wajib diisi dan harus berusia 0–5 tahun (maksimal 60 bulan).'
      );
      window.scrollTo({ top: 220, behavior: 'smooth' });
      return;
    }

    const anthErr = validateChildWeightAndHeight(
      formData.dob,
      formData.bbSekarang,
      formData.tbPB,
      formData.jenisKelamin
    );
    if (anthErr) {
      setCurrentStep(2);
      setStepError(anthErr);
      window.scrollTo({ top: 220, behavior: 'smooth' });
      return;
    }

    const birthErr = validateBirthWeightAndGestation(
      formData.bbLahir,
      formData.usiaGestasi,
      formData.bbSekarang,
      ageEvaluation.totalMonths
    );
    if (birthErr) {
      setCurrentStep(2);
      setStepError(birthErr);
      window.scrollTo({ top: 220, behavior: 'smooth' });
      return;
    }

    const historyErr = validateWeightHistory(
      formData.dob,
      formData.jenisKelamin,
      formData.bbSekarang,
      formData.riwayatBB
    );
    if (historyErr) {
      setCurrentStep(9);
      setStepError(historyErr);
      window.scrollTo({ top: 220, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    try {
      const recordId = generateRecordId('paid');
      const record: ScreeningRecord = {
        id: recordId,
        created_at: new Date().toISOString(),
        type: 'paid',
        status: 'Dalam Review',
        risk_level: 'BUTUH PERHATIAN KHUSUS',
        child_name: formData.namaLengkapAnak,
        mother_name: formData.namaIbu,
        father_name: formData.namaAyah || undefined,
        phone: formData.waIbu,
        secondary_phone: formData.waAyah || undefined,
        age_text: calculatedAge || formData.usiaTerkalkulasi || '-',
        gender: formData.jenisKelamin,
        last_weight: formData.bbSekarang || '-',
        last_height: formData.tbPB || '-',
        measurement_date: formData.tanggalUkur || undefined,
        summary: formData.ceritaKondisi
          ? formData.ceritaKondisi.slice(0, 160) + '...'
          : 'Asesmen Rekam Medis Lengkap (10 Bagian) diterima untuk evaluasi komprehensif tim ahli.',
        problem_areas: formData.keluhanUtama,
        clinical_notes: '',
        paid_data: {
          ...formData,
          usiaTerkalkulasi: calculatedAge,
        },
      };

      await saveScreeningRecord(record);
      setSubmittedRecordId(recordId);
      window.scrollTo({ top: 350, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      alert('Terjadi kendala saat menyimpan. Silakan coba kembali.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* JIKA SUDAH DISUBMIT: TAMPILKAN OUTPUT SESUAI PERMINTAAN */}
      {submittedRecordId ? (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-10 border border-slate-200 shadow-xl text-center animate-fade-in max-w-xl mx-auto">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <CheckCircle2 className="w-7 h-7 sm:w-10 sm:h-10" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Assessment berhasil dikirim! ✅
          </h2>

          <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2.5">
            <p>
              Data makan anak Bunda sudah kami terima.
            </p>
            <p>
              Selanjutnya data akan direview oleh tim untuk melihat pola makan, variasi makanan, tekstur, perilaku makan, serta data asupan anak.
            </p>
            <p className="font-bold text-slate-900 pt-1">
              ⏳ Hasil screening akan dikirim setelah proses review selesai +-3-5 hari
            </p>
            <p className="text-rose-600 font-semibold">
              Mohon menunggu ya, Bunda. ❤️
            </p>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-center">
            <a
              href={`https://wa.me/6285129992305?text=Halo%20Admin%20Tumbuh%20Kembang%20Anak,%20saya%20sudah%20mengirim%20Assessment%20Lengkap%20untuk%20anak%20saya%20${encodeURIComponent(
                formData.namaLengkapAnak
              )}.%20Mohon%20info%20tahap%20selanjutnya.`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Konfirmasi ke Admin WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={() => {
                setSubmittedRecordId(null);
                setCurrentStep(1);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold text-xs sm:text-sm transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Kirim Asesmen Baru</span>
            </button>
          </div>
        </div>
      ) : (
        /* FORM ASESMEN BERBAYAR 10 BAGIAN */
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-slate-200 shadow-xl space-y-6 sm:space-y-8"
        >
          {/* Header */}
          <div className="border-b border-slate-100 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 text-[#ccff00] text-xs font-black uppercase tracking-wider">
                Assessment Mendalam &amp; Rekam Medis Pasien
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Langkah {currentStep} dari {totalSteps}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              FORM SCREENING LENGKAP MASALAH MAKAN
            </h2>
            <p className="mt-1 text-sm sm:text-base text-slate-600">
              Instrumen komprehensif untuk pemetaan pola makan, profil sensorik, tekstur oral-motor, dan food repertoire.
            </p>

            {/* Stepper Progress Bar */}
            <div className="mt-5 w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-linear-to-r from-slate-900 to-[#ccff00] h-full transition-all duration-300 rounded-full"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>

            {/* Step Quick Pills */}
            <div className="mt-3.5 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
              {[
                '1. Orang Tua',
                '2. Data Anak',
                '3. Riwayat Makan',
                '4. Repertoire',
                '5. Oral Motor',
                '6. Perilaku',
                '7. Sensorik',
                '8. Food Recall',
                '9. Riwayat BB',
                '10. Keluhan & Tanya Dokter',
              ].map((name, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={idx + 1 > currentStep}
                  onClick={() => {
                    if (idx + 1 < currentStep) {
                      setStepError(null);
                      setCurrentStep(idx + 1);
                    }
                  }}
                  className={`text-[10px] sm:text-[11px] font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                    currentStep === idx + 1
                      ? 'bg-slate-900 text-white shadow-xs'
                      : idx + 1 < currentStep
                      ? 'bg-emerald-100 text-emerald-800 cursor-pointer'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {stepError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs sm:text-sm font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{stepError}</span>
            </div>
          )}

          {/* ===================== STEP 1: DATA ORANG TUA ===================== */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 border-l-4 border-slate-900 pl-3">
                <h3 className="text-lg font-bold text-slate-900">BAGIAN 1 — DATA ORANG TUA</h3>
              </div>
              <p className="text-xs text-slate-500">
                Informasi kontak orang tua untuk pengiriman hasil review dan tindak lanjut rekam medis.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nama Ayah
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Dimas Pratama"
                    value={formData.namaAyah}
                    onChange={(e) => setFormData({ ...formData, namaAyah: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-slate-900 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    No. WhatsApp Ayah
                  </label>
                  <input
                    type="tel"
                    placeholder="Contoh: 081398765432"
                    value={formData.waAyah}
                    onChange={(e) => setFormData({ ...formData, waAyah: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-slate-900 text-sm"
                  />
                </div>

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

          {/* ===================== STEP 2: DATA ANAK ===================== */}
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
                      setStepError(null);
                      setFormData({ ...formData, tbPB: e.target.value });
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
                    onChange={(e) => setFormData({ ...formData, tanggalUkur: e.target.value })}
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
                      value={formData.usiaGestasi}
                      onKeyDown={(e) => {
                        if (['e', 'E', '+', '-'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      onChange={(e) => {
                        setStepError(null);
                        setFormData({ ...formData, usiaGestasi: e.target.value });
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
                    {['Ya', 'Tidak'].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFormData({ ...formData, riwayatNICU: val })}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          formData.riwayatNICU === val
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
                    {['Ya', 'Tidak'].map((val) => {
                      const isSelected =
                        val === 'Tidak'
                          ? formData.alergiIntoleransi === 'Tidak'
                          : formData.alergiIntoleransi !== 'Tidak';
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              alergiIntoleransi: val === 'Tidak' ? 'Tidak' : 'Ya',
                            })
                          }
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-slate-900 text-[#ccff00] border-slate-900 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                  {formData.alergiIntoleransi !== 'Tidak' && (
                    <input
                      type="text"
                      placeholder="Sebutkan alergi (misal: Susu sapi / Telur)"
                      value={formData.alergiIntoleransi === 'Ya' ? '' : formData.alergiIntoleransi}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          alergiIntoleransi: e.target.value || 'Ya',
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
                    value={formData.obatSuplemen}
                    onChange={(e) => setFormData({ ...formData, obatSuplemen: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-slate-900 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ===================== STEP 3: RIWAYAT MAKAN ===================== */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 border-l-4 border-slate-900 pl-3">
                <h3 className="text-lg font-bold text-slate-900">BAGIAN 3 — RIWAYAT MAKAN</h3>
              </div>
              <p className="text-xs text-slate-500">
                Klik pilihan yang sesuai dengan pola konsumsi susu harian dan aturan makan (feeding rules) di rumah:
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
                        onClick={() => setFormData({ ...formData, jenisSusu: opt })}
                        className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          formData.jenisSusu === opt
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
                        onClick={() => setFormData({ ...formData, jumlahSusuPerHari: opt })}
                        className={`py-2 px-2.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          formData.jumlahSusuPerHari === opt
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
                        onClick={() => setFormData({ ...formData, frekuensiMakanUtama: opt })}
                        className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          formData.frekuensiMakanUtama === opt
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
                        onClick={() => setFormData({ ...formData, frekuensiSnack: opt })}
                        className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          formData.frekuensiSnack === opt
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
                        onClick={() => setFormData({ ...formData, durasiMakan: opt })}
                        className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          formData.durasiMakan === opt
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
                        onClick={() => setFormData({ ...formData, lokasiMakan: opt })}
                        className={`py-2 px-2.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          formData.lokasiMakan === opt
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
                        onClick={() => setFormData({ ...formData, jadwalMakanHarian: opt })}
                        className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          formData.jadwalMakanHarian === opt
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
                      {['Ya', 'Tidak'].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setFormData({ ...formData, makanSambilGadget: val })}
                          className={`py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            formData.makanSambilGadget === val
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
                      {['Ya', 'Tidak'].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setFormData({ ...formData, makanSambilJalan: val })}
                          className={`py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            formData.makanSambilJalan === val
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
                      {['Ya', 'Tidak'].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setFormData({ ...formData, seringDibujukDipaksa: val })}
                          className={`py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            formData.seringDibujukDipaksa === val
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

          {/* ===================== STEP 4: FOOD REPERTOIRE ===================== */}
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

          {/* ===================== STEP 5: TEKSTUR & ORAL MOTOR ===================== */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 border-l-4 border-slate-900 pl-3">
                <h3 className="text-lg font-bold text-slate-900">BAGIAN 5 — TEKSTUR & ORAL MOTOR</h3>
              </div>
              <p className="text-xs text-slate-500">
                Evaluasi kemampuan mengunyah, refleks menelan, dan adaptasi tekstur:
              </p>

              {/* Tekstur yang bisa diterima */}
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
                  const currentVal = (formData as any)[item.field];
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

          {/* ===================== STEP 6: PERILAKU SAAT MAKAN ===================== */}
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

          {/* ===================== STEP 7: SENSORIK ===================== */}
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

          {/* ===================== STEP 8: 24-HOUR FOOD RECALL ===================== */}
          {currentStep === 8 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 border-l-4 border-slate-900 pl-3">
                <h3 className="text-lg font-bold text-slate-900">BAGIAN 8 — 24-HOUR FOOD RECALL</h3>
              </div>
              <p className="text-xs text-slate-500">
                Catatan riwayat asupan makan & minum si kecil kemarin (dari bangun tidur sampai tidur kembali):
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

          {/* ===================== STEP 9: RIWAYAT BERAT BADAN ===================== */}
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

          {/* ===================== STEP 10: KELUHAN UTAMA & 3 PERTANYAAN UNTUK DOKTER ===================== */}
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
                  &quot;Apa masalah makan anak yang paling ingin Bunda/Ayah bantu?&quot; (Bisa pilih beberapa):
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
                  value={formData.keluhanLainnya}
                  onChange={(e) => setFormData({ ...formData, keluhanLainnya: e.target.value })}
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
                      Tuliskan 3 pertanyaan terpenting yang ingin Ayah/Bunda konsultasikan langsung ke dokter spesialis anak mengenai nutrisi, pola makan, atau tumbuh kembang anak:
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5 pt-1">
                  {/* Pertanyaan 1 */}
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

                  {/* Pertanyaan 2 */}
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

                  {/* Pertanyaan 3 */}
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

          {/* Stepper Navigation Buttons */}
          <div className="pt-5 border-t border-slate-200 flex items-center justify-between gap-2">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="inline-flex items-center gap-1 px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-bold transition-all"
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
                className="inline-flex items-center gap-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs"
              >
                <span>Lanjut ({currentStep + 1}/{totalSteps})</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 sm:px-8 py-2.5 sm:py-3.5 bg-[#ccff00] hover:bg-[#b8e600] text-slate-950 font-black text-xs sm:text-base rounded-xl transition-all shadow-md active:scale-98 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Mengirimkan...</span>
                ) : (
                  <>
                    <FileCheck2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Kirim & Selesaikan</span>
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
