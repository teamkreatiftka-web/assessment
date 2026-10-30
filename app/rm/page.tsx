'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ScreeningRecord,
  ScreeningStatus,
  PaidScreeningData,
  Gender,
  DoctorInboxSubmission,
} from '@/types/screening';
import {
  fetchAllScreenings,
  updateRecordDetails,
  deleteRecord,
  syncRecordsToSupabase,
} from '@/lib/storage';
import {
  supabase,
  SUPABASE_URL,
  SUPABASE_REST_URL,
  SUPABASE_SQL_SETUP,
  SUPABASE_CLIENT_CODE_SNIPPET,
} from '@/lib/supabase';
import { evaluateAnthropometry } from '@/lib/anthropometry';
import {
  generateSectionPrompt,
  MasterPromptSection,
  PROMPT_SECTIONS,
} from '@/lib/generateMasterPrompt';
import {
  Home,
  Clock,
  LayoutGrid,
  Lock,
  ArrowLeftRight,
  Mail,
  Settings,
  LogOut,
  Search,
  Bell,
  ChevronDown,
  ArrowLeft,
  SlidersHorizontal,
  Calendar,
  Plus,
  ArrowUpRight,
  Download,
  ShoppingBag,
  Upload,
  MoreVertical,
  CheckCheck,
  Send,
  Stethoscope,
  ShieldCheck,
  Printer,
  Copy,
  Database,
  Code2,
  CloudUpload,
  Eye,
  Edit3,
  Utensils,
  Activity,
  Scale,
  Baby,
  AlertCircle,
  X,
} from 'lucide-react';

type UserRole = 'dokter' | 'admin';

const RM_AUTH_STORAGE_KEY = 'tka_rm_auth_session_v1';
const RM_ROLE_STORAGE_KEY = 'tka_rm_role_session_v1';
const RM_PASSWORD = 'faceb00k';

const CLINIC_LOGO_URL =
  'https://cdn.scalev.com/uploads/1791437257/QF6f43VbRyKhXQscT8CtjA/1791437253324-Frame-32-Photoroom-1.webp';

function formatDateShort(isoString?: string): string {
  if (!isoString) return '24 Jun 2026';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '24 Jun 2026';
    const day = String(d.getDate()).padStart(2, '0');
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Agu',
      'Sep',
      'Okt',
      'Nov',
      'Des',
    ];
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return '24 Jun 2026';
  }
}

function formatTimeShort(isoString?: string): string {
  if (!isoString) return '10:30AM';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '10:30AM';
    let hours = d.getHours();
    const mins = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, '0')}:${mins}${ampm}`;
  } catch {
    return '10:30AM';
  }
}

function parseNum(val?: string): number {
  if (!val) return 0;
  const cleaned = val.replace(',', '.').replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function buildAutoDraftForDoctor(rec: ScreeningRecord): string {
  const p = rec.paid_data;
  const keluhan = (p?.keluhanUtama || rec.problem_areas || []).join(', ');
  const q1 = p?.pertanyaanDokter1 || '-';
  const q2 = p?.pertanyaanDokter2 || '-';
  const q3 = p?.pertanyaanDokter3 || '-';
  const bb3 = p?.riwayatBB?.bb3BulanLalu || '-';
  const bb2 = p?.riwayatBB?.bb2BulanLalu || '-';
  const bb1 = p?.riwayatBB?.bb1BulanLalu || '-';
  const bbNow = p?.riwayatBB?.bbSekarang || rec.last_weight;

  return `LAPORAN PASIEN ASESMEN LENGKAP — ${rec.child_name.toUpperCase()} (${rec.age_text} / BB ${rec.last_weight} / TB ${rec.last_height})
ID Rekam Medis: ${rec.id} | Ibu: ${rec.mother_name} (${rec.phone})

1. RINGKASAN KONDISI & KELUHAN UTAMA:
- Keluhan Utama: ${keluhan || '-'}
- Cerita Kondisi: ${p?.ceritaKondisi || rec.summary}
- Riwayat BB 3 Bulan: 3 Bln (${bb3}) -> 2 Bln (${bb2}) -> 1 Bln (${bb1}) -> Sekarang (${bbNow}). Stagnan: ${p?.riwayatBB?.bbStagnan || '-'}.

2. REPERTOIRE MAKANAN & ORAL MOTOR:
- Jumlah Jenis Makanan Diterima: ${p?.jumlahJenisDiterima || '-'}
- Tekstur Saat Ini: ${(p?.teksturDiterima || []).join(', ') || '-'} (Durasi: ${p?.durasiMakan || '-'})
- Oral Motor: Mengunyah (${p?.bisaMengunyah || '-'}), Gagging (${p?.seringGagging || '-'}), Melepeh (${p?.melepehMakanan || '-'}), Mengemut (${p?.lamaDiMulut || '-'}).

3. PERTANYAAN ORANG TUA UNTUK DR. HARYS MAULANA:
- Q1: ${q1}
- Q2: ${q2}
- Q3: ${q3}

