'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Bell,
  Calendar,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowLeft,
  ArrowLeftRight,
  Home,
  Clock,
  LayoutGrid,
  Lock,
  Mail,
  Settings,
  LogOut,
  ChevronDown,
  Plus,
  Download,
  ShoppingBag,
  Upload,
  MoreVertical,
  Database,
  Copy,
  Check,
  X,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Trash2,
  RefreshCw,
  Send,
  Eye,
  ShieldCheck,
  Stethoscope,
  Utensils,
} from 'lucide-react';
import {
  CommunityAssessmentRecord,
  CommunityRecordStatus,
  fetchAllCommunityAssessments,
  updateCommunityAssessmentRecord,
  deleteCommunityAssessmentRecord,
  subscribeToCommunityUpdates,
  isUserSubmittedCommunityRecord,
  syncCommunityRecordsToSupabase,
} from '@/lib/community-storage';
import {
  FEEDING_RULES_MAP,
  FeedingRuleCode,
  LittleBiteCategoryName,
} from '@/lib/littlebite';
import {
  SUPABASE_COMMUNITY_SQL_SETUP,
  SUPABASE_COMMUNITY_CLIENT_CODE,
  SUPABASE_URL,
  getSupabaseClient,
} from '@/lib/supabase';

type CommunityRole = 'admin' | 'dokter';

const COMM_AUTH_STORAGE_KEY = 'tka_admincomm_auth_session_v1';
const COMM_ROLE_STORAGE_KEY = 'tka_admincomm_role_session_v1';

const CLINIC_LOGO_URL =
  'https://cdn.scalev.com/uploads/1791437257/QF6f43VbRyKhXQscT8CtjA/1791437253324-Frame-32-Photoroom-1.webp';

const ALL_CATEGORIES: LittleBiteCategoryName[] = [
  'Prioritas dokter',
  'Masalah aturan makan',
  'Selective eating',
  'Oral-motor atau tekstur',
  'Nafsu makan kecil, BB baik',
  'Pola makan sesuai',
];

const ALL_RULES_LIST: FeedingRuleCode[] = [
  'R1',
  'R2',
  'R3',
  'R4',
  'R5',
  'R6',
  'R7',
  'R8',
  'R9',
  'R10',
  'R11',
];

const TOP6_FUNNEL_RULES: FeedingRuleCode[] = ['R1', 'R2', 'R4', 'R6', 'R5', 'R8'];

function formatDateShort(isoString?: string): string {
  if (!isoString) return '24 Okt 2026';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '24 Okt 2026';
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
    return '24 Okt 2026';
  }
}

