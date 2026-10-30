'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  FreeScreeningData,
  Gender,
  YesNoSometimes,
  ScreeningRecord,
} from '@/types/screening';
import {
  evaluateFreeScreening,
  generateRecordId,
  saveScreeningRecord,
  ClinicalScreeningResult,
} from '@/lib/storage';
import {
  calculateAgeFromDob,
  getDobBounds,
  getAgeSpecificAnthropometryBounds,
  validatePersonName,
  validateWhatsAppNumber,
  validateChildWeightAndHeight,
} from '@/lib/anthropometry';
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  MessageCircle,
  Video,
  RotateCcw,
  BookOpen,
  Calendar,
  Scale,
  Sparkles,
  AlertTriangle,
  HeartPulse,
  X,
  Lock,
  Utensils,
  Pill,
  Stethoscope,
  ShieldCheck,
} from 'lucide-react';

export function FreeScreeningForm() {
  // Form State
  const [formData, setFormData] = useState<FreeScreeningData>({
    namaAnak: '',
    namaIbu: '',
    noHp: '',
    tanggalLahir: '',
    usiaAnak: '',
    jenisKelamin: 'Laki-laki',
    bbTerakhir: '',
    tbTerakhir: '',
    tanggalPengukuran: '',
    usiaPengukuran: '',

    jadwalMakanUtama: '3x Teratur (Pagi, Siang, Malam)',
    jadwalSnack: '2x Terjadwal (10.00 & 16.00)',
    susuHarian: 'Susu 2-3 gelas (400-500 ml/hari)',
    makanSambilGadget: 'Tidak',
    seringDipaksaBujuk: 'Tidak',
    digantiSusuSnack: 'Tidak',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [screeningResult, setScreeningResult] = useState<ClinicalScreeningResult | null>(null);
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);
  const [waFullScreeningUrl, setWaFullScreeningUrl] = useState<string | null>(null);
  const [zoomedTesti, setZoomedTesti] = useState<string | null>(null);

  // 7 Gambar Bukti Testimoni Konsultasi Pendampingan Dokter
  const TESTIMONIAL_IMAGES = useMemo(
    () => [
      {
        id: 1,
        url: 'https://files.catbox.moe/9pi9yk.jpg',
        title: 'Testimoni Pendampingan Masalah Makan #1',
      },
      {
        id: 2,
        url: 'https://files.catbox.moe/2bwkd6.jpg',
        title: 'Testimoni Pendampingan Masalah Makan #2',
      },
      {
        id: 3,
        url: 'https://files.catbox.moe/knob5q.jpg',
        title: 'Testimoni Pendampingan Masalah Makan #3',
      },
      {
        id: 4,
        url: 'https://files.catbox.moe/cp3pjp.jpg',
        title: 'Testimoni Pendampingan Masalah Makan #4',
      },
      {
        id: 5,
        url: 'https://files.catbox.moe/l698g6.jpg',
        title: 'Testimoni Pendampingan Masalah Makan #5',
      },
      {
        id: 6,
        url: 'https://files.catbox.moe/vwo8u5.jpg',
        title: 'Testimoni Pendampingan Masalah Makan #6',
      },
      {
        id: 7,
        url: 'https://files.catbox.moe/cgbpvn.jpg',
        title: 'Testimoni Pendampingan Masalah Makan #7',
      },
    ],
    []
  );

  // Wizard steps state
  const TOTAL_STEPS = 5;
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [stepError, setStepError] = useState<string | null>(null);

  // Auto kalkulasi usia & batas Tanggal Lahir (0–5 Tahun)
  const dobBounds = useMemo(() => getDobBounds(), []);
  const calculatedAge = useMemo(() => {
    return calculateAgeFromDob(formData.tanggalLahir || '');
  }, [formData.tanggalLahir]);

  const ageBounds = useMemo(() => {
    return getAgeSpecificAnthropometryBounds(formData.tanggalLahir, formData.jenisKelamin);
  }, [formData.tanggalLahir, formData.jenisKelamin]);

  const liveAnthError = useMemo(() => {
    if (!formData.bbTerakhir && !formData.tbTerakhir) return null;
    if (!formData.bbTerakhir || !formData.tbTerakhir) return null;
    return validateChildWeightAndHeight(
      formData.tanggalLahir,
      formData.bbTerakhir,
      formData.tbTerakhir,
      formData.jenisKelamin
    );
  }, [formData.tanggalLahir, formData.bbTerakhir, formData.tbTerakhir, formData.jenisKelamin]);

  const handleChange = (field: keyof FreeScreeningData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (stepError) setStepError(null);
  };

  const scrollToFormTop = () => {
    const el = document.getElementById('free-screening-form-anchor');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 220, behavior: 'smooth' });
    }
  };

  // Navigasi langkah demi langkah dengan validasi ketat (1 -> 2 -> 3 -> 4 -> 5)
  const handleNextStep = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();

    if (currentStep === 1) {
      const childNameErr = validatePersonName(formData.namaAnak, 'Nama Anak');
      if (childNameErr) {
        setStepError(childNameErr);
        scrollToFormTop();
        return;
      }
      const motherNameErr = validatePersonName(formData.namaIbu, 'Nama Ibu / Bunda');
      if (motherNameErr) {
        setStepError(motherNameErr);
        scrollToFormTop();
        return;
      }
      setStepError(null);
      setCurrentStep(2);
      scrollToFormTop();
      return;
    }

    if (currentStep === 2) {
      const phoneErr = validateWhatsAppNumber(formData.noHp);
      if (phoneErr) {
        setStepError(phoneErr);
        scrollToFormTop();
        return;
      }
      setStepError(null);
      setCurrentStep(3);
      scrollToFormTop();
      return;
    }

    if (currentStep === 3) {
      if (!formData.tanggalLahir) {
        setStepError('Mohon tentukan Tanggal Lahir Anak (DOB) agar sistem dapat menghitung usia & kurva tumbuh kembang.');
        scrollToFormTop();
        return;
      }
      if (!calculatedAge.isValidAgeRange) {
        setStepError(
          calculatedAge.errorMessage ||
            'Tanggal lahir tidak sesuai. Skrining ini khusus untuk anak usia 0–5 tahun (maksimal 60 bulan).'
        );
        scrollToFormTop();
        return;
      }
      setStepError(null);
      setCurrentStep(4);
      scrollToFormTop();
      return;
    }

    if (currentStep === 4) {
      const anthError = validateChildWeightAndHeight(
        formData.tanggalLahir,
        formData.bbTerakhir,
        formData.tbTerakhir,
        formData.jenisKelamin
      );
      if (anthError) {
        setStepError(anthError);
        scrollToFormTop();
        return;
      }
      setStepError(null);
      setCurrentStep(5);
      scrollToFormTop();
      return;
    }
  };

  const handlePrevStep = () => {
    setStepError(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
    scrollToFormTop();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const childNameErr = validatePersonName(formData.namaAnak, 'Nama Anak');
    const motherNameErr = validatePersonName(formData.namaIbu, 'Nama Ibu / Bunda');
    if (childNameErr || motherNameErr) {
      setCurrentStep(1);
      setStepError(childNameErr || motherNameErr);
      scrollToFormTop();
      return;
    }

    const phoneErr = validateWhatsAppNumber(formData.noHp);
    if (phoneErr) {
      setCurrentStep(2);
      setStepError(phoneErr);
      scrollToFormTop();
      return;
    }

    if (!formData.tanggalLahir || !calculatedAge.isValidAgeRange) {
      setCurrentStep(3);
      setStepError(
        calculatedAge.errorMessage ||
          'Mohon pilih Tanggal Lahir anak yang benar (khusus usia 0–5 tahun / maksimal 60 bulan).'
      );
      scrollToFormTop();
      return;
    }

    const anthError = validateChildWeightAndHeight(
      formData.tanggalLahir,
      formData.bbTerakhir,
      formData.tbTerakhir,
      formData.jenisKelamin
    );
    if (anthError) {
      setCurrentStep(4);
      setStepError(anthError);
      scrollToFormTop();
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Evaluasi Klinis Sesuai Acuan IDAI & WHO Antropometri
      const dataWithAge = {
        ...formData,
        usiaAnak: calculatedAge.formatted,
      };

      const evaluation = evaluateFreeScreening(dataWithAge);
      const recordId = generateRecordId('free');

      const record: ScreeningRecord = {
        id: recordId,
        created_at: new Date().toISOString(),
        type: 'free',
        status: 'Baru',
        risk_level: evaluation.risk_level,
        child_name: formData.namaAnak,
        mother_name: formData.namaIbu,
        phone: formData.noHp,
        age_text: calculatedAge.formatted || '-',
        gender: formData.jenisKelamin,
        last_weight: formData.bbTerakhir || '-',
        last_height: formData.tbTerakhir || '-',
        measurement_date: formData.tanggalPengukuran || formData.usiaPengukuran || undefined,
        summary: evaluation.summary,
        problem_areas: evaluation.problem_areas,
        clinical_notes: `Kategori: ${evaluation.clinical_category}. Status BB: ${evaluation.anthropometry?.weightCategory || '-'}. Aturan makan: ${evaluation.feeding_rule_violations.join(', ') || 'Normal'}`,
        free_data: dataWithAge,
      };

      // 2. Simpan ke Database (Supabase + Local Cache)
      await saveScreeningRecord(record);

      // 3. Siapkan URL WhatsApp dengan KEYWORD persis: Ambil Screening Lengkap Hanya 139 Ribu
      const keywordUpgrade139 = 'Ambil Screening Lengkap Hanya 139 Ribu';
      const targetUrl = `https://wa.me/6285129992305?text=${encodeURIComponent(keywordUpgrade139)}`;

      setSavedRecordId(recordId);
      setScreeningResult(evaluation);
      setWaFullScreeningUrl(targetUrl);
      scrollToFormTop();
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat memproses screening. Silakan coba kembali.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setScreeningResult(null);
    setSavedRecordId(null);
    setWaFullScreeningUrl(null);
    setCurrentStep(1);
    setStepError(null);
    window.scrollTo({ top: 150, behavior: 'smooth' });
  };

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
      {/* ================= HASIL SCREENING SINGKAT DI WEBSITE (ATAS TERBUKA, BAWAH BLUR + CTA 139 RIBU) ================= */}
      {screeningResult ? (
        <div id="free-screening-form-anchor" className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-fade-in">
          {/* Header Hasil Screening */}
          <div className="bg-slate-950 text-white p-4 sm:p-6 border-b border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ccff00] text-slate-950 text-[10px] sm:text-xs font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                Hasil Screening Singkat Masalah Makan Anak
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                No. Rekam: {savedRecordId}
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
              Laporan Evaluasi Awal Pola Makan &amp; Pertumbuhan
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-300 mt-1">
              Berdasarkan Acuan Ikatan Dokter Anak Indonesia (IDAI) &amp; Standar Pertumbuhan WHO
            </p>
          </div>

          <div className="p-4 sm:p-7 space-y-5 sm:space-y-6">
            {/* Ringkasan Identitas Pasien */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 sm:p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Nama Anak</span>
                <strong className="text-slate-900 text-xs sm:text-sm">{formData.namaAnak}</strong>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Usia &amp; Gender</span>
                <strong className="text-slate-900 text-xs sm:text-sm">
                  {calculatedAge.formatted || '-'} ({formData.jenisKelamin})
                </strong>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">BB / TB Terakhir</span>
                <strong className="text-slate-900 text-xs sm:text-sm">
                  {formData.bbTerakhir || '-'} / {formData.tbTerakhir || '-'}
                </strong>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Nama Bunda</span>
                <strong className="text-slate-900 text-xs sm:text-sm">{formData.namaIbu}</strong>
              </div>
            </div>

            {/* 1. STATUS SKRINING & KATEGORI KLINIS (TERBUKA) */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border-2 ${
                screeningResult.risk_level === 'BUTUH PERHATIAN KHUSUS'
                  ? 'bg-rose-50/90 border-rose-300 text-rose-950'
                  : screeningResult.risk_level === 'PERLU DIPERHATIKAN'
                  ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                  : 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider opacity-80">
                  1. Status Hasil Skrining Awal
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-black uppercase ${
                    screeningResult.risk_level === 'BUTUH PERHATIAN KHUSUS'
                      ? 'bg-rose-600 text-white'
                      : screeningResult.risk_level === 'PERLU DIPERHATIKAN'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  <HeartPulse className="w-3.5 h-3.5" />
                  {screeningResult.risk_level}
                </span>
              </div>

              <h3 className="text-sm sm:text-base font-black mb-1.5">
                {screeningResult.clinical_category}
              </h3>
              <p className="text-xs sm:text-sm leading-relaxed opacity-90">
                {screeningResult.summary}
              </p>
            </div>

            {/* 2. RINGKASAN PERTUMBUHAN AWAL & POLA MAKAN (TERBUKA) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-black text-xs sm:text-sm">
                  <Scale className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>2. Indikator Antropometri (WHO &amp; Permenkes RI)</span>
                </div>
                {screeningResult.anthropometry ? (
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <div className="flex justify-between gap-2 py-1 border-b border-slate-200/70">
                      <span className="text-slate-500">Indeks BB/U:</span>
                      <strong className="text-slate-900 text-right">{screeningResult.anthropometry.weightCategory}</strong>
                    </div>
                    <div className="flex justify-between gap-2 py-1 border-b border-slate-200/70">
                      <span className="text-slate-500">Indeks PB/U atau TB/U:</span>
                      <strong className="text-slate-900 text-right">{screeningResult.anthropometry.heightCategory}</strong>
                    </div>
                    <div className="flex justify-between gap-2 py-1 border-b border-slate-200/70">
                      <span className="text-slate-500">Status Gizi (BB/TB):</span>
                      <strong className="text-slate-900 text-right">{screeningResult.anthropometry.wfhCategory}</strong>
                    </div>
                    <p className="text-[11px] text-slate-500 pt-0.5">
                      *Target Berat Badan Ideal (~{screeningResult.anthropometry.idealBodyWeightKg} kg) &amp; kebutuhan energi (~{screeningResult.anthropometry.estimatedDailyCaloriesKcal} kkal/hari) dijabarkan pada analisis lengkap di bawah.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-600">
                    BB: {formData.bbTerakhir || '-'} | TB: {formData.tbTerakhir || '-'}
                  </p>
                )}
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-black text-xs sm:text-sm">
                  <Utensils className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>3. Temuan Awal Pola Makan</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {screeningResult.problem_areas.slice(0, 2).map((item, idx) => (
                    <li key={idx} className="leading-relaxed flex items-start gap-1.5">
                      <span className="text-slate-400 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ================= BAGIAN BAWAH YANG DI-BLUR + OVERLAY SCREENING LENGKAP 139 RIBU ================= */}
            <div className="relative rounded-2xl sm:rounded-3xl border-2 border-slate-900 bg-slate-50/70 overflow-hidden pt-4">
              {/* Konten Laporan Detail yang Di-Blur (Tidak Bisa Dibaca Penuh Sebelum Upgrade) */}
              <div
                aria-hidden="true"
                className="px-4 sm:px-6 pb-8 space-y-4 blur-[6px] select-none pointer-events-none opacity-65"
              >
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                  <h4 className="text-sm font-black text-slate-900">
                    4. Analisis Skrining Pertumbuhan Mendalam oleh Dokter &amp; Target Kejar Tumbuh
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Berdasarkan kurva pertumbuhan WHO dan evaluasi laju kenaikan berat badan (weight velocity), kebutuhan kalori harian ananda perlu ditingkatkan sebesar 150-220 kkal/hari dengan rasio protein hewani ganda pada setiap jam makan utama serta koreksi jadwal pemberian susu.
                  </p>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                  <h4 className="text-sm font-black text-slate-900">
                    5. Rekomendasi Meal Plan Harian &amp; Action Plan Makan 14 Hari
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Hari 1–3: Reset jadwal lapar-kenyang dengan aturan 3x makan utama dan 2x camilan padat energi, durasi makan maksimal 30 menit tanpa distraksi layar. Hari 4–7: Food chaining bertahap dari tekstur yang disukai menuju variasi protein hewani baru.
                  </p>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                  <h4 className="text-sm font-black text-slate-900">
                    6. Rekomendasi Suplementasi &amp; Advice Lanjutan Dokter
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Evaluasi kebutuhan mikronutrien zat besi (Fe), Zinc, dan Vitamin D3 untuk mengoptimalkan nafsu makan fisiologis serta mencegah stagnasi berat badan dan faltering growth pada usia emas.
                  </p>
                </div>
              </div>

              {/* Overlay Gradient & Kartu Penawaran Screening Lengkap Hanya 139 Ribu */}
              <div className="relative -mt-36 sm:-mt-40 pt-12 pb-5 px-3.5 sm:px-6 bg-linear-to-b from-transparent via-white/95 to-white">
                <div className="bg-slate-950 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-2xl border border-slate-800 space-y-5">
                  {/* Top Lock & Promo Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ccff00]/15 text-[#ccff00] text-[10px] sm:text-xs font-black uppercase tracking-wider border border-[#ccff00]/30">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Analisis Lengkap &amp; Rencana Solusi Terkunci</span>
                      </div>
                      <h3 className="text-base sm:text-xl font-black text-white tracking-tight pt-1">
                        Buka Hasil Analisis Lengkap &amp; Solusi Tuntas Masalah Makan Ananda {formData.namaAnak}
                      </h3>
                    </div>

                    <div className="bg-white/10 rounded-2xl px-3.5 py-2 text-left sm:text-right shrink-0 border border-white/10">
                      <span className="text-[10px] text-slate-400 line-through block">
                        Rp 350.000
                      </span>
                      <span className="text-lg sm:text-2xl font-black text-[#ccff00] leading-none">
                        Hanya 139 Ribu
                      </span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Jangan biarkan masalah makan menghambat tumbuh kembang si kecil. Dapatkan evaluasi menyeluruh dalam <strong className="text-white">Paket Screening Lengkap (Rp 139.000)</strong> yang mencakup:
                  </p>

                  {/* 6 Benefit Sesuai Permintaan */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10">
                      <Utensils className="w-4 h-4 text-[#ccff00] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white">1. Meal Plan Spesifik Anak</h4>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          Panduan menu harian padat gizi &amp; kalori sesuai usia dan tekstur makan anak.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10">
                      <Calendar className="w-4 h-4 text-[#ccff00] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white">2. Action Plan Makan 14 Hari</h4>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          Langkah praktis harian terstruktur selama 14 hari untuk mengatasi GTM &amp; picky eating.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10">
                      <Video className="w-4 h-4 text-[#ccff00] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white">3. E-Course GTM Eksklusif</h4>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          Akses materi video panduan tuntas mengatasi Gerakan Tutup Mulut dari akarnya.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10">
                      <Pill className="w-4 h-4 text-[#ccff00] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white">4. Rekomendasi Suplementasi</h4>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          Saran suplemen, vitamin, zat besi, atau zinc yang tepat sesuai kebutuhan anak.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10">
                      <Scale className="w-4 h-4 text-[#ccff00] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white">5. Analisis Skrining Pertumbuhan oleh Dokter</h4>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          Evaluasi mendalam kurva pertumbuhan (BB/U, TB/U, BB/TB) &amp; status gizi oleh dokter.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10">
                      <Stethoscope className="w-4 h-4 text-[#ccff00] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white">6. Advice Lanjutan dari Dokter Bila Diperlukan</h4>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          Rekomendasi &amp; arahan medis lanjutan dari dokter sesuai kondisi spesifik ananda.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Primary CTA Button: Ambil Screening Lengkap Hanya 139 Ribu */}
                  <div className="pt-2 space-y-2.5">
                    <a
                      href={
                        waFullScreeningUrl ||
                        `https://wa.me/6285129992305?text=${encodeURIComponent(
                          'Ambil Screening Lengkap Hanya 139 Ribu'
                        )}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 px-5 py-4 bg-[#ccff00] hover:bg-[#b8e600] text-slate-950 font-black text-xs sm:text-base rounded-2xl transition-all shadow-lg active:scale-98 cursor-pointer text-center"
                    >
                      <Sparkles className="w-5 h-5 shrink-0" />
                      <span>Ambil Screening Lengkap Hanya 139 Ribu</span>
                      <ArrowRight className="w-5 h-5 shrink-0" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Tombol Isi Ulang Screening */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Data skrining awal tersimpan di rekam medis klinik
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Isi Ulang Form Screening</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ================= FORM INPUT SCREENING GRATIS (MULTI-STEP WIZARD) ================= */
        <div id="free-screening-form-anchor" className="scroll-mt-6">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-slate-200 shadow-md space-y-6 sm:space-y-8"
          >
            {/* Header Form */}
            <div className="border-b border-slate-100 pb-3 sm:pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5 sm:mb-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] sm:text-[11px] font-semibold">
                  <Clock className="w-3 h-3 text-blue-600" />
                  <span>Estimasi: 1–2 Menit</span>
                </div>
                <div className="text-[10px] sm:text-[11px] font-bold text-slate-500">
                  {currentStep === 1 && 'Langkah 1/5: Nama Anak & Bunda'}
                  {currentStep === 2 && 'Langkah 2/5: Kontak WhatsApp'}
                  {currentStep === 3 && 'Langkah 3/5: Tgl Lahir & Gender'}
                  {currentStep === 4 && 'Langkah 4/5: BB & TB Anak'}
                  {currentStep === 5 && 'Langkah 5/5: Pola Makan & Jadwal'}
                </div>
              </div>
              <h2 className="text-base sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                SCREENING SINGKAT MASALAH MAKAN ANAK
              </h2>
              <p className="mt-1 text-[11px] sm:text-sm text-slate-600 leading-relaxed">
                Penapisan bertahap satu per satu pola makan dan warning sign anak usia 0–5 tahun sesuai acuan Ikatan Dokter Anak Indonesia (IDAI) &amp; WHO.
              </p>
            </div>

            {/* Stepper Progress Bar & Indicator */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-xl sm:rounded-2xl p-2.5 sm:p-4">
              <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-slate-700 mb-1.5 sm:mb-2">
                <span className="flex items-center gap-1.5 sm:gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-900 text-[#ccff00] text-[10px] sm:text-[11px] font-black">
                    {currentStep}
                  </span>
                  <span>
                    Langkah {currentStep} dari {TOTAL_STEPS}:{' '}
                    {currentStep === 1 && 'Nama Anak & Bunda'}
                    {currentStep === 2 && 'WhatsApp'}
                    {currentStep === 3 && 'Tanggal Lahir & Gender'}
                    {currentStep === 4 && 'Pertumbuhan BB/TB'}
                    {currentStep === 5 && 'B. Pola Makan'}
                  </span>
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500">
                  {Math.round((currentStep / TOTAL_STEPS) * 100)}% Selesai
                </span>
              </div>

              {/* Progress Line */}
              <div className="w-full h-1.5 sm:h-2 bg-slate-200 rounded-full overflow-hidden mb-2 sm:mb-3">
                <div
                  className="h-full bg-slate-900 transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
                />
              </div>

              {/* Step Navigation Pills */}
              <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
                {[
                  { step: 1, label: 'Nama' },
                  { step: 2, label: 'WhatsApp' },
                  { step: 3, label: 'Lahir' },
                  { step: 4, label: 'BB/TB' },
                  { step: 5, label: 'Pola Makan' },
                ].map((item) => (
                  <button
                    key={item.step}
                    type="button"
                    onClick={() => {
                      if (item.step < currentStep) {
                        setStepError(null);
                        setCurrentStep(item.step);
                        scrollToFormTop();
                      }
                    }}
                    disabled={item.step > currentStep}
                    className={`py-1.5 px-1 rounded-lg text-center transition-all ${
                      item.step === currentStep
                        ? 'bg-slate-900 text-[#ccff00] font-bold shadow-xs'
                        : item.step < currentStep
                        ? 'bg-emerald-100 text-emerald-800 font-semibold cursor-pointer hover:bg-emerald-200'
                        : 'bg-white/60 text-slate-400 font-medium cursor-not-allowed'
                    }`}
                  >
                    <div className="text-[9px] sm:text-[10px] truncate">
                      {item.step < currentStep ? '✓ ' : ''}{item.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Error Notification if required fields missing */}
            {stepError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{stepError}</span>
              </div>
            )}

            {/* ================= LANGKAH 1: NAMA ANAK & NAMA IBU ================= */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div className="border-l-3 border-[#ccff00] pl-2.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Langkah 1 dari 5</span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Nama Anak &amp; Nama Bunda
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Silakan isi nama ananda dan bunda untuk data awal skrining:
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Nama Anak <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Arsya Bagas"
                      value={formData.namaAnak}
                      onChange={(e) => handleChange('namaAnak', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-slate-900 text-xs sm:text-sm font-medium"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Nama Ibu / Bunda <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Bunda Rina"
                      value={formData.namaIbu}
                      onChange={(e) => handleChange('namaIbu', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-slate-900 text-xs sm:text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-end">
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-[#ccff00] font-black text-xs sm:text-sm rounded-xl transition-all shadow-md active:scale-98 cursor-pointer"
                  >
                    <span>Lanjut (Isi No. WhatsApp)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ================= LANGKAH 2: NOMOR WHATSAPP ================= */}
            {currentStep === 2 && (
              <div className="space-y-4 animate-fade-in">
                <div className="border-l-3 border-[#ccff00] pl-2.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Langkah 2 dari 5</span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Nomor WhatsApp Bunda
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Untuk konfirmasi dan hasil evaluasi skrining ananda {formData.namaAnak}:
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 uppercase mb-1">
                      No. HP / WhatsApp <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Contoh: 081234567890"
                      value={formData.noHp}
                      onChange={(e) => handleChange('noHp', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-slate-900 text-xs sm:text-sm font-medium"
                      autoFocus
                    />
                    <p className="mt-1 text-[10px] text-slate-500">
                      🔒 Privasi terjaga, nomor hanya digunakan untuk keperluan konsultasi dan skrining makan.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Kembali (Nama)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-[#ccff00] font-black text-xs sm:text-sm rounded-xl transition-all shadow-md active:scale-98 cursor-pointer"
                  >
                    <span>Lanjut (Tanggal Lahir &amp; Kelamin)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ================= LANGKAH 3: TANGGAL LAHIR & JENIS KELAMIN ================= */}
            {currentStep === 3 && (
              <div className="space-y-4 animate-fade-in">
                <div className="border-l-3 border-[#ccff00] pl-2.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Langkah 3 dari 5</span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Tanggal Lahir &amp; Jenis Kelamin Anak (Khusus Usia 0–5 Tahun)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Masukkan tanggal lahir yang benar (rentang usia 0–60 bulan) untuk menghitung kurva WHO:
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Tanggal Lahir Anak (DOB — Usia 0 s/d 5 Tahun) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      min={dobBounds.minDate}
                      max={dobBounds.maxDate}
                      value={formData.tanggalLahir}
                      onChange={(e) => handleChange('tanggalLahir', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-slate-900 text-xs sm:text-sm font-medium"
                      autoFocus
                    />
                    {formData.tanggalLahir && calculatedAge.isValidAgeRange && (
                      <div className="mt-1.5 text-[10px] sm:text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 border border-indigo-100">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Usia Saat Ini: {calculatedAge.formatted} (Sesuai Kriteria 0–5 Tahun)</span>
                      </div>
                    )}
                    {formData.tanggalLahir && !calculatedAge.isValidAgeRange && (
                      <div className="mt-1.5 text-[10px] sm:text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 border border-rose-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>{calculatedAge.errorMessage}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Jenis Kelamin <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['Laki-laki', 'Perempuan'] as Gender[]).map((gender) => (
                        <button
                          key={gender}
                          type="button"
                          onClick={() => handleChange('jenisKelamin', gender)}
                          className={`py-2.5 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                            formData.jenisKelamin === gender
                              ? 'bg-slate-900 text-[#ccff00] border-slate-900 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {gender}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Kembali (No. WhatsApp)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-[#ccff00] font-black text-xs sm:text-sm rounded-xl transition-all shadow-md active:scale-98 cursor-pointer"
                  >
                    <span>Lanjut (BB &amp; TB Anak)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ================= LANGKAH 4: BB & TB TERAKHIR (WAJIB & VALIDASI FISIOLOGIS) ================= */}
            {currentStep === 4 && (
              <div className="space-y-4 animate-fade-in">
                <div className="border-l-3 border-[#ccff00] pl-2.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Langkah 4 dari 5</span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Berat &amp; Tinggi Badan Terakhir Anak <span className="text-rose-500">*</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Masukkan angka BB (kg) dan TB/PB (cm) yang benar untuk evaluasi kurva gizi WHO ananda {formData.namaAnak} ({calculatedAge.formatted}):
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  {ageBounds && (
                    <div className="p-2.5 sm:p-3 rounded-xl bg-indigo-50/90 border border-indigo-200 text-[11px] sm:text-xs text-indigo-950 flex items-start gap-2">
                      <Scale className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">
                          Acuan Standar WHO Anak {formData.jenisKelamin} Usia {calculatedAge.formatted}:
                        </span>
                        <div className="mt-0.5 text-indigo-800">
                          • Berat Badan (BB) Wajar: <strong>{ageBounds.minWeightKg} – {ageBounds.maxWeightKg} kg</strong> (Normal WHO: ~{ageBounds.medianWeightKg} kg)
                          <br />
                          • Tinggi/Panjang Badan (TB/PB) Wajar: <strong>{ageBounds.minHeightCm} – {ageBounds.maxHeightCm} cm</strong> (Normal WHO: ~{Math.round(ageBounds.medianHeightCm)} cm)
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Berat Badan (BB dalam kg) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min={ageBounds ? ageBounds.minWeightKg : 2.0}
                        max={ageBounds ? ageBounds.maxWeightKg : 30}
                        required
                        placeholder={ageBounds ? `Contoh: ${ageBounds.medianWeightKg}` : 'Contoh: 10.2'}
                        value={formData.bbTerakhir}
                        onKeyDown={(e) => {
                          if (['e', 'E', '+', '-'].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        onChange={(e) => handleChange('bbTerakhir', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-slate-900 text-xs sm:text-sm font-medium"
                        autoFocus
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        {ageBounds
                          ? `Rentang valid usia ${calculatedAge.formatted}: ${ageBounds.minWeightKg} – ${ageBounds.maxWeightKg} kg`
                          : 'Rentang wajar anak 0–5 thn: 2.0 – 30 kg'}
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Tinggi / Panjang Badan (cm) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min={ageBounds ? ageBounds.minHeightCm : 44}
                        max={ageBounds ? ageBounds.maxHeightCm : 128}
                        required
                        placeholder={ageBounds ? `Contoh: ${Math.round(ageBounds.medianHeightCm)}` : 'Contoh: 82'}
                        value={formData.tbTerakhir}
                        onKeyDown={(e) => {
                          if (['e', 'E', '+', '-'].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        onChange={(e) => handleChange('tbTerakhir', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-slate-900 text-xs sm:text-sm font-medium"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        {ageBounds
                          ? `Rentang valid usia ${calculatedAge.formatted}: ${ageBounds.minHeightCm} – ${ageBounds.maxHeightCm} cm`
                          : 'Rentang wajar anak 0–5 thn: 44 – 128 cm'}
                      </span>
                    </div>
                  </div>

                  {liveAnthError && (
                    <div className="p-2.5 sm:p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] sm:text-xs font-bold flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{liveAnthError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                      Waktu Pengukuran BB/TB Terakhir (Pilih Salah Satu)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {[
                        'Minggu ini',
                        'Bulan ini',
                        '1 Bulan lalu',
                        '> 2 Bulan lalu',
                      ].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            handleChange('usiaPengukuran', opt);
                            handleChange('tanggalPengukuran', opt);
                          }}
                          className={`py-2 px-2.5 rounded-xl text-[11px] sm:text-xs font-bold border transition-all cursor-pointer ${
                            formData.usiaPengukuran === opt
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

                <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Kembali (Tgl Lahir)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-[#ccff00] font-black text-xs sm:text-sm rounded-xl transition-all shadow-md active:scale-98 cursor-pointer"
                  >
                    <span>Lanjut ke B. Pola Makan</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ================= LANGKAH 5: POLA PEMBERIAN MAKAN & JADWAL (FEEDING RULES) ================= */}
            {currentStep === 5 && (
              <div className="space-y-5 animate-fade-in">
                {/* Ringkasan Data Pasien Dari Step 1 */}
                <div className="bg-slate-900 text-white rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 flex items-center justify-center text-[#ccff00] font-black text-sm sm:text-base shrink-0">
                      👶
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                          Ananda {formData.namaAnak || 'Anak'}
                        </h4>
                        <span className="px-1.5 py-0.5 rounded-md bg-[#ccff00] text-slate-950 font-black text-[9px] sm:text-[10px]">
                          {formData.jenisKelamin}
                        </span>
                        {calculatedAge.formatted !== '-' && (
                          <span className="px-1.5 py-0.5 rounded-md bg-white/15 text-slate-200 font-semibold text-[9px] sm:text-[10px]">
                            {calculatedAge.formatted}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-slate-300 mt-0.5 truncate">
                        Bunda: {formData.namaIbu} • BB/TB: {formData.bbTerakhir || '-'} / {formData.tbTerakhir || '-'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] sm:text-xs font-bold text-slate-200 transition-colors cursor-pointer shrink-0 self-end sm:self-center"
                  >
                    Ubah
                  </button>
                </div>

                {/* BAGIAN B: PERTANYAAN POLA MAKAN */}
                <section className="space-y-4 pt-1">
                  <div className="flex items-center gap-2 border-l-3 border-[#ccff00] pl-2.5">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      B. Pola Pemberian Makan &amp; Jadwal (Feeding Rules)
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Pilih opsi yang paling sesuai dengan kebiasaan dan jadwal makan ananda saat ini:
                  </p>

                  {/* 1. JADWAL MAKAN UTAMA (BENTUK PILIHAN / BUTTONS) */}
                  <div className="space-y-1.5 p-2.5 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <label className="block text-[10px] sm:text-[11px] font-bold text-slate-800 uppercase">
                      Jadwal Makan Utama:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 pt-0.5">
                      {[
                        '3x Teratur (Pagi, Siang, Malam)',
                        '2x Sehari (Hanya siang & malam)',
                        '1x Sehari (Sangat sulit makan)',
                        'Tidak Tentu / Sesuka Anak',
                      ].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleChange('jadwalMakanUtama', option)}
                          className={`py-2 px-2.5 sm:px-3 text-left text-[11px] sm:text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                            formData.jadwalMakanUtama === option
                              ? 'bg-slate-900 text-[#ccff00] border-slate-900 font-bold shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className="flex items-center justify-between">
                            <span>{option}</span>
                            {formData.jadwalMakanUtama === option && (
                              <span className="w-2 h-2 rounded-full bg-[#ccff00]" />
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. JADWAL SNACK (BENTUK PILIHAN / BUTTONS) */}
                  <div className="space-y-1.5 p-2.5 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <label className="block text-[10px] sm:text-[11px] font-bold text-slate-800 uppercase">
                      Jadwal Snack / Camilan:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 pt-0.5">
                      {[
                        '2x Terjadwal (10.00 & 16.00)',
                        '1x Sehari (Sore hari)',
                        'Sering / Terus-menerus (Grazing)',
                        'Jarang / Tidak Diberi Snack',
                      ].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleChange('jadwalSnack', option)}
                          className={`py-2 px-2.5 sm:px-3 text-left text-[11px] sm:text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                            formData.jadwalSnack === option
                              ? 'bg-slate-900 text-[#ccff00] border-slate-900 font-bold shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className="flex items-center justify-between">
                            <span>{option}</span>
                            {formData.jadwalSnack === option && (
                              <span className="w-2 h-2 rounded-full bg-[#ccff00]" />
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. ASI / SUSU + JUMLAH PER HARI (BENTUK PILIHAN / BUTTONS) */}
                  <div className="space-y-1.5 p-2.5 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <label className="block text-[10px] sm:text-[11px] font-bold text-slate-800 uppercase">
                      ASI / Susu + Jumlah Per Hari:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 pt-0.5">
                      {[
                        'Susu 2-3 gelas (400-500 ml/hari)',
                        'Susu Banyak (>600 ml/hari / >3 botol)',
                        'Susu Sedikit (<300 ml/hari)',
                        'Hanya ASI (Sering / On demand)',
                        'Kombinasi ASI & Susu Formula',
                        'Sudah Tidak Minum Susu',
                      ].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleChange('susuHarian', option)}
                          className={`py-2 px-2.5 sm:px-3 text-left text-[11px] sm:text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                            formData.susuHarian === option
                              ? 'bg-slate-900 text-[#ccff00] border-slate-900 font-bold shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className="flex items-center justify-between">
                            <span>{option}</span>
                            {formData.susuHarian === option && (
                              <span className="w-2 h-2 rounded-full bg-[#ccff00]" />
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3 Quick Yes/No buttons (Hanya Pilihan Ya / Tidak) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 pt-0.5">
                    <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 block mb-1.5">
                        Makan sambil gadget/TV?
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['Ya', 'Tidak'] as YesNoSometimes[]).map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleChange('makanSambilGadget', val)}
                            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                              formData.makanSambilGadget === val
                                ? val === 'Ya'
                                  ? 'bg-slate-900 text-[#ccff00] shadow-2xs'
                                  : 'bg-slate-900 text-white shadow-2xs'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 block mb-1.5">
                        Sering dipaksa / dibujuk?
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['Ya', 'Tidak'] as YesNoSometimes[]).map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleChange('seringDipaksaBujuk', val)}
                            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                              formData.seringDipaksaBujuk === val
                                ? val === 'Ya'
                                  ? 'bg-slate-900 text-[#ccff00] shadow-2xs'
                                  : 'bg-slate-900 text-white shadow-2xs'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 block mb-1.5">
                        Diganti susu/snack saat mogok?
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['Ya', 'Tidak'] as YesNoSometimes[]).map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleChange('digantiSusuSnack', val)}
                            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                              formData.digantiSusuSnack === val
                                ? val === 'Ya'
                                  ? 'bg-slate-900 text-[#ccff00] shadow-2xs'
                                  : 'bg-slate-900 text-white shadow-2xs'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Tombol Aksi Step 2: Kembali ke Identitas & Kirim Form */}
                <div className="pt-3 sm:pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer order-2 sm:order-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Kembali ke Data Anak</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 bg-slate-900 hover:bg-slate-800 text-[#ccff00] font-black text-xs sm:text-sm rounded-xl transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer order-1 sm:order-2"
                  >
                    {isSubmitting ? (
                      <span>Menganalisis Hasil Screening...</span>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-[#ccff00]" />
                        <span>Lihat Hasil Screening Sekarang</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                <div className="text-center pt-1">
                  <span className="text-[11px] text-slate-500">
                    🔒 Hasil screening singkat akan langsung ditampilkan di halaman ini.
                  </span>
                </div>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Lightbox Modal untuk Melihat Testimoni Ukuran Penuh */}
      {zoomedTesti && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          onClick={() => setZoomedTesti(null)}
        >
          <div
            className="relative max-w-3xl max-h-[92vh] bg-slate-950 rounded-2xl p-2 sm:p-3 overflow-hidden shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-2 px-2 text-white border-b border-slate-800 mb-2">
              <span className="text-xs font-bold text-slate-300">
                Tangkapan Layar Testimoni (Ukuran Asli)
              </span>
              <button
                type="button"
                onClick={() => setZoomedTesti(null)}
                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-auto max-h-[82vh] w-full flex items-center justify-center">
              <Image
                src={zoomedTesti}
                alt="Testimoni Ukuran Penuh"
                width={1200}
                height={1800}
                className="w-full h-auto object-contain rounded-lg"
                unoptimized
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