4. EVALUASI & REKOMENDASI DOKTER (DIEDIT OLEH DR. HARYS MAULANA):
- Status Gizi & Target BB Ideal: 
- Rekomendasi Feeding Rules & Jadwal Makan: 
- Strategi Naik Tekstur / Food Chaining 14 Hari: 
- Rekomendasi Suplementasi: `;
}

export default function MedicalRecordCalescencePage() {
  // =========================================================================
  // 1. AUTHENTICATION & PRE-LOGIN ROLE SELECTION (Password: faceb00k)
  // =========================================================================
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [selectedLoginRole, setSelectedLoginRole] = useState<UserRole>('admin');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [role, setRole] = useState<UserRole>('admin');

  useEffect(() => {
    try {
      const savedAuth = sessionStorage.getItem(RM_AUTH_STORAGE_KEY);
      const savedRole = sessionStorage.getItem(RM_ROLE_STORAGE_KEY) as UserRole | null;
      if (savedAuth === 'true' && (savedRole === 'admin' || savedRole === 'dokter')) {
        setIsAuthenticated(true);
        setRole(savedRole);
        setSelectedLoginRole(savedRole);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === RM_PASSWORD) {
      setIsAuthenticated(true);
      setRole(selectedLoginRole);
      setAuthError('');
      try {
        sessionStorage.setItem(RM_AUTH_STORAGE_KEY, 'true');
        sessionStorage.setItem(RM_ROLE_STORAGE_KEY, selectedLoginRole);
      } catch {
        // ignore
      }
    } else {
      setAuthError('Sandi salah! Masukkan sandi akses resmi untuk membuka /rm.');
    }
  };

  const handleLogoutOrSwitchRole = () => {
    setIsAuthenticated(false);
    setPasswordInput('');
    setAuthError('');
    try {
      sessionStorage.removeItem(RM_AUTH_STORAGE_KEY);
      sessionStorage.removeItem(RM_ROLE_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  // =========================================================================
  // 2. DATA & REALTIME SYNC STATE
  // =========================================================================
  const [allRecords, setAllRecords] = useState<ScreeningRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [activeTopNav, setActiveTopNav] = useState<
    'dashboard' | 'kirim' | 'rekammedis' | 'history' | 'prompt'
  >('dashboard');
  const [chartPeriod, setChartPeriod] = useState<'monthly' | 'annually'>('annually');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchBar, setShowSearchBar] = useState<boolean>(false);
  const [tableFilter, setTableFilter] = useState<'all' | 'pending' | 'acc'>('all');

  // Admin->Doctor & Doctor Inbox Editor State
  const [reportColumnText, setReportColumnText] = useState<string>('');
  const [isSyncingAction, setIsSyncingAction] = useState<boolean>(false);
  const [toastBanner, setToastBanner] = useState<string | null>(null);

  // Modals: Full Medical Record Dossier Modal, Kirim/Inbox Modal, Supabase Modal, A4 Print Modal
  const [showFullDossierModal, setShowFullDossierModal] = useState<boolean>(false);
  const [dossierTab, setDossierTab] = useState<
    'pasien' | 'repertoire' | 'oralmotor' | 'foodrecall' | 'riwayatbb' | 'prompt'
  >('pasien');
  const [showSendOrInboxModal, setShowSendOrInboxModal] = useState<boolean>(false);
  const [showSupabaseModal, setShowSupabaseModal] = useState<boolean>(false);
  const [supabaseCodeTab, setSupabaseCodeTab] = useState<'sql' | 'ts'>('sql');
  const [copiedSupabaseCode, setCopiedSupabaseCode] = useState<boolean>(false);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState<boolean>(false);
  const [showA4Modal, setShowA4Modal] = useState<boolean>(false);
  const [selectedPromptSection, setSelectedPromptSection] =
    useState<MasterPromptSection>('all');
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);

  const loadPaidRecords = useCallback(
    async (silent = false) => {
      const { records } = await fetchAllScreenings();
      const paidOnly = records.filter((r) => r.type === 'paid');
      setAllRecords(paidOnly);

      if (paidOnly.length > 0 && !selectedRecordId) {
        const defaultRec =
          role === 'dokter'
            ? paidOnly.find((r) => r.paid_data?.doctorSubmission?.isSentToDoctor) ||
              paidOnly[0]
            : paidOnly[0];
        setSelectedRecordId(defaultRec.id);
        setReportColumnText(
          defaultRec.paid_data?.doctorSubmission?.reportContent ||
            buildAutoDraftForDoctor(defaultRec)
        );
      } else if (silent && selectedRecordId) {
        const current = paidOnly.find((r) => r.id === selectedRecordId);
        if (current?.paid_data?.doctorSubmission?.reportContent) {
          setReportColumnText(current.paid_data.doctorSubmission.reportContent);
        }
      }
    },
    [selectedRecordId, role]
  );

  useEffect(() => {
    loadPaidRecords(false);
  }, [loadPaidRecords]);

  // Realtime sync across tabs & Supabase
  useEffect(() => {
    const onStorage = () => loadPaidRecords(true);
    window.addEventListener('storage', onStorage);

    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('tka_rm_realtime_channel');
      bc.onmessage = () => loadPaidRecords(true);
    }

    const channel = supabase
      .channel('rm_calescence_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'screenings' },
        () => loadPaidRecords(true)
      )
      .subscribe();

    return () => {
      window.removeEventListener('storage', onStorage);
      if (bc) bc.close();
      supabase.removeChannel(channel);
    };
  }, [loadPaidRecords]);

  // Visible records based on role (Dokter only sees Inbox items sent to Doctor; Admin sees all Paid records)
  const roleRecords = useMemo(() => {
    const base =
      role === 'dokter'
        ? allRecords.filter((r) => r.paid_data?.doctorSubmission?.isSentToDoctor)
        : allRecords;

    return base.filter((r) => {
      const sub = r.paid_data?.doctorSubmission;
      if (tableFilter === 'pending' && sub?.isAcc) return false;
      if (tableFilter === 'acc' && !sub?.isAcc) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return (
          r.child_name.toLowerCase().includes(q) ||
          r.mother_name.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allRecords, role, tableFilter, searchQuery]);

  const selectedRecord = useMemo(() => {
    if (!roleRecords.length && !allRecords.length) return null;
    return (
      roleRecords.find((r) => r.id === selectedRecordId) ||
      roleRecords[0] ||
      allRecords[0]
    );
  }, [roleRecords, allRecords, selectedRecordId]);

  const handleSelectPatient = (rec: ScreeningRecord) => {
    setSelectedRecordId(rec.id);
    setReportColumnText(
      rec.paid_data?.doctorSubmission?.reportContent ||
        buildAutoDraftForDoctor(rec)
    );
  };

  // Anthropometry & 6-Bar Chart Data for Selected Patient
  const anthropometry = useMemo(() => {
    if (!selectedRecord) return null;
    const p = selectedRecord.paid_data;
    const dob = p?.dob || '';
    const gender = (p?.jenisKelamin || selectedRecord.gender || 'Laki-laki') as Gender;
    const weight = p?.bbSekarang || selectedRecord.last_weight || '0';
    const height = p?.tbPB || selectedRecord.last_height || '0';
    const measDate = p?.tanggalUkur || selectedRecord.measurement_date;
    if (!dob) return null;
    return evaluateAnthropometry(dob, gender, weight, height, measDate);
  }, [selectedRecord]);

  // 6 Vertical Pill Bars for Center "Engagement rate" Card
  const sixBarsData = useMemo(() => {
    const p = selectedRecord?.paid_data;
    const wNow = parseNum(p?.riwayatBB?.bbSekarang || p?.bbSekarang || selectedRecord?.last_weight) || 10.2;
    const w1 = parseNum(p?.riwayatBB?.bb1BulanLalu) || +(wNow - 0.2).toFixed(1);
    const w2 = parseNum(p?.riwayatBB?.bb2BulanLalu) || +(w1 - 0.2).toFixed(1);
    const w3 = parseNum(p?.riwayatBB?.bb3BulanLalu) || +(w2 - 0.1).toFixed(1);
    const wTarget = parseNum(p?.riwayatBB?.targetBB) || +(wNow + 1.2).toFixed(1);
    const wIdeal = anthropometry?.idealBodyWeightKg || +(wNow + 1.0).toFixed(1);

    // Scale to 100-400 visual height like Calescence chart (0, 100, 200, 300, 400)
    const vals = [
      { day: '3 Bln', raw: `${w3}kg`, score: Math.min(380, Math.round(w3 * 22)) },
      { day: '2 Bln', raw: `${w2}kg`, score: Math.min(380, Math.round(w2 * 25)) },
      { day: '1 Bln', raw: `${w1}kg`, score: Math.min(380, Math.round(w1 * 21)) },
      {
        day: 'Skrg',
        raw: `${wNow}kg`,
        score: Math.min(400, Math.max(320, Math.round(wNow * 32))),
        active: true,
      },
      { day: 'Target', raw: `${wTarget}kg`, score: Math.min(380, Math.round(wTarget * 24)) },
      { day: 'BBI', raw: `${wIdeal}kg`, score: Math.min(380, Math.round(wIdeal * 20)) },
    ];
    return vals;
  }, [selectedRecord, anthropometry]);

  // Admin Action: Send Report to Doctor Inbox
  const handleAdminSendToDoctor = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedRecord || !selectedRecord.paid_data) return;
    setIsSyncingAction(true);

    const nowIso = new Date().toISOString();
    const prevSub = selectedRecord.paid_data.doctorSubmission;
    const updatedSubmission: DoctorInboxSubmission = {
      isSentToDoctor: true,
      sentAt: prevSub?.sentAt || nowIso,
      sentByAdminName: 'Admin Rekam Medis',
      reportContent:
        reportColumnText.trim() || buildAutoDraftForDoctor(selectedRecord),
      isAcc: prevSub?.isAcc || false,
      accAt: prevSub?.accAt,
      lastEditedBy: 'admin',
      updatedAt: nowIso,
    };

    await updateRecordDetails(selectedRecord.id, {
      status: updatedSubmission.isAcc ? 'Selesai' : 'Dalam Review',
      clinical_notes: updatedSubmission.reportContent,
      paid_data: {
        ...selectedRecord.paid_data,
        doctorSubmission: updatedSubmission,
      },
    });

    await loadPaidRecords(true);
    setIsSyncingAction(false);
    setToastBanner(
      `✓ Laporan "${selectedRecord.child_name}" berhasil dikirim ke Kotak Masuk Dokter secara realtime!`
    );
    setTimeout(() => setToastBanner(null), 4500);
  };

  // Doctor Action: Save Edited Column & Mark ACC
  const handleDoctorSaveAndAcc = async (markAcc: boolean) => {
    if (!selectedRecord || !selectedRecord.paid_data) return;
    setIsSyncingAction(true);

    const nowIso = new Date().toISOString();
    const prevSub = selectedRecord.paid_data.doctorSubmission;
    const updatedSubmission: DoctorInboxSubmission = {
      isSentToDoctor: true,
      sentAt: prevSub?.sentAt || nowIso,
      sentByAdminName: prevSub?.sentByAdminName || 'Admin Rekam Medis',
      reportContent: reportColumnText,
      isAcc: markAcc,
      accAt: markAcc ? nowIso : undefined,
      lastEditedBy: 'dokter',
      updatedAt: nowIso,
    };

    await updateRecordDetails(selectedRecord.id, {
      status: markAcc ? 'Selesai' : 'Dalam Review',
      clinical_notes: reportColumnText,
      paid_data: {
        ...selectedRecord.paid_data,
        doctorSubmission: updatedSubmission,
      },
    });

    await loadPaidRecords(true);
    setIsSyncingAction(false);
    setToastBanner(
      markAcc
        ? `✓ Kolom laporan "${selectedRecord.child_name}" disimpan & diberi tanda SUDAH DI-ACC oleh dr. Harys Maulana!`
        : `✓ Editan kolom "${selectedRecord.child_name}" disimpan (Status: Menunggu ACC).`
    );
    setTimeout(() => setToastBanner(null), 4500);
  };

  const handleSyncToSupabase = async () => {
    setIsSyncingSupabase(true);
    const res = await syncRecordsToSupabase(allRecords);
    setIsSyncingSupabase(false);
    setToastBanner(
      res.success
        ? `✓ Berhasil sinkronisasi ${res.syncedCount} rekam medis ke Supabase!`
        : `⚠ Gagal sync Supabase: ${res.error}`
    );
    setTimeout(() => setToastBanner(null), 4500);
  };

  const paidData: Partial<PaidScreeningData> = selectedRecord?.paid_data || {};
  const activeSub = paidData.doctorSubmission;

  // =========================================================================
  // LOGIN GATE (PASSWORD: faceb00k + PILIH ROLE SEBELUM MASUK)
  // Styled in 100% Calescence UI Aesthetic (#F3F5F9, #111827, Neon Lime #C8FF29)
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-[#F3F5F9] flex flex-col justify-center items-center px-4 py-10 font-sans text-[#111827]">
        <div className="w-full max-w-[520px] rounded-[32px] bg-white p-7 sm:p-10 shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
          {/* Calescence Brand Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#C8FF29] text-[#111827] font-black text-xl shadow-xs">
                C
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-[#111827] block leading-none">
                  RekamMedis
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  Portal Klinis dr. Harys Maulana
                </span>
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={CLINIC_LOGO_URL}
              alt="Logo"
              className="h-9 w-auto object-contain"
            />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] mb-1.5">
            Pilih Role & Masuk
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mb-6">
            Pilih role Anda terlebih dahulu, lalu masukkan sandi keamanan <strong>/rm</strong>.
          </p>

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            {/* Stacked Calescence-style Role Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <button
                type="button"
                onClick={() => setSelectedLoginRole('admin')}
                className={`text-left rounded-[24px] p-5 transition-all ${
                  selectedLoginRole === 'admin'
                    ? 'bg-[#121417] text-white shadow-md ring-2 ring-[#121417]'
                    : 'bg-[#F3F5F9] text-[#111827] hover:bg-slate-200/70'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      selectedLoginRole === 'admin'
                        ? 'bg-[#C8FF29] text-[#111827]'
                        : 'bg-white text-[#111827]'
                    }`}
                  >
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider opacity-75">
                    Role 01
                  </span>
                </div>
                <p className="text-base font-bold">Admin RM</p>
                <p
                  className={`text-xs mt-1 leading-relaxed ${
                    selectedLoginRole === 'admin' ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  Semua data screening bayar & fitur <strong>Kirim ke Dokter</strong>.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedLoginRole('dokter')}
                className={`text-left rounded-[24px] p-5 transition-all ${
                  selectedLoginRole === 'dokter'
                    ? 'bg-[#C8FF29] text-[#111827] shadow-md ring-2 ring-[#121417]'
                    : 'bg-[#F3F5F9] text-[#111827] hover:bg-slate-200/70'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#121417] text-white">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider opacity-75">
                    Role 02
                  </span>
                </div>
                <p className="text-base font-bold">Dokter (Inbox)</p>
                <p className="text-xs mt-1 leading-relaxed text-[#111827]/80">
                  Khusus <strong>Kotak Masuk</strong>, edit kolom laporan & beri tanda <strong>ACC ✓</strong>.
                </p>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Sandi Keamanan (/rm)
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Masukkan sandi..."
                autoFocus
                className="w-full rounded-full bg-[#F3F5F9] border border-slate-200 px-5 py-3.5 text-sm font-semibold text-[#111827] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#121417]"
              />
              {authError && (
                <p className="mt-2 text-xs font-semibold text-rose-600">{authError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-[#121417] hover:bg-slate-800 text-white py-4 px-6 text-sm font-bold transition flex items-center justify-center gap-2"
            >
              <span>
                Masuk ke Dashboard{' '}
                {selectedLoginRole === 'dokter' ? 'Inbox Dokter' : 'Admin'}
              </span>
              <ArrowUpRight className="h-4 w-4 text-[#C8FF29]" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MAIN CALESCENCE DASHBOARD UI (100% MATCH TO image_9f1115a2.png)
  // =========================================================================
  const topThreeStack = roleRecords.slice(0, 3);
  const accCount = allRecords.filter(
    (r) => r.paid_data?.doctorSubmission?.isAcc
  ).length;
  const sentCount = allRecords.filter(
    (r) => r.paid_data?.doctorSubmission?.isSentToDoctor
  ).length;

  return (
    <div className="min-h-screen w-full bg-[#F3F5F9] px-4 py-5 sm:px-7 sm:py-6 lg:px-10 lg:py-7 font-sans text-[#111827] selection:bg-[#C8FF29] selection:text-[#111827]">
      <div className="mx-auto max-w-[1480px]">
        {/* ================================================================= */}
        {/* 1. TOP FLOATING PILL NAVBAR (EXACT MATCH TO CALESCENCE HEADER)     */}
        {/* ================================================================= */}
        <header className="w-full rounded-full bg-white px-4 sm:px-6 py-3 shadow-[0_2px_16px_rgba(15,23,42,0.03)] flex flex-wrap items-center justify-between gap-4 mb-7">
          {/* Left: Neon Lime Hexagon/C Icon + Brand Title + Portal Switcher */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#C8FF29] text-[#111827] shadow-2xs">
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 4.2l5 2.8v6l-5 2.8-5-2.8V9l5-2.8z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-[#111827]">
              Calescence
            </span>
            <div className="hidden lg:flex items-center gap-1 rounded-full bg-[#F3F5F9] p-1 ml-1">
              <Link
                href="/admin"
                className="rounded-full px-3 py-1 text-[11px] font-semibold text-slate-600 hover:text-[#111827] transition"
              >
                /admin
              </Link>
              <Link
                href="/rm"
                className="rounded-full bg-[#121417] px-3 py-1 text-[11px] font-bold text-[#C8FF29] shadow-2xs"
              >
                /rm ({role === 'dokter' ? 'Dokter' : 'Admin'})
              </Link>
              <Link
                href="/admincommunity"
                className="rounded-full px-3 py-1 text-[11px] font-semibold text-slate-600 hover:text-[#111827] transition"
              >
                /admincommunity
              </Link>
            </div>
          </div>

          {/* Center: 5 Navigation Links with Active Black Pill ("Dashbord", "Payments", "Cads", "History", "Help") */}
          <nav className="flex flex-wrap items-center gap-1 sm:gap-2">
            {role === 'admin' ? (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTopNav('dashboard')}
                  className={`rounded-full px-5 py-2.5 text-xs sm:text-sm font-medium transition-all ${
                    activeTopNav === 'dashboard'
                      ? 'bg-[#121417] text-white'
                      : 'text-slate-600 hover:text-[#111827]'
                  }`}
                >
                  Dashbord
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTopNav('kirim');
                    setShowSendOrInboxModal(true);
                  }}
                  className={`rounded-full px-4 py-2.5 text-xs sm:text-sm font-medium transition-all ${
                    activeTopNav === 'kirim'
                      ? 'bg-[#121417] text-white'
                      : 'text-slate-600 hover:text-[#111827]'
                  }`}
                >
                  Kirim Dokter
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTopNav('rekammedis');
                    setShowFullDossierModal(true);
                  }}
                  className={`rounded-full px-4 py-2.5 text-xs sm:text-sm font-medium transition-all ${
                    activeTopNav === 'rekammedis'
                      ? 'bg-[#121417] text-white'
                      : 'text-slate-600 hover:text-[#111827]'
                  }`}
                >
                  Data Pasien
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTopNav('history');
                    setDossierTab('foodrecall');
                    setShowFullDossierModal(true);
                  }}
                  className={`rounded-full px-4 py-2.5 text-xs sm:text-sm font-medium transition-all ${
                    activeTopNav === 'history'
                      ? 'bg-[#121417] text-white'
                      : 'text-slate-600 hover:text-[#111827]'
                  }`}
                >
                  Recall & BB
                </button>
                <button
                  type="button"
                  onClick={() => setShowSupabaseModal(true)}
                  className="rounded-full px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-[#111827] transition-all"
                >
                  Supabase
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setTableFilter('all')}
                  className={`rounded-full px-5 py-2.5 text-xs sm:text-sm font-medium transition-all ${
                    tableFilter === 'all'
                      ? 'bg-[#121417] text-white'
                      : 'text-slate-600 hover:text-[#111827]'
                  }`}
                >
                  Inbox Dokter ({sentCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTableFilter('pending')}
                  className={`rounded-full px-4 py-2.5 text-xs sm:text-sm font-medium transition-all ${
                    tableFilter === 'pending'
                      ? 'bg-[#121417] text-white'
                      : 'text-slate-600 hover:text-[#111827]'
                  }`}
                >
                  Menunggu ACC ({sentCount - accCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTableFilter('acc')}
                  className={`rounded-full px-4 py-2.5 text-xs sm:text-sm font-medium transition-all ${
                    tableFilter === 'acc'
                      ? 'bg-[#121417] text-white'
                      : 'text-slate-600 hover:text-[#111827]'
                  }`}
                >
                  Sudah Di-ACC ({accCount})
                </button>
                <button
                  type="button"
                  onClick={() => setShowFullDossierModal(true)}
                  className="rounded-full px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-[#111827] transition-all"
                >
                  Detail Rekam Medis
                </button>
                <button
                  type="button"
                  onClick={() => setShowA4Modal(true)}
                  className="rounded-full px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-[#111827] transition-all"
                >
                  Cetak A4
                </button>
              </>
            )}
          </nav>

          {/* Right: Search Circle, Notification Bell Circle with Red Dot, User Avatar + Chevron */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowSearchBar((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-[#F8FAFC] text-slate-700 hover:bg-slate-100 transition"
              title="Cari Pasien"
            >
              <Search className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setShowSendOrInboxModal(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-[#F8FAFC] text-slate-700 hover:bg-slate-100 transition"
              title="Kotak Masuk / Pengiriman Dokter"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-[#EF4444]" />
            </button>

            <button
              type="button"
              onClick={handleLogoutOrSwitchRole}
              title="Klik untuk Ganti Role (Admin / Dokter) atau Keluar"
              className="flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 hover:bg-slate-100 transition"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-[#121417] to-slate-700 text-[#C8FF29] font-bold text-xs shadow-2xs">
                {role === 'dokter' ? 'dr' : 'AD'}
              </div>
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </button>
          </div>
        </header>

        {/* Optional Search Input Bar */}
        {showSearchBar && (
          <div className="mb-5 flex items-center gap-3 rounded-full bg-white px-5 py-3 shadow-xs">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama pasien anak, nama ibu, atau nomor ID Rekam Medis..."
              className="w-full bg-transparent text-sm font-medium text-[#111827] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs font-bold text-slate-400 hover:text-slate-700"
              >
                Reset
              </button>
            )}
          </div>
        )}

        {/* Toast Notification Banner */}
        {toastBanner && (
          <div className="mb-5 rounded-full bg-[#121417] text-white px-6 py-3 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-md">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#C8FF29]" />
              {toastBanner}
            </span>
            <button
              type="button"
              onClick={() => setToastBanner(null)}
              className="text-white/70 hover:text-white ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* 2. GREETING ROW ("<- Hello, Naiem" + Filter + Date Pill + Action) */}
        {/* ================================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 px-1">
          {/* Left: Back Circle Button + Greeting */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleLogoutOrSwitchRole}
              title="Kembali ke Pilih Role"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300/80 bg-transparent text-[#111827] hover:bg-white transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-3xl sm:text-[38px] font-medium tracking-tight text-[#111827]">
              {role === 'dokter' ? 'Hello, dr. Harys' : 'Hello, Admin'}
            </h1>
          </div>

          {/* Right: Sliders Circle + Date Range Pill + "+ Add new wallet" Equivalent Pill */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowFullDossierModal(true)}
              title="Buka Semua Detail Rekam Medis Pasien"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300/80 bg-transparent text-[#111827] hover:bg-white transition"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2.5 rounded-full border border-slate-300/80 bg-transparent px-5 py-2.5 text-xs sm:text-sm font-medium text-[#111827]">
              <Calendar className="h-4 w-4 text-slate-600" />
              <span>29 Sep, 2025 - 26 Okt, 2026</span>
            </div>

            {role === 'admin' ? (
              <button
                type="button"
                onClick={() => setShowSendOrInboxModal(true)}
                className="flex items-center gap-2 rounded-full border border-slate-300/80 bg-transparent hover:bg-[#121417] hover:text-white hover:border-[#121417] px-5 py-2.5 text-xs sm:text-sm font-medium text-[#111827] transition"
              >
                <Plus className="h-4 w-4" />
                <span>Kirim ke Dokter</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleDoctorSaveAndAcc(true)}
                className="flex items-center gap-2 rounded-full border border-slate-300/80 bg-[#C8FF29] hover:bg-[#b8f019] px-5 py-2.5 text-xs sm:text-sm font-bold text-[#111827] transition"
              >
                <CheckCheck className="h-4 w-4" />
                <span>ACC Laporan Aktif</span>
              </button>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* 3. MAIN WORKSPACE: LEFT WHITE PILL SIDEBAR + 12-COL BENTO GRID    */}
        {/* ================================================================= */}
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          {/* LEFT VERTICAL WHITE PILL SIDEBAR (EXACT MATCH TO CALESCENCE) */}
          <aside className="flex lg:flex-col items-center justify-between rounded-[32px] bg-white px-4 py-4 lg:py-7 lg:w-[68px] shadow-[0_4px_24px_rgba(15,23,42,0.025)] shrink-0">
            {/* Top 6 Icons */}
            <div className="flex lg:flex-col items-center gap-4 sm:gap-5">
              <button
                type="button"
                onClick={() => setActiveTopNav('dashboard')}
                title="Beranda Dashboard"
                className="flex h-11 w-11 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-[#111827] transition"
              >
                <Home className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setDossierTab('foodrecall');
                  setShowFullDossierModal(true);
                }}
                title="24-Hour Food Recall & Riwayat Makan"
                className="flex h-11 w-11 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-[#111827] transition"
              >
                <Clock className="h-5 w-5" />
              </button>

              {/* Active Dark Circle Icon with Neon Lime Accent */}
              <button
                type="button"
                onClick={() => setShowFullDossierModal(true)}
                title="Rekam Medis Lengkap Pasien"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#121417] text-[#C8FF29] shadow-sm transition"
              >
                <LayoutGrid className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setDossierTab('oralmotor');
                  setShowFullDossierModal(true);
                }}
                title="Evaluasi Oral Motor & Sensorik"
                className="flex h-11 w-11 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-[#111827] transition"
              >
                <Lock className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={handleSyncToSupabase}
                title="Sinkronisasi Realtime ke Supabase"
                className="flex h-11 w-11 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-[#111827] transition"
              >
                <ArrowLeftRight className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => setShowSendOrInboxModal(true)}
                title={
                  role === 'dokter'
                    ? 'Kotak Masuk (Inbox) Dokter'
                    : 'Kirim Laporan ke Dokter'
                }
                className="flex h-11 w-11 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-[#111827] transition"
              >
                <Mail className="h-5 w-5" />
              </button>
            </div>

            {/* Bottom 2 Icons (Settings & Logout) */}
            <div className="flex lg:flex-col items-center gap-4 pt-0 lg:pt-8">
              <button
                type="button"
                onClick={() => setShowSupabaseModal(true)}
                title="Pengaturan & Kode SQL Supabase"
                className="flex h-11 w-11 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-[#111827] transition"
              >
                <Settings className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={handleLogoutOrSwitchRole}
                title="Ganti Role / Keluar"
                className="flex h-11 w-11 items-center justify-center rounded-full text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </aside>

          {/* 12-COLUMN CALESCENCE BENTO GRID */}
          <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* ============================================================= */}
            {/* LEFT + CENTER 8 COLUMNS (TOP 2 CARDS + BOTTOM TABLE CARD)     */}
            {/* ============================================================= */}
            <div className="xl:col-span-8 flex flex-col gap-6">
              {/* TOP ROW: "Investments" Card (5 Cols) + "Engagement rate" Card (7 Cols) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* CARD A: "Investments" -> 3 Overlapping Stacked Cards (Black, Neon Lime, White) */}
                <div className="md:col-span-5 rounded-[28px] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.025)] flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold text-[#111827]">
                      {role === 'dokter' ? 'Inbox Pasien' : 'Pasien Berbayar'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowFullDossierModal(true)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-[#111827] hover:bg-slate-50 transition"
                      title="Lihat Detail Rekam Medis"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>

                  {/* 3 Overlapping Stacked Folder-Tab Cards (Tesla Black, X Lime, Apple White) */}
                  <div className="flex flex-col">
                    {topThreeStack.map((rec, index) => {
                      const isSelected = selectedRecord?.id === rec.id;
                      const isAcc = rec.paid_data?.doctorSubmission?.isAcc;
                      const isSent = rec.paid_data?.doctorSubmission?.isSentToDoctor;

                      if (index === 0) {
                        // Top Card: Solid Black (#121417) with Red Circle Icon
                        return (
                          <div
                            key={rec.id}
                            onClick={() => handleSelectPatient(rec)}
                            className={`cursor-pointer rounded-t-[24px] rounded-b-[10px] bg-[#121417] text-white px-5 pt-5 pb-9 transition-transform hover:-translate-y-0.5 ${
                              isSelected ? 'ring-2 ring-[#3B82F6]' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E11D48] text-white font-bold text-sm">
                                  {rec.child_name.charAt(0)}
                                </div>
                                <div className="truncate">
                                  <p className="text-base font-semibold text-white truncate">
                                    {rec.child_name.split(' ').slice(0, 2).join(' ')}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    {rec.id.replace('RM-PRO-2026-', '#')}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-semibold text-white">
                                  {rec.last_weight}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  {isAcc ? '✓ Di-ACC' : isSent ? 'Di Inbox' : rec.age_text}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (index === 1) {
                        // Middle Card: Neon Lime (#C8FF29) Overlapping Top Card
                        return (
                          <div
                            key={rec.id}
                            onClick={() => handleSelectPatient(rec)}
                            className={`cursor-pointer -mt-4 z-10 rounded-t-[24px] rounded-b-[10px] bg-[#C8FF29] text-[#111827] px-5 pt-5 pb-9 transition-transform hover:-translate-y-0.5 ${
                              isSelected ? 'ring-2 ring-[#121417]' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#121417] text-white font-bold text-sm">
                                  {rec.child_name.charAt(0)}
                                </div>
                                <div className="truncate">
                                  <p className="text-base font-semibold text-[#111827] truncate">
                                    {rec.child_name.split(' ').slice(0, 2).join(' ')}
                                  </p>
                                  <p className="text-xs text-[#111827]/70">
                                    {rec.id.replace('RM-PRO-2026-', '#')}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-semibold text-[#111827]">
                                  {rec.last_weight}
                                </p>
                                <p className="text-[11px] text-[#111827]/70">
                                  {isAcc ? '✓ Di-ACC' : isSent ? 'Di Inbox' : rec.age_text}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Bottom Card: Crisp White Overlapping Middle Card
                      return (
                        <div
                          key={rec.id}
                          onClick={() => handleSelectPatient(rec)}
                          className={`cursor-pointer -mt-4 z-20 rounded-[24px] bg-white border border-slate-100 text-[#111827] p-5 shadow-[0_-4px_16px_rgba(15,23,42,0.04)] transition-transform hover:-translate-y-0.5 ${
                            isSelected ? 'ring-2 ring-[#121417]' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#121417] text-white font-bold text-sm">
                                {rec.child_name.charAt(0)}
                              </div>
                              <div className="truncate">
                                <p className="text-base font-semibold text-[#111827] truncate">
                                  {rec.child_name.split(' ').slice(0, 2).join(' ')}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {rec.id.replace('RM-PRO-2026-', '#')}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold text-[#111827]">
                                {rec.last_weight}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {isAcc ? '✓ Di-ACC' : isSent ? 'Di Inbox' : rec.age_text}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* CARD B: "Engagement rate" -> 6 Rounded Vertical Striped Pill Bars on Dashed Grid */}
                <div className="md:col-span-7 rounded-[28px] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.025)] flex flex-col justify-between">
                  {/* Top Bar: Mail Icon + Title + Monthly/Annually Toggle + Arrow */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700">
                        <Scale className="h-4 w-4" />
                      </div>
                      <h2 className="text-base font-semibold text-[#111827]">
                        Riwayat BB ({selectedRecord?.child_name.split(' ')[0]})
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center rounded-full bg-[#F3F5F9] p-1">
                        <button
                          type="button"
                          onClick={() => setChartPeriod('monthly')}
                          className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                            chartPeriod === 'monthly'
                              ? 'bg-[#3B82F6] text-white shadow-2xs'
                              : 'text-slate-600'
                          }`}
                        >
                          Bulanan
                        </button>
                        <button
                          type="button"
                          onClick={() => setChartPeriod('annually')}
                          className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                            chartPeriod === 'annually'
                              ? 'bg-[#3B82F6] text-white shadow-2xs'
                              : 'text-slate-600'
                          }`}
                        >
                          3 Bulan
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setDossierTab('riwayatbb');
                          setShowFullDossierModal(true);
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-[#111827] hover:bg-slate-50 transition"
                        title="Lihat Detail Riwayat BB & Antropometri WHO"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Chart Area with Y-Axis Labels (0, 100, 200, 300, 400) + Dashed Horizontal Lines + 6 Pill Bars */}
                  <div className="relative pt-2 pb-1">
                    <div className="flex items-end gap-3 sm:gap-4 h-[210px]">
                      {/* Y-Axis Labels */}
                      <div className="flex flex-col justify-between h-full text-xs font-medium text-slate-400 pb-6 pr-1 select-none">
                        <span>400</span>
                        <span>300</span>
                        <span>200</span>
                        <span>100</span>
                        <span>0</span>
                      </div>

                      {/* Grid + Bars Container */}
                      <div className="relative flex-1 h-full flex flex-col justify-between pb-6">
                        {/* 5 Dashed Horizontal Grid Lines */}
                        {[0, 1, 2, 3, 4].map((lineIdx) => (
                          <div
                            key={lineIdx}
                            className="w-full border-b border-dashed border-slate-200"
                          />
                        ))}

                        {/* 6 Rounded Pill Bars Overlaid */}
                        <div className="absolute inset-x-0 bottom-6 top-0 flex items-end justify-around px-1 sm:px-3 gap-2 sm:gap-4">
                          {sixBarsData.map((bar, i) => {
                            const heightPercent = Math.max(
                              28,
                              Math.min(100, Math.round((bar.score / 400) * 100))
                            );
                            return (
                              <div
                                key={i}
                                className="flex flex-col items-center justify-end h-full flex-1 max-w-[48px] group"
                              >
                                <span className="mb-1 text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition">
                                  {bar.raw}
                                </span>
                                <div
                                  style={{
                                    height: `${heightPercent}%`,
                                    backgroundImage:
                                      'repeating-linear-gradient(135deg, rgba(255,255,255,0.16) 0px, rgba(255,255,255,0.16) 6px, transparent 6px, transparent 12px)',
                                  }}
                                  className={`w-full rounded-full transition-all duration-500 ${
                                    bar.active
                                      ? 'bg-[#1D7AFC] shadow-[0_6px_20px_rgba(29,122,252,0.35)]'
                                      : 'bg-[#67A8FF] hover:bg-[#4B96FF]'
                                  }`}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* X-Axis Day/Month Labels ("Sat, Sun, Mon, Tue, Wed, Thu" equivalent) */}
                    <div className="flex items-center justify-around pl-9 pr-1 sm:pr-3 text-xs font-medium text-slate-500">
                      {sixBarsData.map((bar, i) => (
                        <span
                          key={i}
                          className={`flex-1 text-center ${
                            bar.active ? 'font-bold text-[#111827]' : ''
                          }`}
                        >
                          {bar.day}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTTOM WIDE CARD: "Transaction History" -> Daftar Pasien / Inbox & Status ACC */}
              <div className="rounded-[28px] bg-white p-6 sm:p-7 shadow-[0_4px_24px_rgba(15,23,42,0.025)]">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-[#111827]">
                      {role === 'dokter'
                        ? 'Kotak Masuk Laporan Pasien (Dari Admin)'
                        : 'Daftar Pasien Asesmen Lengkap & Status Dokter'}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {role === 'dokter'
                        ? 'Klik pasien untuk mengedit kolom laporan di panel kanan & memberikan tanda ACC'
                        : 'Klik pasien untuk melihat rekam medis lengkap atau mengirim laporan ke Inbox Dokter'}
                    </p>
                  </div>

                  {/* Dropdown Filter ("Recent v") */}
                  <div className="flex items-center gap-2">
                    <select
                      value={tableFilter}
                      onChange={(e) => setTableFilter(e.target.value as any)}
                      className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-[#111827] focus:outline-none"
                    >
                      <option value="all">Semua ({roleRecords.length})</option>
                      <option value="pending">Menunggu ACC</option>
                      <option value="acc">Sudah Di-ACC ✓</option>
                    </select>
                  </div>
                </div>

                {/* 4-Column Table ("Name", "Date", "Time", "Amount") */}
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[540px]">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 px-4 pb-3 text-xs font-medium text-slate-400">
                      <div className="col-span-5">Nama Pasien & Ibu</div>
                      <div className="col-span-3">Tanggal</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-2 text-right">BB / Aksi</div>
                    </div>

                    {/* Table Rows */}
                    <div className="space-y-1.5">
                      {roleRecords.map((rec, idx) => {
                        const isSelected = selectedRecord?.id === rec.id;
                        const sub = rec.paid_data?.doctorSubmission;
                        const isAcc = Boolean(sub?.isAcc);
                        const isSent = Boolean(sub?.isSentToDoctor);

                        return (
                          <div
                            key={rec.id}
                            onClick={() => handleSelectPatient(rec)}
                            className={`cursor-pointer grid grid-cols-12 items-center px-4 py-3.5 rounded-2xl transition-all ${
                              isSelected || idx === 1
                                ? 'bg-[#F3F5F9]'
                                : 'hover:bg-[#F3F5F9]/60'
                            }`}
                          >
                            {/* Col 1: Avatar + Name */}
                            <div className="col-span-5 flex items-center gap-3.5 min-w-0 pr-2">
                              <div
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-xs ${
                                  isAcc
                                    ? 'bg-[#C8FF29] text-[#111827]'
                                    : 'bg-[#121417] text-white'
                                }`}
                              >
                                {rec.child_name
                                  .split(' ')
                                  .slice(0, 2)
                                  .map((n) => n[0])
                                  .join('')}
                              </div>
                              <div className="truncate">
                                <p className="text-sm font-medium text-[#111827] truncate">
                                  {rec.child_name}
                                </p>
                                <p className="text-[11px] text-slate-400 truncate">
                                  Ibu {rec.mother_name} • {rec.age_text}
                                </p>
                              </div>
                            </div>

                            {/* Col 2: Date */}
                            <div className="col-span-3 text-xs sm:text-sm font-medium text-[#111827]">
                              {formatDateShort(sub?.sentAt || rec.created_at)}
                            </div>

                            {/* Col 3: Time / Status */}
                            <div className="col-span-2">
                              {isAcc ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#C8FF29] text-[#111827] px-2.5 py-0.5 text-[11px] font-bold">
                                  ✓ Di-ACC
                                </span>
                              ) : isSent ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[11px] font-semibold">
                                  Di Inbox
                                </span>
                              ) : (
                                <span className="text-xs font-medium text-slate-500">
                                  {formatTimeShort(rec.created_at)}
                                </span>
                              )}
                            </div>

                            {/* Col 4: Weight / Action */}
                            <div className="col-span-2 text-right">
                              <span
                                className={`text-xs sm:text-sm font-semibold ${
                                  rec.risk_level === 'BUTUH PERHATIAN KHUSUS'
                                    ? 'text-[#EF4444]'
                                    : 'text-[#111827]'
                                }`}
                              >
                                {rec.last_weight}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ============================================================= */}
            {/* RIGHT 4 COLUMNS ("My wallet" Card + "Friends and family" Card)*/}
            {/* ============================================================= */}
            <div className="xl:col-span-4 flex flex-col gap-6">
              {/* TOP RIGHT CARD: "My wallet" -> Kirim ke Dokter (Admin) / Editor Kolom & ACC (Dokter) */}
              <div className="rounded-[28px] bg-white p-6 sm:p-7 shadow-[0_4px_24px_rgba(15,23,42,0.025)] flex flex-col justify-between">
                <div>
                  {/* Header: "My wallet" + Arrow */}
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-[#111827]">
                      {role === 'dokter' ? 'Editor & ACC Dokter' : 'Kirim ke Dokter'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowSendOrInboxModal(true)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-[#111827] hover:bg-slate-50 transition"
                      title="Perbesar Kolom Editor Laporan"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Subtitle + Giant Metric ("Your balance" / "$63,773.90") */}
                  <p className="text-xs text-slate-400 mb-1">
                    {selectedRecord
                      ? `Pasien Aktif: ${selectedRecord.child_name} (${selectedRecord.age_text})`
                      : 'Pilih Pasien'}
                  </p>
                  <div className="text-3xl sm:text-[34px] font-bold tracking-tight text-[#111827] mb-5">
                    {selectedRecord
                      ? `${selectedRecord.last_weight} / ${selectedRecord.last_height}`
                      : '-'}
                  </div>

                  {/* 4 Rounded-Square Action Buttons (Download, Swap, Bag, Upload) */}
                  <div className="grid grid-cols-4 gap-2.5 mb-6">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedRecord) {
                          setReportColumnText(buildAutoDraftForDoctor(selectedRecord));
                        }
                      }}
                      title="Isi Otomatis Draf Laporan Pasien"
                      className="flex h-12 items-center justify-center rounded-2xl bg-[#F3F5F9] hover:bg-slate-200/80 text-[#111827] transition"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleSyncToSupabase}
                      title="Sync Realtime ke Supabase"
                      className="flex h-12 items-center justify-center rounded-2xl bg-[#F3F5F9] hover:bg-slate-200/80 text-[#111827] transition"
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFullDossierModal(true)}
                      title="Lihat 10 Bagian Rekam Medis Lengkap"
                      className="flex h-12 items-center justify-center rounded-2xl bg-[#F3F5F9] hover:bg-slate-200/80 text-[#111827] transition"
                    >
                      <ShoppingBag className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        role === 'dokter'
                          ? handleDoctorSaveAndAcc(true)
                          : handleAdminSendToDoctor()
                      }
                      title={
                        role === 'dokter'
                          ? 'Simpan & Beri Tanda ACC ✓'
                          : 'Kirim ke Inbox Dokter Sekarang'
                      }
                      className="flex h-12 items-center justify-center rounded-2xl bg-[#121417] hover:bg-slate-800 text-[#C8FF29] transition"
                    >
                      <Upload className="h-4 w-4" />
                    </button>
                  </div>

                  {/* "Spending in June" -> Neon Lime Pill Slider Track with Center Vertical-Dots Thumb */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs font-medium text-[#111827] mb-2">
                      <span>
                        {role === 'dokter'
                          ? 'Status Verifikasi & ACC Dokter'
                          : 'Pilih Pasien & Isi Kolom Laporan'}
                      </span>
                      <span className="font-bold">
                        {activeSub?.isAcc
                          ? '100% ACC ✓'
                          : activeSub?.isSentToDoctor
                          ? '50% Di Inbox'
                          : 'Draf Admin'}
                      </span>
                    </div>

                    {/* Neon Lime Slider Track matching Calescence */}
                    <div className="relative h-11 w-full rounded-full bg-[#F3F5F9] p-1 flex items-center">
                      <div
                        className="h-full rounded-full bg-[#C8FF29] transition-all duration-500"
                        style={{
                          width: activeSub?.isAcc
                            ? '100%'
                            : activeSub?.isSentToDoctor
                            ? '55%'
                            : '35%',
                        }}
                      />
                      <div
                        style={{
                          left: activeSub?.isAcc
                            ? 'calc(100% - 44px)'
                            : activeSub?.isSentToDoctor
                            ? 'calc(55% - 22px)'
                            : 'calc(35% - 22px)',
                        }}
                        className="absolute h-10 w-10 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center text-[#111827] transition-all duration-500"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  {/* Patient Selector (For Admin) + Editable Report Column (For both Admin & Dokter) */}
                  {role === 'admin' && (
                    <div className="mb-2.5">
                      <select
                        value={selectedRecord?.id || ''}
                        onChange={(e) => {
                          const found = allRecords.find((r) => r.id === e.target.value);
                          if (found) handleSelectPatient(found);
                        }}
                        className="w-full rounded-2xl bg-[#F3F5F9] px-3.5 py-2.5 text-xs font-bold text-[#111827] focus:outline-none"
                      >
                        {allRecords.map((r) => (
                          <option key={r.id} value={r.id}>
                            Pasien: {r.child_name} ({r.last_weight})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="mb-3">
                    <textarea
                      rows={4}
                      value={reportColumnText}
                      onChange={(e) => setReportColumnText(e.target.value)}
                      placeholder={
                        role === 'dokter'
                          ? 'Edit isi laporan pasien dari Admin di sini sebelum memberi tanda ACC...'
                          : 'Isi kolom laporan pasien yang akan dikirim ke Inbox Dokter...'
                      }
                      className="w-full rounded-2xl bg-[#F3F5F9] p-3.5 text-xs font-mono text-[#111827] leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#121417]"
                    />
                  </div>

                  {/* Primary Action Button (Kirim ke Dokter for Admin / Beri Tanda ACC for Dokter) */}
                  {role === 'admin' ? (
                    <button
                      type="button"
                      onClick={() => handleAdminSendToDoctor()}
                      disabled={isSyncingAction}
                      className="w-full rounded-full bg-[#121417] hover:bg-slate-800 text-white py-3 px-4 text-xs font-bold transition flex items-center justify-center gap-2 mb-4"
                    >
                      <Send className="h-3.5 w-3.5 text-[#C8FF29]" />
                      <span>
                        {isSyncingAction
                          ? 'Mengirim ke Dokter...'
                          : 'Kirim ke Dokter Sekarang'}
                      </span>
                    </button>
                  ) : (
                    <div className="flex gap-2 mb-4">
                      <button
                        type="button"
                        onClick={() => handleDoctorSaveAndAcc(true)}
                        disabled={isSyncingAction}
                        className="flex-1 rounded-full bg-[#C8FF29] hover:bg-[#b8f019] text-[#111827] py-3 px-3 text-xs font-extrabold transition flex items-center justify-center gap-1.5"
                      >
                        <CheckCheck className="h-4 w-4" />
                        <span>{activeSub?.isAcc ? 'Update & ACC ✓' : 'Beri Tanda ACC ✓'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDoctorSaveAndAcc(false)}
                        disabled={isSyncingAction}
                        className="rounded-full bg-[#121417] text-white py-3 px-4 text-xs font-bold transition"
                      >
                        Simpan
                      </button>
                    </div>
                  )}
                </div>

                {/* Bottom Pill Box ("$ 4,360.00 | ↗ 19%") */}
                <div className="rounded-2xl bg-[#F3F5F9] px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-[#111827] shadow-2xs">
                      {activeSub?.isAcc ? '✓' : '⏳'}
                    </span>
                    <span className="text-sm font-bold text-[#111827]">
                      {activeSub?.isAcc
                        ? 'SUDAH DI-ACC DOKTER'
                        : activeSub?.isSentToDoctor
                        ? 'Menunggu ACC Dokter'
                        : 'Belum Dikirim'}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                    ↗ Realtime
                  </span>
                </div>
              </div>

              {/* BOTTOM RIGHT CARD: "Friends and family" -> Status Tim Medis & Pasien */}
              <div className="rounded-[28px] bg-white p-6 sm:p-7 shadow-[0_4px_24px_rgba(15,23,42,0.025)] flex flex-col justify-between">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-semibold text-[#111827]">
                      Rekam Medis & Tim
                    </h2>
                    <p className="text-xs text-slate-400">
                      Riwayat sinkronisasi Admin & dr. Harys
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFullDossierModal(true)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-[#111827] hover:bg-slate-50 transition"
                    title="Buka Seluruh Data Pasien"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Big Number + Neon Lime Badge ("$4,263.90" + "+21.67%") */}
                <div className="flex items-center gap-3 my-3">
                  <span className="text-3xl font-bold tracking-tight text-[#111827]">
                    {anthropometry?.estimatedDailyCaloriesKcal || 1150}
                    <span className="text-slate-400 font-normal text-xl">
                      .kkal
                    </span>
                  </span>
                  <span className="rounded-full bg-[#C8FF29] px-2.5 py-0.5 text-[11px] font-bold text-[#111827]">
                    +{accCount}/{allRecords.length} ACC
                  </span>
                </div>

                {/* Overlapping Circular Avatars + Neon Lime "+2" Circle */}
                <div className="mt-2 rounded-full bg-[#F3F5F9] p-2.5 flex items-center justify-between">
                  <div className="flex items-center -space-x-2 overflow-hidden pl-1">
                    {allRecords.slice(0, 4).map((r, i) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleSelectPatient(r)}
                        title={r.child_name}
                        className={`h-10 w-10 rounded-full border-2 border-white flex items-center justify-center font-bold text-xs shadow-2xs transition hover:scale-105 ${
                          i % 2 === 0
                            ? 'bg-[#121417] text-white'
                            : 'bg-[#3B82F6] text-white'
                        }`}
                      >
                        {r.child_name
                          .split(' ')
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join('')}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowFullDossierModal(true)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C8FF29] text-xs font-extrabold text-[#111827] shadow-2xs hover:scale-105 transition"
                    title="Lihat Semua Rekam Medis Lengkap"
                  >
                    +{allRecords.length}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODAL 1: KIRIM KE DOKTER (ADMIN) / EDITOR INBOX PENUH (DOKTER)        */}
      {/* ===================================================================== */}
      {showSendOrInboxModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative my-8 w-full max-w-[820px] rounded-[32px] bg-white p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
              <div>
                <span className="inline-block rounded-full bg-[#C8FF29] px-3 py-0.5 text-[11px] font-bold text-[#111827] mb-1">
                  Realtime Sync Admin ↔ Dokter
                </span>
                <h3 className="text-xl font-bold text-[#111827]">
                  {role === 'dokter'
                    ? `Kotak Masuk Dokter — Edit & ACC Laporan (${selectedRecord.child_name})`
                    : `Kirim Laporan Pasien ke Dokter (${selectedRecord.child_name})`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSendOrInboxModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3F5F9] text-slate-700 hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {role === 'admin' && (
              <div className="mb-4">
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                  Pilih Pasien yang Akan Dikirim ke Dokter
                </label>
                <select
                  value={selectedRecord.id}
                  onChange={(e) => {
                    const found = allRecords.find((r) => r.id === e.target.value);
                    if (found) handleSelectPatient(found);
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-[#F3F5F9] px-4 py-3 text-sm font-bold text-[#111827]"
                >
                  {allRecords.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.child_name} ({r.age_text} — BB {r.last_weight}) [
                      {r.paid_data?.doctorSubmission?.isAcc
                        ? '✓ SUDAH DI-ACC'
                        : r.paid_data?.doctorSubmission?.isSentToDoctor
                        ? 'Di Inbox Dokter'
                        : 'Belum Dikirim'}
                      ]
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase text-slate-500">
                  Kolom Laporan Pasien (Diisi Admin & Dapat Diedit oleh dr. Harys Maulana)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setReportColumnText(buildAutoDraftForDoctor(selectedRecord))
                  }
                  className="text-xs font-bold text-[#3B82F6] hover:underline"
                >
                  ⚡ Isi Otomatis Draf Ringkasan
                </button>
              </div>
              <textarea
                rows={12}
                value={reportColumnText}
                onChange={(e) => setReportColumnText(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-[#F3F5F9] p-4 font-mono text-xs sm:text-sm text-[#111827] leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#121417]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-semibold text-slate-500">
                Status saat ini:{' '}
                <strong className="text-[#111827]">
                  {activeSub?.isAcc
                    ? `SUDAH DI-ACC ✓ (${formatDateShort(activeSub.accAt)})`
                    : activeSub?.isSentToDoctor
                    ? 'Terkirim di Inbox Dokter (Menunggu ACC)'
                    : 'Belum Dikirim'}
                </strong>
              </div>

              {role === 'admin' ? (
                <button
                  type="button"
                  onClick={async () => {
                    await handleAdminSendToDoctor();
                    setShowSendOrInboxModal(false);
                  }}
                  className="flex items-center gap-2 rounded-full bg-[#121417] text-white px-6 py-3 text-xs sm:text-sm font-bold"
                >
                  <Send className="h-4 w-4 text-[#C8FF29]" />
                  Kirim ke Dokter Sekarang
                </button>
              ) : (
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={async () => {
                      await handleDoctorSaveAndAcc(false);
                      setShowSendOrInboxModal(false);
                    }}
                    className="rounded-full border border-slate-300 px-5 py-3 text-xs font-bold text-[#111827]"
                  >
                    Simpan Editan (Belum ACC)
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await handleDoctorSaveAndAcc(true);
                      setShowSendOrInboxModal(false);
                    }}
                    className="flex items-center gap-2 rounded-full bg-[#C8FF29] text-[#111827] px-6 py-3 text-xs sm:text-sm font-extrabold"
                  >
                    <CheckCheck className="h-4 w-4" />
                    Simpan Editan & Beri Tanda ACC ✓
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: DETAIL LENGKAP REKAM MEDIS 10 BAGIAN (PASIEN, REPERTOIRE, DLL)*/}
      {/* ===================================================================== */}
      {showFullDossierModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative my-8 w-full max-w-[1050px] rounded-[32px] bg-white p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-100">
              <div>
                <span className="inline-block rounded-full bg-[#C8FF29] px-3 py-0.5 text-[11px] font-bold text-[#111827] mb-1">
                  Rekam Medis Lengkap • {selectedRecord.id}
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-[#111827]">
                  {selectedRecord.child_name} ({selectedRecord.age_text} • BB{' '}
                  {selectedRecord.last_weight} / TB {selectedRecord.last_height})
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowFullDossierModal(false);
                    setShowA4Modal(true);
                  }}
                  className="flex items-center gap-1.5 rounded-full bg-[#121417] text-white px-4 py-2 text-xs font-bold"
                >
                  <Printer className="h-3.5 w-3.5 text-[#C8FF29]" />
                  Cetak A4
                </button>
                <button
                  type="button"
                  onClick={() => setShowFullDossierModal(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3F5F9] text-slate-700 hover:bg-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* 6 Clinical Dossier Tabs */}
            <div className="flex flex-wrap gap-1.5 bg-[#F3F5F9] p-1.5 rounded-full mb-6">
              {[
                { id: 'pasien', label: '1. Data Pasien & Ortu' },
                { id: 'repertoire', label: '2. Repertoire Makanan' },
                { id: 'oralmotor', label: '3. Oral & Sensorik' },
                { id: 'foodrecall', label: '4. 24-Hour Recall' },
                { id: 'riwayatbb', label: '5. Riwayat BB & WHO' },
                { id: 'prompt', label: '6. Prompt HTML A4' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setDossierTab(t.id as any)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                    dossierTab === t.id
                      ? 'bg-[#121417] text-white'
                      : 'text-slate-600 hover:text-[#111827]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {dossierTab === 'pasien' && (
              <div className="space-y-4 text-xs sm:text-sm">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-2xl bg-[#F3F5F9] p-4">
                    <span className="text-slate-400 text-[11px] font-bold uppercase block">
                      Nama Anak & DOB
                    </span>
                    <strong className="text-[#111827]">
                      {selectedRecord.child_name} ({paidData.dob || '-'})
                    </strong>
                  </div>
                  <div className="rounded-2xl bg-[#F3F5F9] p-4">
                    <span className="text-slate-400 text-[11px] font-bold uppercase block">
                      Ibu & WhatsApp
                    </span>
                    <strong className="text-[#111827]">
                      {selectedRecord.mother_name} ({selectedRecord.phone})
                    </strong>
                  </div>
                  <div className="rounded-2xl bg-[#F3F5F9] p-4">
                    <span className="text-slate-400 text-[11px] font-bold uppercase block">
                      BB Lahir & Gestasi
                    </span>
                    <strong className="text-[#111827]">
                      {paidData.bbLahir || '-'} ({paidData.usiaGestasi || '-'})
                    </strong>
                  </div>
                  <div className="rounded-2xl bg-[#F3F5F9] p-4">
                    <span className="text-slate-400 text-[11px] font-bold uppercase block">
                      Alergi & Suplemen
                    </span>
                    <strong className="text-rose-700">
                      {paidData.alergiIntoleransi || 'Tidak ada'} •{' '}
                      {paidData.obatSuplemen || '-'}
                    </strong>
                  </div>
                </div>

                <div className="rounded-2xl bg-[#F3F5F9] p-4 space-y-2">
                  <span className="text-xs font-extrabold uppercase text-[#111827] block">
                    Cerita Kondisi & 3 Pertanyaan Orang Tua untuk dr. Harys Maulana:
                  </span>
                  <p className="text-slate-700">
                    {paidData.ceritaKondisi || selectedRecord.summary}
                  </p>
                  <div className="pt-2 space-y-1">
                    <p>
                      <strong>Q1:</strong> {paidData.pertanyaanDokter1 || '-'}
                    </p>
                    <p>
                      <strong>Q2:</strong> {paidData.pertanyaanDokter2 || '-'}
                    </p>
                    <p>
                      <strong>Q3:</strong> {paidData.pertanyaanDokter3 || '-'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {dossierTab === 'repertoire' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 space-y-2">
                  <h4 className="font-bold text-emerald-950">
                    Makanan yang MAU Dimakan ({paidData.jumlahJenisDiterima || '-'})
                  </h4>
                  {(paidData.repertoire || []).map((r, i) => (
                    <p key={i}>
                      <strong>{r.kategori}:</strong> {r.makananMau || '-'}
                    </p>
                  ))}
                </div>
                <div className="rounded-2xl bg-rose-50 border border-rose-200 p-5 space-y-2">
                  <h4 className="font-bold text-rose-950">
                    Makanan yang TIDAK MAU / Ditolak
                  </h4>
                  {(paidData.repertoire || []).map((r, i) => (
                    <p key={i}>
                      <strong>{r.kategori}:</strong> {r.makananTidakMau || '-'}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {dossierTab === 'oralmotor' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
                <div className="rounded-2xl bg-[#F3F5F9] p-5 space-y-2">
                  <h4 className="font-bold text-[#111827]">Oral Motor & Tekstur</h4>
                  <p>Tekstur: <strong>{(paidData.teksturDiterima || []).join(', ')}</strong></p>
                  <p>Mengunyah: <strong>{paidData.bisaMengunyah}</strong></p>
                  <p>Sering Gagging: <strong>{paidData.seringGagging}</strong></p>
                  <p>Pernah Tersedak: <strong>{paidData.pernahTersedak}</strong></p>
                  <p>Melepeh: <strong>{paidData.melepehMakanan}</strong></p>
                  <p>Mengemut Lama: <strong>{paidData.lamaDiMulut}</strong></p>
                </div>
                <div className="rounded-2xl bg-[#F3F5F9] p-5 space-y-2">
                  <h4 className="font-bold text-[#111827]">Perilaku Makan</h4>
                  <p>{(paidData.perilakuMakan || []).join(', ') || '-'}</p>
                </div>
                <div className="rounded-2xl bg-[#F3F5F9] p-5 space-y-2">
                  <h4 className="font-bold text-[#111827]">Faktor Sensorik</h4>
                  <p>{(paidData.alasanSensorik || []).join(', ') || '-'}</p>
                </div>
              </div>
            )}

            {dossierTab === 'foodrecall' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs sm:text-sm">
                <div className="rounded-2xl bg-[#F3F5F9] p-4">
                  <strong>01. Bangun Tidur</strong>
                  <p className="mt-1">{paidData.foodRecall?.bangunSusu || '-'}</p>
                </div>
                <div className="rounded-2xl bg-[#F3F5F9] p-4">
                  <strong>02. Sarapan</strong>
                  <p className="mt-1">
                    {paidData.foodRecall?.sarapanMenu} ({paidData.foodRecall?.sarapanPorsi})
                  </p>
                </div>
                <div className="rounded-2xl bg-[#F3F5F9] p-4">
                  <strong>03. Snack Pagi</strong>
                  <p className="mt-1">
                    {paidData.foodRecall?.snackPagiMenu} ({paidData.foodRecall?.snackPagiPorsi})
                  </p>
                </div>
                <div className="rounded-2xl bg-[#F3F5F9] p-4">
                  <strong>04. Makan Siang</strong>
                  <p className="mt-1">
                    {paidData.foodRecall?.makanSiangMenu} ({paidData.foodRecall?.makanSiangPorsi})
                  </p>
                </div>
                <div className="rounded-2xl bg-[#F3F5F9] p-4">
                  <strong>05. Snack Sore</strong>
                  <p className="mt-1">
                    {paidData.foodRecall?.snackSoreMenu} ({paidData.foodRecall?.snackSorePorsi})
                  </p>
                </div>
                <div className="rounded-2xl bg-[#F3F5F9] p-4">
                  <strong>06. Makan Malam</strong>
                  <p className="mt-1">
                    {paidData.foodRecall?.makanMalamMenu} ({paidData.foodRecall?.makanMalamPorsi})
                  </p>
                </div>
                <div className="rounded-2xl bg-[#F3F5F9] p-4 sm:col-span-2">
                  <strong>07. Sebelum Tidur</strong>
                  <p className="mt-1">{paidData.foodRecall?.susuSebelumTidur || '-'}</p>
                </div>
              </div>
            )}

            {dossierTab === 'riwayatbb' && (
              <div className="space-y-4 text-xs sm:text-sm">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="rounded-2xl bg-[#F3F5F9] p-4">
                    <span>BB 3 Bln Lalu</span>
                    <strong className="block text-lg mt-0.5">
                      {paidData.riwayatBB?.bb3BulanLalu || '-'}
                    </strong>
                  </div>
                  <div className="rounded-2xl bg-[#F3F5F9] p-4">
                    <span>BB 2 Bln Lalu</span>
                    <strong className="block text-lg mt-0.5">
                      {paidData.riwayatBB?.bb2BulanLalu || '-'}
                    </strong>
                  </div>
                  <div className="rounded-2xl bg-[#F3F5F9] p-4">
                    <span>BB 1 Bln Lalu</span>
                    <strong className="block text-lg mt-0.5">
                      {paidData.riwayatBB?.bb1BulanLalu || '-'}
                    </strong>
                  </div>
                  <div className="rounded-2xl bg-[#C8FF29] p-4">
                    <span>BB Sekarang</span>
                    <strong className="block text-lg mt-0.5">
                      {paidData.riwayatBB?.bbSekarang || selectedRecord.last_weight}
                    </strong>
                  </div>
                  <div className="rounded-2xl bg-[#F3F5F9] p-4">
                    <span>BB Stagnan?</span>
                    <strong className="block text-sm mt-0.5">
                      {paidData.riwayatBB?.bbStagnan || '-'}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {dossierTab === 'prompt' && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {PROMPT_SECTIONS.map((sec) => (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => setSelectedPromptSection(sec.id)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${
                        selectedPromptSection === sec.id
                          ? 'bg-[#121417] text-white'
                          : 'bg-[#F3F5F9] text-slate-700'
                      }`}
                    >
                      {sec.shortTitle}
                    </button>
                  ))}
                </div>
                <div className="rounded-2xl bg-[#121417] text-slate-100 p-4 font-mono text-xs max-h-[260px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap">
                    {selectedRecord.paid_data
                      ? generateSectionPrompt(
                          selectedPromptSection,
                          selectedRecord.paid_data,
                          selectedRecord.age_text
                        )
                      : ''}
                  </pre>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedRecord.paid_data) return;
                    await navigator.clipboard.writeText(
                      generateSectionPrompt(
                        selectedPromptSection,
                        selectedRecord.paid_data,
                        selectedRecord.age_text
                      )
                    );
                    setCopiedPrompt(true);
                    setTimeout(() => setCopiedPrompt(false), 2500);
                  }}
                  className="rounded-full bg-[#C8FF29] text-[#111827] px-5 py-2.5 text-xs font-extrabold"
                >
                  {copiedPrompt ? '✓ Berhasil Disalin!' : 'Salin Prompt HTML A4'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: SUPABASE SQL & CLIENT CODE                                   */}
      {/* ===================================================================== */}
      {showSupabaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative my-8 w-full max-w-[860px] rounded-[32px] bg-white p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-[#111827]">
                  Integrasi Supabase Rekam Medis (/rm)
                </h3>
                <p className="text-xs text-slate-400">{SUPABASE_URL}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSupabaseModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3F5F9]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSupabaseCodeTab('sql')}
                  className={`rounded-full px-4 py-2 text-xs font-bold ${
                    supabaseCodeTab === 'sql'
                      ? 'bg-[#121417] text-white'
                      : 'bg-[#F3F5F9] text-slate-700'
                  }`}
                >
                  1. Script SQL Supabase
                </button>
                <button
                  type="button"
                  onClick={() => setSupabaseCodeTab('ts')}
                  className={`rounded-full px-4 py-2 text-xs font-bold ${
                    supabaseCodeTab === 'ts'
                      ? 'bg-[#121417] text-white'
                      : 'bg-[#F3F5F9] text-slate-700'
                  }`}
                >
                  2. Kode TypeScript Client
                </button>
              </div>

              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(
                    supabaseCodeTab === 'sql'
                      ? SUPABASE_SQL_SETUP
                      : SUPABASE_CLIENT_CODE_SNIPPET
                  );
                  setCopiedSupabaseCode(true);
                  setTimeout(() => setCopiedSupabaseCode(false), 2500);
                }}
                className="rounded-full bg-[#C8FF29] text-[#111827] px-4 py-2 text-xs font-extrabold"
              >
                {copiedSupabaseCode ? '✓ Disalin!' : 'Salin Kode'}
              </button>
            </div>

            <div className="rounded-2xl bg-[#121417] text-slate-100 p-4 font-mono text-xs max-h-[400px] overflow-y-auto">
              <pre className="whitespace-pre-wrap">
                {supabaseCodeTab === 'sql'
                  ? SUPABASE_SQL_SETUP
                  : SUPABASE_CLIENT_CODE_SNIPPET}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 4: CETAK LAPORAN REKAM MEDIS A4                                 */}
      {/* ===================================================================== */}
      {showA4Modal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative my-8 w-full max-w-[840px] rounded-[32px] bg-white p-6 sm:p-10 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100 print:hidden">
              <h3 className="text-lg font-bold text-[#111827]">
                Laporan Rekam Medis A4 — {selectedRecord.child_name}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-full bg-[#121417] text-white px-4 py-2 text-xs font-bold"
                >
                  Cetak PDF A4
                </button>
                <button
                  type="button"
                  onClick={() => setShowA4Modal(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3F5F9]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mx-auto max-w-[210mm] rounded-2xl border border-slate-200 p-6 sm:p-10 text-xs leading-relaxed">
              <div className="flex items-center justify-between border-b-2 border-[#121417] pb-4 mb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={CLINIC_LOGO_URL}
                  alt="Logo"
                  className="h-12 w-auto object-contain"
                />
                <div className="text-right">
                  <strong className="text-sm block">
                    REKAM MEDIS ASESMEN LENGKAP • {selectedRecord.id}
                  </strong>
                  <span className="text-slate-500">
                    Status:{' '}
                    {activeSub?.isAcc
                      ? 'SUDAH DI-ACC DR. HARYS MAULANA ✓'
                      : 'Dalam Evaluasi'}
                  </span>
                </div>
              </div>

              <div className="whitespace-pre-line font-mono bg-[#F3F5F9] rounded-2xl p-5 mb-6">
                {reportColumnText || buildAutoDraftForDoctor(selectedRecord)}
              </div>

              <div className="flex items-end justify-between pt-4 border-t border-slate-200">
                <span className="text-slate-400">
                  Dicetak dari Sistem Rekam Medis Tumbuh Kembang Anak
                </span>
                <div className="text-right">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={CLINIC_LOGO_URL}
                    alt="Logo"
                    className="h-8 w-auto object-contain ml-auto mb-1"
                  />
                  <div className="w-44 border-b border-slate-800 mb-1 ml-auto" />
                  <strong className="text-sm block">dr. Harys Maulana</strong>
                  <span className="text-slate-500">Dokter</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