export default function AdminCommunityDashboardPage() {
  // =========================================================================
  // 1. AUTHENTICATION & ROLE SELECTION (Calescence Login Style)
  // =========================================================================
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [selectedLoginRole, setSelectedLoginRole] = useState<CommunityRole>('admin');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [role, setRole] = useState<CommunityRole>('admin');

  useEffect(() => {
    try {
      const savedAuth = sessionStorage.getItem(COMM_AUTH_STORAGE_KEY);
      const savedRole = sessionStorage.getItem(COMM_ROLE_STORAGE_KEY) as CommunityRole | null;
      if (savedAuth === 'true') {
        setIsAuthenticated(true);
        if (savedRole === 'admin' || savedRole === 'dokter') {
          setRole(savedRole);
          setSelectedLoginRole(savedRole);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = passwordInput.trim();
    if (trimmed === 'faceb00k' || trimmed === 'admin123' || trimmed === 'tka2026') {
      setIsAuthenticated(true);
      setRole(selectedLoginRole);
      setAuthError('');
      try {
        sessionStorage.setItem(COMM_AUTH_STORAGE_KEY, 'true');
        sessionStorage.setItem(COMM_ROLE_STORAGE_KEY, selectedLoginRole);
      } catch {
        // ignore
      }
    } else {
      setAuthError('Sandi salah! Masukkan sandi akses resmi untuk membuka /admincommunity.');
    }
  };

  const handleLogoutOrSwitchRole = () => {
    setIsAuthenticated(false);
    setPasswordInput('');
    setAuthError('');
    try {
      sessionStorage.removeItem(COMM_AUTH_STORAGE_KEY);
      sessionStorage.removeItem(COMM_ROLE_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  // =========================================================================
  // 2. DATA & REALTIME SYNC STATE (100% SEPARATE TABLE: public.community_assessments)
  // =========================================================================
  const [records, setRecords] = useState<CommunityAssessmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSupabaseSynced, setIsSupabaseSynced] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchBar, setShowSearchBar] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedRuleFilter, setSelectedRuleFilter] = useState<FeedingRuleCode | 'ALL'>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | '7D' | '30D'>('ALL');
  const [showAll11Bars, setShowAll11Bars] = useState<boolean>(false);
  const [activeNavTab, setActiveNavTab] = useState<
    'dashboard' | 'patients' | 'rules' | 'wa' | 'supabase'
  >('dashboard');

  // Active selected patient in workspace + modal state
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [detailTab, setDetailTab] = useState<
    'ringkasan' | 'aturan' | 'repertoire' | 'recall_bb' | '11bagian' | 'wa'
  >('ringkasan');
  const [doctorNotesDraft, setDoctorNotesDraft] = useState<string>('');
  const [statusDraft, setStatusDraft] = useState<CommunityRecordStatus>('Baru');
  const [isSavingReview, setIsSavingReview] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastBanner, setToastBanner] = useState<string | null>(null);

  // Supabase Modal
  const [showSupabaseModal, setShowSupabaseModal] = useState<boolean>(false);
  const [supabaseModalTab, setSupabaseModalTab] = useState<'sql' | 'client'>('sql');
  const [copiedCodeType, setCopiedCodeType] = useState<'sql' | 'client' | null>(null);
  const [dbTestStatus, setDbTestStatus] = useState<{
    testing: boolean;
    ok?: boolean;
    message?: string;
  }>({ testing: false });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetchAllCommunityAssessments();
      setRecords(res.records);
      setIsSupabaseSynced(res.fromSupabase);
      if (res.records.length > 0 && !activeRecordId) {
        const first = res.records[0];
        setActiveRecordId(first.id);
        setDoctorNotesDraft(first.reviewer_notes || '');
        setStatusDraft(first.status);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToCommunityUpdates(() => {
      fetchAllCommunityAssessments().then((res) => {
        setRecords(res.records);
        setIsSupabaseSynced(res.fromSupabase);
      });
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      if (selectedCategory !== 'ALL' && rec.category !== selectedCategory) {
        return false;
      }
      if (selectedStatus !== 'ALL' && rec.status !== selectedStatus) {
        return false;
      }
      if (selectedRuleFilter !== 'ALL' && !rec.violated_rules.includes(selectedRuleFilter)) {
        return false;
      }
      if (dateFilter !== 'ALL') {
        const days = dateFilter === '7D' ? 7 : 30;
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        if (new Date(rec.created_at).getTime() < cutoff) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = rec.child_name.toLowerCase().includes(q);
        const matchMom = rec.mother_name.toLowerCase().includes(q);
        const matchId = rec.id.toLowerCase().includes(q);
        const matchDomisili = (rec.domisili || '').toLowerCase().includes(q);
        const matchCat = rec.category.toLowerCase().includes(q);
        const matchRules = rec.violated_rules.some((r) => r.toLowerCase() === q);
        if (!matchName && !matchMom && !matchId && !matchDomisili && !matchCat && !matchRules) {
          return false;
        }
      }
      return true;
    });
  }, [records, selectedCategory, selectedStatus, selectedRuleFilter, dateFilter, searchQuery]);

  const selectedRecord = useMemo(() => {
    if (!filteredRecords.length && !records.length) return null;
    return (
      filteredRecords.find((r) => r.id === activeRecordId) ||
      records.find((r) => r.id === activeRecordId) ||
      filteredRecords[0] ||
      records[0]
    );
  }, [filteredRecords, records, activeRecordId]);

  const handleSelectPatient = (rec: CommunityAssessmentRecord, openModal = false) => {
    setActiveRecordId(rec.id);
    setDoctorNotesDraft(rec.reviewer_notes || '');
    setStatusDraft(rec.status);
    if (openModal) {
      setDetailTab('ringkasan');
      setShowDetailModal(true);
    }
  };

  const handleSaveDoctorReview = async () => {
    if (!selectedRecord) return;
    setIsSavingReview(true);
    try {
      const updatedList = await updateCommunityAssessmentRecord(selectedRecord.id, {
        status: statusDraft,
        reviewer_notes: doctorNotesDraft,
      });
      setRecords(updatedList);
      setToastBanner(
        `✓ Review & Template WA untuk "${selectedRecord.child_name}" berhasil diperbarui!`
      );
      setTimeout(() => setToastBanner(null), 4000);
    } finally {
      setIsSavingReview(false);
    }
  };

  const handleQuickStatusChange = async (id: string, nextStatus: CommunityRecordStatus) => {
    const updatedList = await updateCommunityAssessmentRecord(id, { status: nextStatus });
    setRecords(updatedList);
    if (selectedRecord?.id === id) {
      setStatusDraft(nextStatus);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    const updatedList = await deleteCommunityAssessmentRecord(id);
    setRecords(updatedList);
    if (selectedRecord?.id === id) {
      setShowDetailModal(false);
    }
  };

  const handleCopyText = async (text: string, idKey: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(idKey);
      setToastBanner('✓ Teks berhasil disalin ke clipboard!');
      setTimeout(() => {
        setCopiedId(null);
        setToastBanner(null);
      }, 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopySupabaseCode = async (type: 'sql' | 'client') => {
    const content =
      type === 'sql' ? SUPABASE_COMMUNITY_SQL_SETUP : SUPABASE_COMMUNITY_CLIENT_CODE;
    try {
      await navigator.clipboard.writeText(content);
      setCopiedCodeType(type);
      setTimeout(() => setCopiedCodeType(null), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestSupabaseTable = async () => {
    setDbTestStatus({ testing: true });
    const supabase = getSupabaseClient();
    if (!supabase) {
      setDbTestStatus({
        testing: false,
        ok: false,
        message: 'Supabase client tidak tersedia di browser.',
      });
      return;
    }
    try {
      const { count, error } = await supabase
        .from('community_assessments')
        .select('*', { count: 'exact', head: true });

      if (error) {
        setDbTestStatus({
          testing: false,
          ok: false,
          message: `Tabel public.community_assessments belum dibuat atau RLS belum aktif (${error.message}). Silakan jalankan SQL di bawah pada Supabase SQL Editor.`,
        });
      } else {
        setDbTestStatus({
          testing: false,
          ok: true,
          message: `Terhubung ke public.community_assessments! (${count ?? 0} baris tersimpan di cloud Supabase).`,
        });
        setIsSupabaseSynced(true);
      }
    } catch (err) {
      setDbTestStatus({
        testing: false,
        ok: false,
        message: err instanceof Error ? err.message : 'Gagal menghubungi Supabase.',
      });
    }
  };

  const handleSyncAllToSupabase = async () => {
    setDbTestStatus({ testing: true });
    const res = await syncCommunityRecordsToSupabase(records);
    if (res.success) {
      setDbTestStatus({
        testing: false,
        ok: true,
        message: `Berhasil menyinkronkan ${res.syncedCount} data pasien /community ke tabel public.community_assessments di Supabase!`,
      });
      setIsSupabaseSynced(true);
      setToastBanner(`✓ Berhasil sinkronisasi ${res.syncedCount} data ke Supabase!`);
      setTimeout(() => setToastBanner(null), 4000);
    } else {
      setDbTestStatus({
        testing: false,
        ok: false,
        message: `Gagal sinkronisasi ke public.community_assessments (${res.error}). Pastikan SQL Schema di bawah sudah dijalankan di Supabase SQL Editor.`,
      });
    }
  };

  // Analytics & KPI calculations
  const kpiStats = useMemo(() => {
    const total = records.length;
    const priorityDoctorCount = records.filter((r) => r.category === 'Prioritas dokter').length;
    const redFlagCount = records.filter((r) => r.has_red_flags).length;
    const newCount = records.filter((r) => r.status === 'Baru').length;
    const selesaiCount = records.filter((r) => r.status === 'Selesai').length;
    const homeMainCauseCount = records.filter((r) => r.home_feeding_is_likely_main_cause).length;
    const totalViolationsSum = records.reduce((acc, r) => acc + r.total_violated_count, 0);
    const avgViolated = total > 0 ? (totalViolationsSum / total).toFixed(1) : '0.0';

    const ruleCounts: Record<FeedingRuleCode, number> = {
      R1: 0,
      R2: 0,
      R3: 0,
      R4: 0,
      R5: 0,
      R6: 0,
      R7: 0,
      R8: 0,
      R9: 0,
      R10: 0,
      R11: 0,
    };
    for (const rec of records) {
      for (const code of rec.violated_rules) {
        if (ruleCounts[code] !== undefined) {
          ruleCounts[code] += 1;
        }
      }
    }

    return {
      total,
      priorityDoctorCount,
      redFlagCount,
      newCount,
      selesaiCount,
      homeMainCauseCount,
      avgViolated,
      ruleCounts,
    };
  }, [records]);

  // Bars for Feeding Rules Funnel (Calescence Striped Vertical Pill Bars)
  const funnelBars = useMemo(() => {
    const codes = showAll11Bars ? ALL_RULES_LIST : TOP6_FUNNEL_RULES;
    const maxVal = Math.max(1, ...codes.map((c) => kpiStats.ruleCounts[c]));
    let peakCode: FeedingRuleCode = codes[0];
    for (const c of codes) {
      if (kpiStats.ruleCounts[c] >= kpiStats.ruleCounts[peakCode]) {
        peakCode = c;
      }
    }
    const activeCode = selectedRuleFilter !== 'ALL' ? selectedRuleFilter : peakCode;

    return codes.map((code) => {
      const count = kpiStats.ruleCounts[code];
      const heightPct = Math.max(26, Math.round((count / maxVal) * 100));
      const isHighlighted = code === activeCode;
      return {
        code,
        count,
        heightPct,
        isHighlighted,
        shortLabel: code,
        title: FEEDING_RULES_MAP[code].targetTitle,
      };
    });
  }, [kpiStats, showAll11Bars, selectedRuleFilter]);

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'ID Rekam',
      'Tanggal',
      'Status',
      'Nama Anak',
      'Usia',
      'Gender',
      'BB Terakhir',
      'TB Terakhir',
      'Nama Ibu',
      'WhatsApp Ibu',
      'Domisili',
      'Kategori Hasil',
      'Red Flag',
      'Jumlah Aturan Terlanggar',
      'Kode Aturan Terlanggar',
      '3 Koreksi Prioritas',
      'Rekomendasi Paket',
      'Catatan Dokter',
    ];

    const rows = filteredRecords.map((rec) => [
      rec.id,
      new Date(rec.created_at).toLocaleString('id-ID'),
      rec.status,
      rec.child_name,
      rec.age_text,
      rec.gender,
      rec.last_weight,
      rec.last_height,
      rec.mother_name,
      rec.phone,
      rec.domisili,
      rec.category,
      rec.has_red_flags ? rec.red_flag_labels.join('; ') : 'Tidak ada',
      String(rec.total_violated_count),
      rec.violated_rules.join(', '),
      rec.top3_priority_codes.join(', '),
      rec.recommended_package,
      (rec.reviewer_notes || '').replace(/\n/g, ' '),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `admincommunity-assessments-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // =========================================================================
  // LOGIN GATE (100% CALESCENCE UI STYLE MATCHING /rm & /admin)
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
                  AdminCommunity
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  Portal Evaluasi 11 Bagian & Feeding Rules
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
            Pilih role Anda terlebih dahulu, lalu masukkan sandi keamanan <strong>/admincommunity</strong>.
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
                <p className="text-base font-bold">Admin Community</p>
                <p
                  className={`text-xs mt-1 leading-relaxed ${
                    selectedLoginRole === 'admin' ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  Kelola pasien <strong>/community</strong>, funnel R1–R11 & kirim WA.
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
                <p className="text-base font-bold">Reviewer / Dokter</p>
                <p className="text-xs mt-1 leading-relaxed text-[#111827]/80">
                  Review kasus <strong>Red Flag</strong>, 3 pertanyaan dokter & catatan klinis.
                </p>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Sandi Keamanan (/admincommunity)
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
                {selectedLoginRole === 'dokter' ? 'Reviewer Dokter' : 'Admin Community'}
              </span>
              <ArrowUpRight className="h-4 w-4 text-[#C8FF29]" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MAIN CALESCENCE DASHBOARD UI (100% UNIFIED STYLE WITH /rm & /admin)
  // =========================================================================
  const topThreeStack = filteredRecords.slice(0, 3);
  const compliancePct = selectedRecord
    ? Math.max(
        15,
        Math.round(((11 - selectedRecord.total_violated_count) / 11) * 100)
      )
    : 75;

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
                className="rounded-full px-3 py-1 text-[11px] font-semibold text-slate-600 hover:text-[#111827] transition"
              >
                /rm
              </Link>
              <Link
                href="/admincommunity"
                className="rounded-full bg-[#121417] px-3 py-1 text-[11px] font-bold text-[#C8FF29] shadow-2xs"
              >
                /admincommunity
              </Link>
            </div>
          </div>

          {/* Center: 5 Navigation Links with Active Black Pill */}
          <nav className="flex flex-wrap items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveNavTab('dashboard')}
              className={`rounded-full px-5 py-2.5 text-xs sm:text-sm font-medium transition-all ${
                activeNavTab === 'dashboard'
                  ? 'bg-[#121417] text-white'
                  : 'text-slate-600 hover:text-[#111827]'
              }`}
            >
              Dashbord
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveNavTab('patients');
                setDetailTab('11bagian');
                setShowDetailModal(true);
              }}
              className={`rounded-full px-4 py-2.5 text-xs sm:text-sm font-medium transition-all ${
                activeNavTab === 'patients'
                  ? 'bg-[#121417] text-white'
                  : 'text-slate-600 hover:text-[#111827]'
              }`}
            >
              Detail 11 Bagian
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveNavTab('rules');
                setDetailTab('aturan');
                setShowDetailModal(true);
              }}
              className={`rounded-full px-4 py-2.5 text-xs sm:text-sm font-medium transition-all ${
                activeNavTab === 'rules'
                  ? 'bg-[#121417] text-white'
                  : 'text-slate-600 hover:text-[#111827]'
              }`}
            >
              Feeding Rules (R1–R11)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveNavTab('wa');
                setDetailTab('wa');
                setShowDetailModal(true);
              }}
              className={`rounded-full px-4 py-2.5 text-xs sm:text-sm font-medium transition-all ${
                activeNavTab === 'wa'
                  ? 'bg-[#121417] text-white'
                  : 'text-slate-600 hover:text-[#111827]'
              }`}
            >
              Template WA
            </button>
            <button
              type="button"
              onClick={() => setShowSupabaseModal(true)}
              className="rounded-full px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-[#111827] transition-all"
            >
              Supabase
            </button>
          </nav>

          {/* Right: Search Circle, Notification Bell Circle, User Avatar + Chevron */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowSearchBar((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-[#F8FAFC] text-slate-700 hover:bg-slate-100 transition"
              title="Cari Pasien /community"
            >
              <Search className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() =>
                setSelectedCategory((prev) =>
                  prev === 'Prioritas dokter' ? 'ALL' : 'Prioritas dokter'
                )
              }
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-[#F8FAFC] text-slate-700 hover:bg-slate-100 transition"
              title="Filter Prioritas Dokter & Red Flag"
            >
              <Bell className="h-4 w-4" />
              {kpiStats.priorityDoctorCount > 0 && (
                <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-[#EF4444]" />
              )}
            </button>

            <button
              type="button"
              onClick={handleLogoutOrSwitchRole}
              title="Klik untuk Ganti Role atau Keluar"
              className="flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 hover:bg-slate-100 transition"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-[#121417] to-slate-700 text-[#C8FF29] font-bold text-xs shadow-2xs">
                {role === 'dokter' ? 'dr' : 'CM'}
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
              placeholder="Cari nama anak, nama ibu, domisili, kategori, atau kode R1-R11..."
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
        {/* 2. GREETING ROW ("<- Hello, ..." + Filter + Date Pill + Action)   */}
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
            <div>
              <h1 className="text-3xl sm:text-[38px] font-medium tracking-tight text-[#111827] leading-none">
                {role === 'dokter' ? 'Hello, dr. Harys' : 'Hello, Admin Community'}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Data khusus <strong>/community</strong> (10 Bagian Asesmen + Feeding Rules R1–R11) • Terpisah dari /rm
              </p>
            </div>
          </div>

          {/* Right: Sliders Circle + Date Range Pill + Export / Action Pill */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowDetailModal(true)}
              title="Buka Detail 11 Bagian Pasien"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300/80 bg-transparent text-[#111827] hover:bg-white transition"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2.5 rounded-full border border-slate-300/80 bg-transparent px-4 py-2 text-xs sm:text-sm font-medium text-[#111827]">
              <Calendar className="h-4 w-4 text-slate-600" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as 'ALL' | '7D' | '30D')}
                className="bg-transparent font-medium text-[#111827] focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Waktu ({records.length})</option>
                <option value="7D">7 Hari Terakhir</option>
                <option value="30D">30 Hari Terakhir</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-2 rounded-full border border-slate-300/80 bg-transparent hover:bg-[#121417] hover:text-white hover:border-[#121417] px-5 py-2.5 text-xs sm:text-sm font-medium text-[#111827] transition"
            >
              <Plus className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
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
                onClick={() => setActiveNavTab('dashboard')}
                title="Beranda Dashboard Community"
                className="flex h-11 w-11 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-[#111827] transition"
              >
                <Home className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setDetailTab('recall_bb');
                  setShowDetailModal(true);
                }}
                title="24-Hour Food Recall & Riwayat BB"
                className="flex h-11 w-11 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-[#111827] transition"
              >
                <Clock className="h-5 w-5" />
              </button>

              {/* Active Dark Circle Icon with Neon Lime Accent */}
              <button
                type="button"
                onClick={() => {
                  setDetailTab('11bagian');
                  setShowDetailModal(true);
                }}
                title="Detail Lengkap 11 Bagian Pasien"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#121417] text-[#C8FF29] shadow-sm transition"
              >
                <LayoutGrid className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setDetailTab('aturan');
                  setShowDetailModal(true);
                }}
                title="Evaluasi 11 Aturan Makan (R1–R11)"
                className="flex h-11 w-11 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-[#111827] transition"
              >
                <Lock className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={handleSyncAllToSupabase}
                title="Sinkronisasi Realtime ke Supabase (public.community_assessments)"
                className="flex h-11 w-11 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-[#111827] transition"
              >
                <ArrowLeftRight className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setDetailTab('wa');
                  setShowDetailModal(true);
                }}
                title="Template Pesan WhatsApp Ibu"
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
              {/* TOP ROW: "Pasien Community" Stacked Card (5 Cols) + "Feeding Rules Funnel" Card (7 Cols) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* CARD A: 3 Overlapping Stacked Cards (Black, Neon Lime, White) */}
                <div className="md:col-span-5 rounded-[28px] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.025)] flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold text-[#111827]">
                      Pasien /Community
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowDetailModal(true)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-[#111827] hover:bg-slate-50 transition"
                      title="Lihat Detail 11 Bagian"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>

                  {/* 3 Overlapping Stacked Folder-Tab Cards */}
                  <div className="flex flex-col">
                    {topThreeStack.map((rec, index) => {
                      const isSelected = selectedRecord?.id === rec.id;

                      if (index === 0) {
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
                                  <p className="text-xs text-slate-400 truncate">
                                    Ibu {rec.mother_name}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-semibold text-white">
                                  {rec.last_weight}
                                </p>
                                <p className="text-[11px] text-[#C8FF29] font-semibold">
                                  {rec.total_violated_count}/11 Rules
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (index === 1) {
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
                                  <p className="text-xs text-[#111827]/70 truncate">
                                    Ibu {rec.mother_name}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-semibold text-[#111827]">
                                  {rec.last_weight}
                                </p>
                                <p className="text-[11px] text-[#111827]/80 font-semibold">
                                  {rec.total_violated_count}/11 Rules
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }

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
                                <p className="text-xs text-slate-400 truncate">
                                  Ibu {rec.mother_name}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold text-[#111827]">
                                {rec.last_weight}
                              </p>
                              <p className="text-[11px] text-slate-400 font-semibold">
                                {rec.total_violated_count}/11 Rules
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* CARD B: Feeding Rules Funnel (6 or 11 Rounded Vertical Striped Pill Bars on Dashed Grid) */}
                <div className="md:col-span-7 rounded-[28px] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.025)] flex flex-col justify-between">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700">
                        <Utensils className="h-4 w-4" />
                      </div>
                      <div>
                        <h2 className="text-base font-semibold text-[#111827]">
                          Feeding Rules Funnel (R1–R11)
                        </h2>
                        <p className="text-[11px] text-slate-400">
                          Klik bar untuk filter pasien yang melanggar aturan tersebut
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center rounded-full bg-[#F3F5F9] p-1">
                        <button
                          type="button"
                          onClick={() => setShowAll11Bars(false)}
                          className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                            !showAll11Bars
                              ? 'bg-[#3B82F6] text-white shadow-2xs'
                              : 'text-slate-600'
                          }`}
                        >
                          Top 6
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAll11Bars(true)}
                          className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                            showAll11Bars
                              ? 'bg-[#3B82F6] text-white shadow-2xs'
                              : 'text-slate-600'
                          }`}
                        >
                          R1–R11
                        </button>
                      </div>

                      {selectedRuleFilter !== 'ALL' && (
                        <button
                          type="button"
                          onClick={() => setSelectedRuleFilter('ALL')}
                          className="rounded-full bg-[#121417] text-[#C8FF29] px-3 py-1.5 text-xs font-bold"
                        >
                          {selectedRuleFilter} ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Chart Area with Y-Axis Labels + Dashed Horizontal Lines + Striped Pill Bars */}
                  <div className="relative pt-2 pb-1">
                    <div className="flex items-end gap-3 sm:gap-4 h-[210px]">
                      {/* Y-Axis Labels */}
                      <div className="flex flex-col justify-between h-full text-xs font-medium text-slate-400 pb-6 pr-1 select-none tabular-nums">
                        <span>{ Math.max(4, records.length) }</span>
                        <span>{ Math.max(3, Math.round(records.length * 0.75)) }</span>
                        <span>{ Math.max(2, Math.round(records.length * 0.5)) }</span>
                        <span>1</span>
                        <span>0</span>
                      </div>

                      {/* Grid + Bars Container */}
                      <div className="relative flex-1 h-full flex flex-col justify-between pb-6">
                        {[0, 1, 2, 3, 4].map((lineIdx) => (
                          <div
                            key={lineIdx}
                            className="w-full border-b border-dashed border-slate-200"
                          />
                        ))}

                        {/* Rounded Pill Bars Overlaid */}
                        <div className="absolute inset-x-0 bottom-6 top-0 flex items-end justify-around px-1 sm:px-2 gap-1.5 sm:gap-3">
                          {funnelBars.map((bar) => (
                            <button
                              key={bar.code}
                              type="button"
                              onClick={() =>
                                setSelectedRuleFilter((prev) =>
                                  prev === bar.code ? 'ALL' : bar.code
                                )
                              }
                              title={`${bar.code}: ${bar.title} (${bar.count} anak perlu koreksi)`}
                              className="flex flex-col items-center justify-end h-full flex-1 max-w-[46px] group focus:outline-none"
                            >
                              <span
                                className={`mb-1 text-[10px] font-bold transition ${
                                  bar.isHighlighted
                                    ? 'text-[#111827] opacity-100'
                                    : 'text-slate-500 opacity-0 group-hover:opacity-100'
                                }`}
                              >
                                {bar.count}
                              </span>
                              <div
                                style={{
                                  height: `${bar.heightPct}%`,
                                  backgroundImage:
                                    'repeating-linear-gradient(135deg, rgba(255,255,255,0.16) 0px, rgba(255,255,255,0.16) 6px, transparent 6px, transparent 12px)',
                                }}
                                className={`w-full rounded-full transition-all duration-500 ${
                                  bar.isHighlighted
                                    ? 'bg-[#1D7AFC] shadow-[0_6px_20px_rgba(29,122,252,0.35)]'
                                    : 'bg-[#67A8FF] hover:bg-[#4B96FF]'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* X-Axis Labels */}
                    <div className="flex items-center justify-around pl-7 pr-1 sm:pr-2 text-xs font-medium text-slate-500">
                      {funnelBars.map((bar) => (
                        <span
                          key={bar.code}
                          className={`flex-1 text-center ${
                            bar.isHighlighted ? 'font-bold text-[#111827]' : ''
                          }`}
                        >
                          {bar.shortLabel}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTTOM WIDE CARD: Daftar Pasien Asesmen /Community */}
              <div className="rounded-[28px] bg-white p-6 sm:p-7 shadow-[0_4px_24px_rgba(15,23,42,0.025)]">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-[#111827]">
                      Daftar Pasien Asesmen /Community ({filteredRecords.length})
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Klik baris pasien untuk mengedit review di panel kanan atau membuka Detail 11 Bagian
                    </p>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-[#111827] focus:outline-none"
                    >
                      <option value="ALL">Semua Kategori ({records.length})</option>
                      {ALL_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>

                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-[#111827] focus:outline-none"
                    >
                      <option value="ALL">Semua Status</option>
                      <option value="Baru">Baru</option>
                      <option value="Dalam Review">Dalam Review</option>
                      <option value="Selesai">Selesai</option>
                      <option value="Follow-Up">Follow-Up</option>
                    </select>

                    <button
                      type="button"
                      onClick={loadData}
                      title="Refresh Data"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Calescence Table */}
                {filteredRecords.length === 0 ? (
                  <div className="rounded-2xl bg-[#F3F5F9] p-10 text-center space-y-2">
                    <ClipboardList className="h-8 w-8 text-slate-400 mx-auto" />
                    <p className="text-sm font-bold text-[#111827]">
                      Tidak ada data pasien /community yang sesuai filter
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('ALL');
                        setSelectedStatus('ALL');
                        setSelectedRuleFilter('ALL');
                        setDateFilter('ALL');
                      }}
                      className="rounded-full bg-[#121417] text-[#C8FF29] px-4 py-2 text-xs font-bold"
                    >
                      Reset Semua Filter
                    </button>
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto">
                    <div className="min-w-[680px]">
                      {/* Table Header */}
                      <div className="grid grid-cols-12 px-4 pb-3 text-xs font-medium text-slate-400">
                        <div className="col-span-4">Nama Pasien & Ibu</div>
                        <div className="col-span-3">Kategori & Paket</div>
                        <div className="col-span-2">Pelanggaran</div>
                        <div className="col-span-3 text-right">Status & Aksi</div>
                      </div>

                      {/* Table Rows */}
                      <div className="space-y-1.5">
                        {filteredRecords.map((rec) => {
                          const isSelected = selectedRecord?.id === rec.id;
                          const isUserEntry = isUserSubmittedCommunityRecord(rec.id);
                          const cleanPhone = rec.phone
                            .replace(/[^0-9]/g, '')
                            .replace(/^0/, '62');
                          const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                            rec.whatsapp_template
                          )}`;

                          return (
                            <div
                              key={rec.id}
                              onClick={() => handleSelectPatient(rec)}
                              className={`cursor-pointer grid grid-cols-12 items-center px-4 py-3.5 rounded-2xl transition-all ${
                                isSelected
                                  ? 'bg-[#F3F5F9] ring-1 ring-slate-200'
                                  : 'hover:bg-[#F3F5F9]/60'
                              }`}
                            >
                              {/* Col 1: Avatar + Name */}
                              <div className="col-span-4 flex items-center gap-3.5 min-w-0 pr-2">
                                <div
                                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-xs ${
                                    rec.status === 'Selesai' || isUserEntry
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
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-sm font-semibold text-[#111827] truncate">
                                      {rec.child_name}
                                    </p>
                                    {rec.has_red_flags && (
                                      <span className="rounded-full bg-rose-100 text-rose-700 px-2 py-0.5 text-[10px] font-bold">
                                        Red Flag
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-400 truncate">
                                    Ibu {rec.mother_name} • {rec.age_text} • {rec.last_weight}
                                  </p>
                                </div>
                              </div>

                              {/* Col 2: Category & Date */}
                              <div className="col-span-3 pr-2">
                                <span
                                  className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                    rec.category === 'Prioritas dokter'
                                      ? 'bg-[#121417] text-[#C8FF29]'
                                      : rec.category === 'Pola makan sesuai'
                                      ? 'bg-[#C8FF29] text-[#111827]'
                                      : 'bg-slate-100 text-[#111827]'
                                  }`}
                                >
                                  {rec.category}
                                </span>
                                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                                  {formatDateShort(rec.created_at)}
                                </p>
                              </div>

                              {/* Col 3: Violated Rules */}
                              <div className="col-span-2 pr-2">
                                <div className="flex flex-wrap gap-1">
                                  {rec.violated_rules.length === 0 ? (
                                    <span className="text-[11px] font-bold text-emerald-700">
                                      11/11 Sesuai
                                    </span>
                                  ) : (
                                    rec.violated_rules.slice(0, 3).map((code) => (
                                      <span
                                        key={code}
                                        className="rounded-md bg-[#121417] text-[#C8FF29] px-1.5 py-0.5 font-mono text-[10px] font-bold"
                                      >
                                        {code}
                                      </span>
                                    ))
                                  )}
                                  {rec.violated_rules.length > 3 && (
                                    <span className="text-[10px] font-bold text-slate-500">
                                      +{rec.violated_rules.length - 3}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                                  {rec.total_violated_count}/11 koreksi
                                </p>
                              </div>

                              {/* Col 4: Status & Actions */}
                              <div
                                className="col-span-3 flex items-center justify-end gap-1.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <select
                                  value={rec.status}
                                  onChange={(e) =>
                                    handleQuickStatusChange(
                                      rec.id,
                                      e.target.value as CommunityRecordStatus
                                    )
                                  }
                                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold focus:outline-none cursor-pointer ${
                                    rec.status === 'Selesai'
                                      ? 'bg-[#C8FF29] text-[#111827]'
                                      : rec.status === 'Baru'
                                      ? 'bg-[#121417] text-white'
                                      : 'bg-white border border-slate-200 text-[#111827]'
                                  }`}
                                >
                                  <option value="Baru">Baru</option>
                                  <option value="Dalam Review">Review</option>
                                  <option value="Selesai">Selesai</option>
                                  <option value="Follow-Up">Follow-Up</option>
                                </select>

                                <button
                                  type="button"
                                  onClick={() => handleSelectPatient(rec, true)}
                                  title="Buka Detail 11 Bagian"
                                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#121417] text-white hover:bg-slate-800 transition"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>

                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Kirim Hasil Review ke WhatsApp Ibu"
                                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C8FF29] text-[#111827] hover:bg-[#b8f019] transition"
                                >
                                  <Send className="h-3.5 w-3.5" />
                                </a>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecord(rec.id)}
                                  title="Hapus Data"
                                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-rose-600 transition"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ============================================================= */}
            {/* RIGHT 4 COLUMNS ("Review & WA" Card + "Matriks R1-R11" Card)  */}
            {/* ============================================================= */}
            <div className="xl:col-span-4 flex flex-col gap-6">
              {/* TOP RIGHT CARD: Calescence "My wallet" Style -> Review & Template WA */}
              <div className="rounded-[28px] bg-white p-6 sm:p-7 shadow-[0_4px_24px_rgba(15,23,42,0.025)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-[#111827]">
                      Review & Template WA
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowDetailModal(true)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-[#111827] hover:bg-slate-50 transition"
                      title="Buka Detail Lengkap 11 Bagian"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 mb-1">
                    {selectedRecord
                      ? `Pasien Aktif: ${selectedRecord.child_name} (Ibu ${selectedRecord.mother_name})`
                      : 'Pilih Pasien'}
                  </p>
                  <div className="text-3xl sm:text-[34px] font-bold tracking-tight text-[#111827] mb-5">
                    {selectedRecord
                      ? `${selectedRecord.last_weight} / ${selectedRecord.last_height}`
                      : '-'}
                  </div>

                  {/* 4 Rounded-Square Action Buttons */}
                  <div className="grid grid-cols-4 gap-2.5 mb-6">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedRecord) {
                          handleCopyText(
                            selectedRecord.whatsapp_template,
                            `wa-${selectedRecord.id}`
                          );
                        }
                      }}
                      title="Salin Template Pesan WhatsApp"
                      className="flex h-12 items-center justify-center rounded-2xl bg-[#F3F5F9] hover:bg-slate-200/80 text-[#111827] transition"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleSyncAllToSupabase}
                      title="Sync Realtime ke Supabase"
                      className="flex h-12 items-center justify-center rounded-2xl bg-[#F3F5F9] hover:bg-slate-200/80 text-[#111827] transition"
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDetailTab('11bagian');
                        setShowDetailModal(true);
                      }}
                      title="Lihat 11 Bagian Lengkap"
                      className="flex h-12 items-center justify-center rounded-2xl bg-[#F3F5F9] hover:bg-slate-200/80 text-[#111827] transition"
                    >
                      <ShoppingBag className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedRecord) return;
                        const cleanPhone = selectedRecord.phone
                          .replace(/[^0-9]/g, '')
                          .replace(/^0/, '62');
                        window.open(
                          `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                            selectedRecord.whatsapp_template
                          )}`,
                          '_blank'
                        );
                      }}
                      title="Kirim ke WhatsApp Ibu"
                      className="flex h-12 items-center justify-center rounded-2xl bg-[#121417] hover:bg-slate-800 text-[#C8FF29] transition"
                    >
                      <Upload className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Neon Lime Slider Track matching Calescence */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs font-medium text-[#111827] mb-2">
                      <span>Kepatuhan 11 Feeding Rules</span>
                      <span className="font-bold">
                        {selectedRecord
                          ? `${11 - selectedRecord.total_violated_count}/11 Sesuai (${compliancePct}%)`
                          : '-'}
                      </span>
                    </div>

                    <div className="relative h-11 w-full rounded-full bg-[#F3F5F9] p-1 flex items-center">
                      <div
                        className="h-full rounded-full bg-[#C8FF29] transition-all duration-500"
                        style={{ width: `${compliancePct}%` }}
                      />
                      <div
                        style={{
                          left: `calc(${Math.min(92, Math.max(12, compliancePct))}% - 20px)`,
                        }}
                        className="absolute h-10 w-10 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center text-[#111827] transition-all duration-500"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  {/* Patient Selector */}
                  <div className="mb-2.5">
                    <select
                      value={selectedRecord?.id || ''}
                      onChange={(e) => {
                        const found = records.find((r) => r.id === e.target.value);
                        if (found) handleSelectPatient(found);
                      }}
                      className="w-full rounded-2xl bg-[#F3F5F9] px-3.5 py-2.5 text-xs font-bold text-[#111827] focus:outline-none"
                    >
                      {records.map((r) => (
                        <option key={r.id} value={r.id}>
                          Pasien: {r.child_name} — Ibu {r.mother_name} ({r.total_violated_count}/11 koreksi)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Reviewer Notes Editor */}
                  <div className="mb-3">
                    <textarea
                      rows={4}
                      value={doctorNotesDraft}
                      onChange={(e) => setDoctorNotesDraft(e.target.value)}
                      placeholder="Tulis catatan klinis dr. Harys Maulana / Reviewer untuk Ibu (otomatis masuk ke Template WA)..."
                      className="w-full rounded-2xl bg-[#F3F5F9] p-3.5 text-xs font-mono text-[#111827] leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#121417]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveDoctorReview}
                    disabled={isSavingReview}
                    className="w-full rounded-full bg-[#121417] hover:bg-slate-800 text-white py-3 px-4 text-xs font-bold transition flex items-center justify-center gap-2 mb-4"
                  >
                    <Send className="h-3.5 w-3.5 text-[#C8FF29]" />
                    <span>
                      {isSavingReview
                        ? 'Menyimpan Review...'
                        : 'Simpan Review & Perbarui Template WA'}
                    </span>
                  </button>
                </div>

                {/* Bottom Pill Box */}
                <div className="rounded-2xl bg-[#F3F5F9] px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-[#111827] shadow-2xs">
                      {selectedRecord?.has_red_flags ? '!' : '✓'}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-[#111827] truncate">
                      {selectedRecord?.category || 'Siap Evaluasi'}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 shrink-0">
                    ↗ Realtime
                  </span>
                </div>
              </div>

              {/* BOTTOM RIGHT CARD: Calescence "Friends and family" Style -> Ringkasan & Matriks R1-R11 */}
              <div className="rounded-[28px] bg-white p-6 sm:p-7 shadow-[0_4px_24px_rgba(15,23,42,0.025)] flex flex-col justify-between">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-semibold text-[#111827]">
                      Prioritas & Aturan Makan
                    </h2>
                    <p className="text-xs text-slate-400">
                      Rata-rata {kpiStats.avgViolated}/11 aturan perlu koreksi
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailTab('aturan');
                      setShowDetailModal(true);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-[#111827] hover:bg-slate-50 transition"
                    title="Lihat Tabel 11 Aturan"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Big Number + Neon Lime Badge */}
                <div className="flex items-center gap-3 my-2">
                  <span className="text-3xl font-bold tracking-tight text-[#111827]">
                    {kpiStats.priorityDoctorCount}
                    <span className="text-slate-400 font-normal text-xl">
                      /{kpiStats.total} Prioritas
                    </span>
                  </span>
                  <span className="rounded-full bg-[#C8FF29] px-2.5 py-0.5 text-[11px] font-bold text-[#111827]">
                    {kpiStats.redFlagCount} Red Flag
                  </span>
                </div>

                {/* Quick Filter Pills for R1..R11 */}
                <div className="flex flex-wrap gap-1.5 my-3">
                  {ALL_RULES_LIST.map((code) => {
                    const active = selectedRuleFilter === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() =>
                          setSelectedRuleFilter((prev) => (prev === code ? 'ALL' : code))
                        }
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                          active
                            ? 'bg-[#121417] text-[#C8FF29]'
                            : 'bg-[#F3F5F9] text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {code} ({kpiStats.ruleCounts[code]})
                      </button>
                    );
                  })}
                </div>

                {/* Overlapping Circular Avatars + Neon Lime "+N" Circle */}
                <div className="mt-2 rounded-full bg-[#F3F5F9] p-2.5 flex items-center justify-between">
                  <div className="flex items-center -space-x-2 overflow-hidden pl-1">
                    {records.slice(0, 4).map((r, i) => (
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
                    onClick={() => setShowDetailModal(true)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C8FF29] text-xs font-extrabold text-[#111827] shadow-2xs hover:scale-105 transition"
                    title="Lihat Detail Lengkap"
                  >
                    +{records.length}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODAL 1: DETAIL LENGKAP 11 BAGIAN & FEEDING RULES (/COMMUNITY)        */}
      {/* ===================================================================== */}
      {showDetailModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative my-8 w-full max-w-[1050px] rounded-[32px] bg-white p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-100">
              <div>
                <span className="inline-block rounded-full bg-[#C8FF29] px-3 py-0.5 text-[11px] font-bold text-[#111827] mb-1">
                  Asesmen /Community • {selectedRecord.id} • {selectedRecord.category}
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-[#111827]">
                  {selectedRecord.child_name} ({selectedRecord.age_text} • BB{' '}
                  {selectedRecord.last_weight} / TB {selectedRecord.last_height})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ibu {selectedRecord.mother_name} ({selectedRecord.phone}) •{' '}
                  {selectedRecord.domisili || '-'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleCopyText(selectedRecord.whatsapp_template, 'modal-top-wa')
                  }
                  className="flex items-center gap-1.5 rounded-full bg-[#121417] text-white px-4 py-2 text-xs font-bold"
                >
                  <Copy className="h-3.5 w-3.5 text-[#C8FF29]" />
                  <span>
                    {copiedId === 'modal-top-wa' ? 'Tersalin!' : 'Salin Template WA'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3F5F9] text-slate-700 hover:bg-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* 6 Clinical Dossier Tabs */}
            <div className="flex flex-wrap gap-1.5 bg-[#F3F5F9] p-1.5 rounded-full mb-6">
              {[
                { id: 'ringkasan', label: '1. Ringkasan & Prioritas' },
                { id: 'aturan', label: '2. Evaluasi R1–R11' },
                { id: 'repertoire', label: '3. Repertoire & Oral' },
                { id: 'recall_bb', label: '4. 24h Recall & Riwayat BB' },
                { id: '11bagian', label: '5. Jawaban 11 Bagian' },
                { id: 'wa', label: '6. Template WhatsApp' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setDetailTab(t.id as any)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                    detailTab === t.id
                      ? 'bg-[#121417] text-white'
                      : 'text-slate-600 hover:text-[#111827]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* TAB 1: RINGKASAN & CATATAN DOKTER */}
            {detailTab === 'ringkasan' && (
              <div className="space-y-5 text-xs sm:text-sm">
                {selectedRecord.has_red_flags && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-sm text-rose-800">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Gejala Red Flag Terdeteksi (Prioritas Dokter)</span>
                    </div>
                    <ul className="list-disc list-inside text-xs space-y-1">
                      {selectedRecord.red_flag_labels.map((rf, i) => (
                        <li key={i}>{rf}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-[#121417] text-white">
                    <span className="text-xs text-slate-400">Kategori Hasil</span>
                    <div className="text-lg font-bold text-[#C8FF29] mt-1">
                      {selectedRecord.category}
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      {selectedRecord.evaluation_result.categoryReason}
                    </p>
                  </div>
                  <div className="p-5 rounded-2xl bg-[#F3F5F9]">
                    <span className="text-xs text-slate-500">Langkah Lanjut</span>
                    <div className="text-sm font-bold text-[#111827] mt-1">
                      {selectedRecord.next_step}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Aturan perlu koreksi: {selectedRecord.total_violated_count} dari 11
                    </p>
                  </div>
                  <div className="p-5 rounded-2xl bg-[#F3F5F9]">
                    <span className="text-xs text-slate-500">Rekomendasi Paket</span>
                    <div className="text-sm font-bold text-[#111827] mt-1">
                      {selectedRecord.recommended_package}
                    </div>
                  </div>
                </div>

                {/* 3 Koreksi Prioritas */}
                <div className="space-y-2.5">
                  <h4 className="text-sm font-bold text-[#111827]">
                    3 Koreksi Prioritas Minggu Ini
                  </h4>
                  <div className="grid grid-cols-1 gap-2.5">
                    {selectedRecord.evaluation_result.top3PriorityCorrections.map(
                      (item, idx) => (
                        <div
                          key={item.code}
                          className="p-4 rounded-2xl bg-[#F3F5F9] space-y-1"
                        >
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="px-2.5 py-0.5 rounded-full bg-[#121417] text-[#C8FF29] font-mono">
                              Prioritas #{idx + 1} • {item.code}
                            </span>
                            <span className="text-slate-500">
                              Pemicu: {item.triggers.join(' | ')}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm font-semibold text-[#111827] pt-1">
                            {item.definition.parentCorrectionText}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Keluhan & 3 Pertanyaan Dokter */}
                <div className="rounded-2xl bg-[#F3F5F9] p-5 space-y-2">
                  <h4 className="font-bold text-[#111827]">
                    Keluhan Utama, Cerita Kondisi & 3 Pertanyaan untuk dr. Harys Maulana
                  </h4>
                  <p>
                    <strong>Keluhan Utama:</strong>{' '}
                    {(selectedRecord.form_data.keluhanUtama || []).join(', ') || '-'}
                  </p>
                  <p>
                    <strong>Cerita Kondisi:</strong>{' '}
                    {selectedRecord.form_data.ceritaKondisi || '-'}
                  </p>
                  <div className="pt-1 space-y-1">
                    <p>
                      <strong>Q1:</strong> {selectedRecord.form_data.pertanyaanDokter1 || '-'}
                    </p>
                    <p>
                      <strong>Q2:</strong> {selectedRecord.form_data.pertanyaanDokter2 || '-'}
                    </p>
                    <p>
                      <strong>Q3:</strong> {selectedRecord.form_data.pertanyaanDokter3 || '-'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: EVALUASI 11 ATURAN (R1-R11) */}
            {detailTab === 'aturan' && (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#121417] text-white font-bold">
                    <tr>
                      <th className="p-3.5 w-16">Kode</th>
                      <th className="p-3.5">Aturan Target</th>
                      <th className="p-3.5 w-32">Status</th>
                      <th className="p-3.5">Pemicu & Kalimat Koreksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {ALL_RULES_LIST.map((code) => {
                      const st = selectedRecord.evaluation_result.ruleStatuses[code];
                      return (
                        <tr key={code} className="hover:bg-slate-50">
                          <td className="p-3.5 font-mono font-bold text-[#111827]">
                            {code}
                          </td>
                          <td className="p-3.5 font-medium text-slate-800">
                            {st.definition.targetTitle}
                          </td>
                          <td className="p-3.5">
                            {st.status === 'Sesuai' ? (
                              <span className="px-2.5 py-1 rounded-full bg-[#C8FF29] text-[#111827] font-bold">
                                Sesuai
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-[#121417] text-[#C8FF29] font-bold">
                                Perlu koreksi
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-slate-600">
                            {st.status === 'Perlu koreksi' ? (
                              <div>
                                <div className="font-semibold text-[#111827]">
                                  {st.definition.parentCorrectionText}
                                </div>
                                <div className="text-[11px] text-rose-600 mt-0.5">
                                  Pemicu: {st.triggers.join(' · ')}
                                </div>
                              </div>
                            ) : (
                              <span className="text-emerald-700">
                                {st.definition.positiveSummaryText}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 3: REPERTOIRE MAKANAN & ORAL MOTOR */}
            {detailTab === 'repertoire' && (
              <div className="space-y-4 text-xs sm:text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 space-y-2">
                    <h4 className="font-bold text-emerald-950">
                      Makanan yang MAU Dimakan ({selectedRecord.form_data.jumlahJenisDiterima || '-'})
                    </h4>
                    {(selectedRecord.form_data.repertoire || []).map((r, i) => (
                      <p key={i}>
                        <strong>{r.kategori}:</strong> {r.makananMau || '-'}
                      </p>
                    ))}
                  </div>
                  <div className="rounded-2xl bg-rose-50 border border-rose-200 p-5 space-y-2">
                    <h4 className="font-bold text-rose-950">
                      Makanan yang TIDAK MAU / Ditolak
                    </h4>
                    {(selectedRecord.form_data.repertoire || []).map((r, i) => (
                      <p key={i}>
                        <strong>{r.kategori}:</strong> {r.makananTidakMau || '-'}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-2xl bg-[#F3F5F9] p-5 space-y-1.5">
                    <h4 className="font-bold text-[#111827]">Oral Motor & Tekstur</h4>
                    <p>
                      Tekstur:{' '}
                      <strong>
                        {(selectedRecord.form_data.teksturDiterima || []).join(', ') || '-'}
                      </strong>
                    </p>
                    <p>Mengunyah: <strong>{selectedRecord.form_data.bisaMengunyah}</strong></p>
                    <p>Sering Gagging: <strong>{selectedRecord.form_data.seringGagging}</strong></p>
                    <p>Pernah Tersedak: <strong>{selectedRecord.form_data.pernahTersedak}</strong></p>
                    <p>Melepeh: <strong>{selectedRecord.form_data.melepehMakanan}</strong></p>
                    <p>Mengemut Lama: <strong>{selectedRecord.form_data.lamaDiMulut}</strong></p>
                  </div>
                  <div className="rounded-2xl bg-[#F3F5F9] p-5 space-y-1.5">
                    <h4 className="font-bold text-[#111827]">Perilaku Saat Makan</h4>
                    <p>{(selectedRecord.form_data.perilakuMakan || []).join(', ') || '-'}</p>
                  </div>
                  <div className="rounded-2xl bg-[#F3F5F9] p-5 space-y-1.5">
                    <h4 className="font-bold text-[#111827]">Faktor Sensorik</h4>
                    <p>{(selectedRecord.form_data.alasanSensorik || []).join(', ') || '-'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: 24-HOUR FOOD RECALL & RIWAYAT BB */}
            {detailTab === 'recall_bb' && (
              <div className="space-y-5 text-xs sm:text-sm">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-2xl bg-[#F3F5F9] p-4">
                    <strong>01. Bangun Tidur</strong>
                    <p className="mt-1">{selectedRecord.form_data.foodRecall?.bangunSusu || '-'}</p>
                  </div>
                  <div className="rounded-2xl bg-[#F3F5F9] p-4">
                    <strong>02. Sarapan</strong>
                    <p className="mt-1">
                      {selectedRecord.form_data.foodRecall?.sarapanMenu} (
                      {selectedRecord.form_data.foodRecall?.sarapanPorsi})
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#F3F5F9] p-4">
                    <strong>03. Snack Pagi</strong>
                    <p className="mt-1">
                      {selectedRecord.form_data.foodRecall?.snackPagiMenu} (
                      {selectedRecord.form_data.foodRecall?.snackPagiPorsi})
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#F3F5F9] p-4">
                    <strong>04. Makan Siang</strong>
                    <p className="mt-1">
                      {selectedRecord.form_data.foodRecall?.makanSiangMenu} (
                      {selectedRecord.form_data.foodRecall?.makanSiangPorsi})
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#F3F5F9] p-4">
                    <strong>05. Snack Sore</strong>
                    <p className="mt-1">
                      {selectedRecord.form_data.foodRecall?.snackSoreMenu} (
                      {selectedRecord.form_data.foodRecall?.snackSorePorsi})
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#F3F5F9] p-4">
                    <strong>06. Makan Malam</strong>
                    <p className="mt-1">
                      {selectedRecord.form_data.foodRecall?.makanMalamMenu} (
                      {selectedRecord.form_data.foodRecall?.makanMalamPorsi})
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#F3F5F9] p-4 sm:col-span-2">
                    <strong>07. Sebelum Tidur</strong>
                    <p className="mt-1">
                      {selectedRecord.form_data.foodRecall?.susuSebelumTidur || '-'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="rounded-2xl bg-[#F3F5F9] p-4">
                    <span>BB 3 Bln Lalu</span>
                    <strong className="block text-lg mt-0.5">
                      {selectedRecord.form_data.riwayatBB?.bb3BulanLalu || '-'}
                    </strong>
                  </div>
                  <div className="rounded-2xl bg-[#F3F5F9] p-4">
                    <span>BB 2 Bln Lalu</span>
                    <strong className="block text-lg mt-0.5">
                      {selectedRecord.form_data.riwayatBB?.bb2BulanLalu || '-'}
                    </strong>
                  </div>
                  <div className="rounded-2xl bg-[#F3F5F9] p-4">
                    <span>BB 1 Bln Lalu</span>
                    <strong className="block text-lg mt-0.5">
                      {selectedRecord.form_data.riwayatBB?.bb1BulanLalu || '-'}
                    </strong>
                  </div>
                  <div className="rounded-2xl bg-[#C8FF29] p-4">
                    <span>BB Sekarang</span>
                    <strong className="block text-lg mt-0.5">
                      {selectedRecord.last_weight}
                    </strong>
                  </div>
                  <div className="rounded-2xl bg-[#F3F5F9] p-4">
                    <span>BB Stagnan?</span>
                    <strong className="block text-sm mt-0.5">
                      {selectedRecord.form_data.riwayatBB?.bbStagnan || '-'}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: JAWABAN LENGKAP 11 BAGIAN */}
            {detailTab === '11bagian' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-[#F3F5F9] space-y-1.5">
                  <div className="font-bold text-[#111827] text-sm">
                    Bagian 1 & 2 — Data Ibu & Riwayat Anak
                  </div>
                  <div>
                    Ibu: <strong>{selectedRecord.form_data.namaIbu}</strong> (
                    {selectedRecord.form_data.waIbu}) • {selectedRecord.form_data.domisili || '-'}
                  </div>
                  <div>
                    Kelahiran: {selectedRecord.form_data.statusKelahiran} (
                    {selectedRecord.form_data.usiaKehamilanMinggu} mgg) • BB Lahir{' '}
                    {selectedRecord.form_data.bbLahir} kg
                  </div>
                  <div>
                    Alergi: {selectedRecord.form_data.adaAlergi} (
                    {selectedRecord.form_data.pemicuAlergi || '-'})
                  </div>
                  <div>
                    Penyakit Penyerta: {selectedRecord.form_data.penyakitPenyertaRawatInap || '-'}
                  </div>
                  <div>
                    Obat/Suplemen Rutin: {selectedRecord.form_data.obatSuplemenRutin || '-'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#F3F5F9] space-y-1.5">
                  <div className="font-bold text-[#111827] text-sm">
                    Bagian 3 — Susu & Minum (Aturan R8)
                  </div>
                  <div>
                    Minuman utama: {selectedRecord.form_data.q3a_minumanUtama.join(', ')}
                  </div>
                  <div>
                    Total 24 jam: {selectedRecord.form_data.q3b_totalSusu24Jam}{' '}
                    {selectedRecord.form_data.q3b_satuanSusu}
                  </div>
                  <div>Cara pemberian: {selectedRecord.form_data.q3c_caraMinumSusu}</div>
                  <div>
                    Waktu pemberian: {selectedRecord.form_data.q3d_waktuMinumSusu.join(', ')}
                  </div>
                  <div>Air putih/hari: {selectedRecord.form_data.q3e_gelasAirPutih} gelas</div>
                  <div>
                    Minuman manis/kemasan: {selectedRecord.form_data.q3f_minumanManisKemasan}
                  </div>
                  <div>
                    Minum banyak saat makan: {selectedRecord.form_data.q3g_minumBanyakSaatMakan}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#F3F5F9] space-y-1.5 md:col-span-2">
                  <div className="font-bold text-[#111827] text-sm">
                    Bagian 11 — Detail Evaluasi Feeding Rules (R1–R11)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      Makan utama: {selectedRecord.form_data.q6_1_frekuensiMakanUtama} | Selingan:{' '}
                      {selectedRecord.form_data.q6_2_frekuensiSelingan}
                    </div>
                    <div>
                      Jam makan sama: {selectedRecord.form_data.q6_3_jamMakanSama} | Jeda:{' '}
                      {selectedRecord.form_data.q6_4_jedaTerpendek}
                    </div>
                    <div>Durasi makan: {selectedRecord.form_data.q6_5_durasiMakan}</div>
                    <div>
                      Lokasi: {selectedRecord.form_data.q6_6_lokasiCaraMakan.join(', ')}
                    </div>
                    <div>
                      Pendamping/Layar: {selectedRecord.form_data.q6_7_pendampingMakan.join(', ')}
                    </div>
                    <div>
                      Respon menolak:{' '}
                      {selectedRecord.form_data.q6_8_responMenolakMakan.join(', ')}
                    </div>
                    <div>Kemandirian: {selectedRecord.form_data.q6_9_kemandirianMakan}</div>
                    <div>
                      Pengasuh: {selectedRecord.form_data.q6_10_pengasuhMenyuapi.join(', ')} (
                      {selectedRecord.form_data.q6_10_konsistensiAturan})
                    </div>
                    <div>
                      Makan bersama keluarga:{' '}
                      {selectedRecord.form_data.q6_11_makanBersamaKeluarga}
                    </div>
                    <div>
                      Tawaran menu baru: {selectedRecord.form_data.q6_12_tawaranMakananBaru} |
                      Porsi: {selectedRecord.form_data.q6_13_porsiDisajikan}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: TEMPLATE PESAN WHATSAPP */}
            {detailTab === 'wa' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-[#111827]">
                      Template Pesan Hasil Review (WhatsApp)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Siap disalin atau dikirim langsung ke WhatsApp Ibu{' '}
                      {selectedRecord.mother_name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(selectedRecord.whatsapp_template, 'modal-wa-copy')
                    }
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#C8FF29] text-[#111827] text-xs font-extrabold"
                  >
                    {copiedId === 'modal-wa-copy' ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Salin Teks WA</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-5 rounded-2xl bg-[#121417] text-slate-100 text-xs sm:text-sm font-mono whitespace-pre-wrap leading-relaxed">
                  {selectedRecord.whatsapp_template}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: SUPABASE SQL & CLIENT CODE KHUSUS /ADMINCOMMUNITY            */}
      {/* ===================================================================== */}
      {showSupabaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative my-8 w-full max-w-[860px] rounded-[32px] bg-white p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div>
                <span className="inline-block rounded-full bg-[#C8FF29] px-3 py-0.5 text-[11px] font-bold text-[#111827] mb-1">
                  Database Terpisah • public.community_assessments
                </span>
                <h3 className="text-lg font-bold text-[#111827]">
                  Integrasi Supabase /community & /admincommunity
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
                  onClick={() => setSupabaseModalTab('sql')}
                  className={`rounded-full px-4 py-2 text-xs font-bold ${
                    supabaseModalTab === 'sql'
                      ? 'bg-[#121417] text-white'
                      : 'bg-[#F3F5F9] text-slate-700'
                  }`}
                >
                  1. Script SQL Supabase
                </button>
                <button
                  type="button"
                  onClick={() => setSupabaseModalTab('client')}
                  className={`rounded-full px-4 py-2 text-xs font-bold ${
                    supabaseModalTab === 'client'
                      ? 'bg-[#121417] text-white'
                      : 'bg-[#F3F5F9] text-slate-700'
                  }`}
                >
                  2. Kode TypeScript Client
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestSupabaseTable}
                  disabled={dbTestStatus.testing}
                  className="rounded-full bg-[#F3F5F9] hover:bg-slate-200 px-4 py-2 text-xs font-bold text-[#111827]"
                >
                  {dbTestStatus.testing ? 'Memproses...' : 'Tes Koneksi'}
                </button>
                <button
                  type="button"
                  onClick={handleSyncAllToSupabase}
                  disabled={dbTestStatus.testing}
                  className="rounded-full bg-[#121417] text-white px-4 py-2 text-xs font-bold"
                >
                  Sync {records.length} Data
                </button>
                <button
                  type="button"
                  onClick={() => handleCopySupabaseCode(supabaseModalTab)}
                  className="rounded-full bg-[#C8FF29] text-[#111827] px-4 py-2 text-xs font-extrabold"
                >
                  {copiedCodeType === supabaseModalTab ? '✓ Disalin!' : 'Salin Kode'}
                </button>
              </div>
            </div>

            {dbTestStatus.message && (
              <div
                className={`mb-4 rounded-2xl px-4 py-3 text-xs font-semibold flex items-center gap-2 ${
                  dbTestStatus.ok
                    ? 'bg-[#C8FF29]/40 text-[#111827]'
                    : 'bg-amber-50 text-amber-900 border border-amber-200'
                }`}
              >
                {dbTestStatus.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span>{dbTestStatus.message}</span>
              </div>
            )}

            <div className="rounded-2xl bg-[#121417] text-slate-100 p-4 font-mono text-xs max-h-[400px] overflow-y-auto">
              <pre className="whitespace-pre-wrap">
                {supabaseModalTab === 'sql'
                  ? SUPABASE_COMMUNITY_SQL_SETUP
                  : SUPABASE_COMMUNITY_CLIENT_CODE}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
