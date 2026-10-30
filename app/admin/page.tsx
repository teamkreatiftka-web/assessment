'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  Bell,
  SlidersHorizontal,
  ArrowLeft,
  Calendar,
  Share2,
  Grid,
  Users,
  PieChart,
  Layers,
  Award,
  Settings,
  Download,
  ExternalLink,
  Copy,
  Check,
  Printer,
  Edit3,
  Trash2,
  X,
  FileText,
  Sparkles,
  CheckCircle2,
  Activity,
  Lock,
  Database,
  RefreshCw,
  Stethoscope,
} from 'lucide-react';
import { ScreeningRecord, ScreeningStatus } from '@/types/screening';
import {
  fetchAllScreenings,
  updateRecordDetails,
  deleteRecord,
  syncRecordsToSupabase,
} from '@/lib/storage';
import {
  supabase,
  SUPABASE_URL,
  SUPABASE_SQL_SETUP,
} from '@/lib/supabase';
import {
  generateSectionPrompt,
  MasterPromptSection,
  PROMPT_SECTIONS,
} from '@/lib/generateMasterPrompt';

type ActiveTab = 'Dashboard' | 'Pasien' | 'Analitik' | 'MasterPrompt' | 'Pengaturan';
type TypeFilter = 'all' | 'paid' | 'free';

export default function AdminDashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);
  const [modeRole, setModeRole] = useState<'admin' | 'analyst'>('admin');

  const [records, setRecords] = useState<ScreeningRecord[]>([]);
  const [fromSupabase, setFromSupabase] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [activeTab, setActiveTab] = useState<ActiveTab>('Dashboard');
  const [selectedPromptSection, setSelectedPromptSection] = useState<MasterPromptSection>('all');

  const [selectedRecord, setSelectedRecord] = useState<ScreeningRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [clinicalNotes, setClinicalNotes] = useState('');
  const [recordStatus, setRecordStatus] = useState<ScreeningStatus>('Baru');
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchAllScreenings();
      const data = res.records;
      setRecords(data);
      setFromSupabase(res.fromSupabase);
      if (data.length > 0 && !selectedRecord) {
        setSelectedRecord(data[0]);
        setClinicalNotes(data[0].clinical_notes || '');
        setRecordStatus(data[0].status || 'Baru');
      } else if (selectedRecord) {
        const updated = data.find((r) => r.id === selectedRecord.id);
        if (updated) {
          setSelectedRecord(updated);
          setClinicalNotes(updated.clinical_notes || '');
          setRecordStatus(updated.status || 'Baru');
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedRecord]);

  useEffect(() => {
    const savedAuth = sessionStorage.getItem('tka_admin_auth');
    const savedRole = sessionStorage.getItem('tka_admin_role') as 'admin' | 'analyst';
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
      if (savedRole) setModeRole(savedRole);
    }
    loadData();

    const channel = supabase
      .channel('admin_screenings_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'screenings' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const handleSelectRecord = (rec: ScreeningRecord) => {
    setSelectedRecord(rec);
    setClinicalNotes(rec.clinical_notes || '');
    setRecordStatus(rec.status || 'Baru');
    setSaveSuccess(false);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'faceb00k' || passwordInput === 'admin123' || passwordInput === 'tka2026') {
      setIsAuthenticated(true);
      sessionStorage.setItem('tka_admin_auth', 'true');
      sessionStorage.setItem('tka_admin_role', modeRole);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  const handleSaveReview = async () => {
    if (!selectedRecord) return;
    setIsSavingReview(true);
    setSaveSuccess(false);
    await updateRecordDetails(selectedRecord.id, {
      clinical_notes: clinicalNotes,
      status: recordStatus,
    });
    await loadData();
    setIsSavingReview(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleDelete = async (id: string) => {
    await deleteRecord(id);
    if (selectedRecord?.id === id) {
      setSelectedRecord(null);
      setShowDetailModal(false);
    }
    await loadData();
  };

  const getPromptForRecord = (rec: ScreeningRecord, section: MasterPromptSection = 'all') => {
    if (rec.paid_data) {
      return generateSectionPrompt(section, rec.paid_data, rec.age_text);
    }
    return `RINGKASAN SKRINING GRATIS (/assessment)
ID Rekam Medis: ${rec.id}
Nama Anak: ${rec.child_name} (${rec.age_text}, ${rec.gender})
Nama Ibu: ${rec.mother_name}
No WhatsApp: ${rec.phone}
BB / TB Terakhir: ${rec.last_weight} kg / ${rec.last_height} cm
Tingkat Risiko: ${rec.risk_level}

Ringkasan Klinis:
${rec.summary}

Area Masalah:
${(rec.problem_areas || []).map((p, i) => `${i + 1}. ${p}`).join('\n') || '- Tidak ada red flag mayor'}

Catatan Medis Dokter:
${rec.clinical_notes || '-'}`;
  };

  const handleCopyPrompt = (rec: ScreeningRecord, section: MasterPromptSection = selectedPromptSection) => {
    const prompt = getPromptForRecord(rec, section);
    navigator.clipboard.writeText(prompt);
    setCopiedId(`${rec.id}-${section}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        (r.child_name || '').toLowerCase().includes(q) ||
        (r.mother_name || '').toLowerCase().includes(q) ||
        (r.phone || '').toLowerCase().includes(q) ||
        (r.id || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (typeFilter === 'paid') return r.type === 'paid';
      if (typeFilter === 'free') return r.type === 'free';
      return true;
    });
  }, [records, searchQuery, typeFilter]);

  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Waktu',
      'Tipe',
      'Status',
      'Risiko',
      'Nama Anak',
      'Nama Ibu',
      'WhatsApp',
      'Usia',
      'Gender',
      'BB (kg)',
      'TB (cm)',
      'Catatan Klinis',
    ];
    const rows = filteredRecords.map((r) => [
      r.id,
      r.created_at,
      r.type,
      r.status,
      r.risk_level,
      `"${(r.child_name || '').replace(/"/g, '""')}"`,
      `"${(r.mother_name || '').replace(/"/g, '""')}"`,
      r.phone,
      `"${r.age_text}"`,
      r.gender,
      r.last_weight,
      r.last_height,
      `"${(r.clinical_notes || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Database-Admin-TKA-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = useMemo(() => {
    const total = records.length;
    const paid = records.filter((r) => r.type === 'paid').length;
    const free = total - paid;
    const danger = records.filter((r) => r.risk_level === 'BUTUH PERHATIAN KHUSUS').length;
    const warning = records.filter((r) => r.risk_level === 'PERLU DIPERHATIKAN').length;
    const safe = records.filter((r) => r.risk_level === 'NORMAL').length;
    const completed = records.filter((r) => r.status === 'Selesai').length;
    const pctSafe = total > 0 ? Math.round((safe / total) * 100) : 0;
    return { total, paid, free, danger, warning, safe, completed, pctSafe };
  }, [records]);

  const domainBarData = useMemo(() => {
    const total = records.length || 1;
    const calcPct = (fn: (r: ScreeningRecord) => boolean) =>
      Math.max(18, Math.min(96, Math.round((records.filter(fn).length / total) * 100)));

    return [
      { label: 'VIP Paid', pct: records.length ? calcPct((r) => r.type === 'paid') : 78 },
      { label: 'Free Entry', pct: records.length ? calcPct((r) => r.type === 'free') : 52 },
      { label: 'Risiko Tinggi', pct: records.length ? calcPct((r) => r.risk_level === 'BUTUH PERHATIAN KHUSUS') : 38 },
      { label: 'Perlu Pantau', pct: records.length ? calcPct((r) => r.risk_level === 'PERLU DIPERHATIKAN') : 64 },
      { label: 'Normal', pct: records.length ? calcPct((r) => r.risk_level === 'NORMAL') : 74 },
      { label: 'Review', pct: records.length ? calcPct((r) => r.status === 'Dalam Review') : 58 },
      { label: 'Selesai', pct: records.length ? calcPct((r) => r.status === 'Selesai') : 86 },
    ];
  }, [records]);

  const getParentQuestions = (rec: ScreeningRecord): string[] => {
    if (!rec.paid_data) return [];
    return [
      rec.paid_data.pertanyaanDokter1 || '',
      rec.paid_data.pertanyaanDokter2 || '',
      rec.paid_data.pertanyaanDokter3 || '',
    ].filter((q) => q.trim().length > 0);
  };

  // LOGIN GATE (Unified Calescence Style)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F3F5F9] flex items-center justify-center p-6 font-sans text-[#111827]">
        <div className="w-full max-w-md rounded-[32px] bg-white p-8 md:p-10 shadow-[0_20px_50px_rgba(17,24,39,0.06)]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#C8FF29] flex items-center justify-center text-[#121417] font-bold text-lg shadow-sm">
                C
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280] block">
                  Calescence Clinical OS
                </span>
                <h1 className="text-xl font-bold text-[#121417]">Portal Admin & Master Prompt</h1>
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-[#121417] text-[#C8FF29] flex items-center justify-center">
              <Stethoscope className="w-5 h-5" />
            </div>
          </div>

          <p className="text-sm text-[#6B7280] mb-6 leading-relaxed">
            Sistem Manajemen Skrining Anak, Audit Pembayaran Rp 9.999, dan Generator 4-Bagian Master Prompt AI dr.ipit.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-2">
                Pilih Mode Akses
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setModeRole('admin')}
                  className={`py-3 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                    modeRole === 'admin'
                      ? 'bg-[#121417] text-white border-[#121417] shadow-sm'
                      : 'bg-[#F8FAFC] text-[#6B7280] border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-[#C8FF29]" />
                  Admin Utama
                </button>
                <button
                  type="button"
                  onClick={() => setModeRole('analyst')}
                  className={`py-3 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                    modeRole === 'analyst'
                      ? 'bg-[#121417] text-white border-[#121417] shadow-sm'
                      : 'bg-[#F8FAFC] text-[#6B7280] border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-4 h-4 text-[#1D7AFC]" />
                  Analis Prompt AI
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-2">
                Kode Otorisasi Admin
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#9CA3AF] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Masukkan kode akses..."
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-[#F3F5F9] text-sm font-medium text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#121417]"
                  autoFocus
                />
              </div>
              {authError && (
                <p className="text-xs font-semibold text-red-600 mt-2">
                  Kode otorisasi tidak valid. Silakan periksa kembali.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-full bg-[#121417] hover:bg-black text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              Buka Workspace Admin
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-[#9CA3AF]">
            <span>Klinik Tumbuh Kembang Anak</span>
            <Link href="/" className="font-semibold text-[#121417] hover:underline">
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const stackCards = [
    filteredRecords[0] || null,
    filteredRecords[1] || filteredRecords[0] || null,
    filteredRecords[2] || filteredRecords[0] || null,
  ];

  const completionPct = selectedRecord
    ? selectedRecord.status === 'Selesai'
      ? 96
      : clinicalNotes.trim().length > 10
      ? 78
      : selectedRecord.type === 'paid'
      ? 68
      : 45
    : 72;

  return (
    <div className="min-h-screen bg-[#F3F5F9] text-[#111827] font-sans p-3 sm:p-5 md:p-7">
      <div className="max-w-[1600px] mx-auto space-y-5">
        {/* TOP NAVIGATION BAR (Floating Pill Header) */}
        <header className="rounded-full bg-white px-4 sm:px-6 py-3 shadow-[0_12px_32px_rgba(17,24,39,0.04)] flex flex-wrap items-center justify-between gap-4">
          {/* Brand Logo + Portal Switcher */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#C8FF29] flex items-center justify-center shadow-sm">
              <div className="w-4 h-4 rounded-sm border-2 border-[#121417] rotate-45" />
            </div>
            <span className="text-lg font-bold tracking-tight text-[#121417]">Calescence</span>
            {/* Unified Admin Portal Switcher */}
            <div className="hidden xl:flex items-center gap-1 bg-[#F3F5F9] p-1 rounded-full ml-2">
              <Link
                href="/admin"
                className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#121417] text-[#C8FF29]"
              >
                /admin
              </Link>
              <Link
                href="/rm"
                className="px-3 py-1 rounded-full text-[11px] font-semibold text-[#6B7280] hover:text-[#121417]"
              >
                /rm
              </Link>
              <Link
                href="/admincommunity"
                className="px-3 py-1 rounded-full text-[11px] font-semibold text-[#6B7280] hover:text-[#121417]"
              >
                /admincommunity
              </Link>
            </div>
          </div>

          {/* Center Navigation Pills */}
          <nav className="hidden lg:flex items-center gap-1 bg-[#F8FAFC] p-1.5 rounded-full">
            {(
              [
                { id: 'Dashboard', label: 'Dashboard' },
                { id: 'Pasien', label: 'Database Pasien' },
                { id: 'Analitik', label: 'Statistik Risiko' },
                { id: 'MasterPrompt', label: 'Master Prompt AI' },
                { id: 'Pengaturan', label: 'Supabase SQL' },
              ] as { id: ActiveTab; label: string }[]
            ).map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-[#121417] text-white shadow-sm'
                      : 'text-[#6B7280] hover:text-[#121417]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2.5">
            <div className="relative hidden sm:block">
              <Search className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari anak / ibu / WA..."
                className="pl-9 pr-4 py-2 rounded-full bg-[#F3F5F9] text-xs font-medium text-[#121417] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#121417] w-44 md:w-56"
              />
            </div>

            <button
              onClick={() => loadData()}
              title="Sinkronisasi Data"
              className="w-10 h-10 rounded-full bg-[#F3F5F9] hover:bg-slate-200 flex items-center justify-center text-[#121417] transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setShowSqlModal(true)}
              title="Status Database & SQL"
              className="w-10 h-10 rounded-full bg-[#F3F5F9] hover:bg-slate-200 flex items-center justify-center text-[#121417] transition-colors relative cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              <span
                className={`w-2 h-2 rounded-full absolute top-2.5 right-2.5 ${
                  fromSupabase ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </button>

            <button
              onClick={() => setModeRole(modeRole === 'admin' ? 'analyst' : 'admin')}
              className="flex items-center gap-2.5 pl-1.5 pr-3.5 py-1 rounded-full bg-[#F3F5F9] hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#121417] text-[#C8FF29] flex items-center justify-center font-bold text-xs">
                {modeRole === 'admin' ? 'AD' : 'AI'}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-bold text-[#121417] leading-tight">
                  {modeRole === 'admin' ? 'Admin Utama' : 'Analis Prompt'}
                </p>
                <p className="text-[10px] font-medium text-[#6B7280]">
                  {modeRole === 'admin' ? 'Portal /admin' : 'Master Prompt AI'}
                </p>
              </div>
            </button>
          </div>
        </header>

        {/* GREETING & ACTION SUB-HEADER ROW */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-1">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => {
                sessionStorage.removeItem('tka_admin_auth');
                setIsAuthenticated(false);
              }}
              title="Keluar / Kunci Portal"
              className="w-11 h-11 rounded-full bg-white shadow-[0_8px_20px_rgba(17,24,39,0.04)] flex items-center justify-center text-[#121417] hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#121417]">
                Hello, {modeRole === 'admin' ? 'Admin Klinik!' : 'Analis AI!'}
              </h1>
              <p className="text-xs text-[#6B7280] font-medium">
                {stats.total} Total Skrining • {stats.paid} Berbayar (Rp 9.999) • {stats.free} Gratis •{' '}
                {stats.danger} Risiko Tinggi
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                if (selectedRecord) setShowDetailModal(true);
              }}
              className="w-11 h-11 rounded-full bg-white shadow-[0_8px_20px_rgba(17,24,39,0.04)] flex items-center justify-center text-[#121417] hover:bg-slate-50 transition-colors cursor-pointer"
              title="Lihat Laporan A4 & Prompt"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            {/* Filter Type Pill */}
            <div className="flex items-center gap-1 bg-white p-1.5 rounded-full shadow-[0_8px_20px_rgba(17,24,39,0.04)]">
              <Calendar className="w-3.5 h-3.5 text-[#6B7280] ml-2.5 mr-1 hidden sm:inline" />
              {(
                [
                  { id: 'all', label: `Semua (${stats.total})` },
                  { id: 'paid', label: `VIP Paid (${stats.paid})` },
                  { id: 'free', label: `Free (${stats.free})` },
                ] as { id: TypeFilter; label: string }[]
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setTypeFilter(f.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    typeFilter === f.id
                      ? 'bg-[#121417] text-white'
                      : 'text-[#6B7280] hover:text-[#121417]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleExportCSV}
              className="px-5 py-3 rounded-full bg-[#121417] hover:bg-black text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-[#C8FF29]" />
              Export CSV
            </button>
          </div>
        </div>

        {/* MAIN WORKSPACE GRID (Left Pill Sidebar + Bento Grid) */}
        <div className="flex flex-col lg:flex-row gap-5 items-stretch">
          {/* LEFT VERTICAL ICON SIDEBAR */}
          <aside className="lg:w-[68px] rounded-[32px] bg-white p-2.5 shadow-[0_12px_32px_rgba(17,24,39,0.04)] flex lg:flex-col items-center justify-between gap-2 shrink-0">
            <div className="flex lg:flex-col items-center gap-2">
              {(
                [
                  { id: 'Dashboard', icon: Grid, title: 'Overview Bento' },
                  { id: 'Pasien', icon: Users, title: 'Database Pasien' },
                  { id: 'Analitik', icon: PieChart, title: 'Analitik Klinis' },
                  { id: 'MasterPrompt', icon: Layers, title: 'Master Prompt AI' },
                  { id: 'Pengaturan', icon: Award, title: 'Skema Supabase' },
                ] as { id: ActiveTab; icon: React.ComponentType<{ className?: string }>; title: string }[]
              ).map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    title={item.title}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      active
                        ? 'bg-[#121417] text-white shadow-sm'
                        : 'text-[#6B7280] hover:bg-[#F3F5F9] hover:text-[#121417]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowSqlModal(true)}
              title="Konfigurasi SQL"
              className="w-11 h-11 rounded-full flex items-center justify-center text-[#6B7280] hover:bg-[#F3F5F9] hover:text-[#121417] transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
          </aside>

          {/* CENTER + RIGHT BENTO GRID */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* LEFT + CENTER 8 COLUMNS */}
            <div className="lg:col-span-8 flex flex-col gap-5">
              {/* TOP ROW: Stacked Cards (5 cols) + Striped Vertical Pill Bar Chart (7 cols) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* CARD 1: STACKED ANTRIAN VIP / PRIORITAS (5 cols) */}
                <div className="md:col-span-5 rounded-[32px] bg-white p-5 shadow-[0_12px_32px_rgba(17,24,39,0.04)] flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                      Antrian Skrining Terbaru
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-[#F3F5F9] text-[11px] font-bold text-[#121417]">
                      {filteredRecords.length} Pasien
                    </span>
                  </div>

                  {/* Overlapping Folder-Tab Stack */}
                  <div className="space-y-2.5 my-auto">
                    {/* Top Charcoal Card */}
                    <div
                      onClick={() => stackCards[0] && handleSelectRecord(stackCards[0])}
                      className="rounded-[24px] bg-[#121417] text-white p-4 cursor-pointer transition-transform hover:-translate-y-0.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold truncate">
                            {stackCards[0] ? `An. ${stackCards[0].child_name}` : 'Belum Ada Data'}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {stackCards[0]
                              ? `${stackCards[0].age_text} • Ibu ${stackCards[0].mother_name}`
                              : 'Silakan isi dari /assessment'}
                          </p>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-white/10 text-[#C8FF29] text-[11px] font-bold">
                          {stackCards[0]
                            ? stackCards[0].type === 'paid'
                              ? 'VIP PAID'
                              : 'FREE'
                            : 'IDLE'}
                        </span>
                      </div>
                    </div>

                    {/* Middle Neon Lime Card */}
                    <div
                      onClick={() => stackCards[1] && handleSelectRecord(stackCards[1])}
                      className="rounded-[24px] bg-[#C8FF29] text-[#121417] p-4 cursor-pointer transition-transform hover:-translate-y-0.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold truncate">
                            {stackCards[1] ? `An. ${stackCards[1].child_name}` : 'Slot Antrian #2'}
                          </p>
                          <p className="text-[11px] text-[#121417]/70 font-medium">
                            {stackCards[1]
                              ? `BB ${stackCards[1].last_weight} kg • TB ${stackCards[1].last_height} cm`
                              : 'Menunggu pasien berikutnya'}
                          </p>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-[#121417] text-white text-[11px] font-bold">
                          {stackCards[1] ? stackCards[1].status : '--'}
                        </span>
                      </div>
                    </div>

                    {/* Bottom White Card with Avatar + Metric */}
                    <div
                      onClick={() => stackCards[2] && handleSelectRecord(stackCards[2])}
                      className="rounded-[24px] bg-[#F8FAFC] border border-slate-200/80 p-4 cursor-pointer transition-transform hover:-translate-y-0.5"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-[#121417] text-white flex items-center justify-center font-bold text-xs">
                            {stackCards[2] ? (stackCards[2].child_name || 'TK').slice(0, 2).toUpperCase() : 'TK'}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#121417]">
                              {stackCards[2] ? `An. ${stackCards[2].child_name}` : 'Slot Antrian #3'}
                            </p>
                            <p className="text-[11px] text-[#6B7280]">
                              {stackCards[2] ? `Ibu ${stackCards[2].mother_name}` : 'Standby'}
                            </p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-bold text-[#121417]">
                          {stackCards[2]?.status || 'Baru'}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between pt-2 border-t border-slate-200/60">
                        <div>
                          <span className="text-2xl font-bold text-[#121417]">{stats.paid}</span>
                          <span className="text-[11px] font-semibold text-[#6B7280] ml-1.5">
                            VIP Paid Rp 9.999
                          </span>
                        </div>
                        <span className="text-xs font-bold text-emerald-600">+{stats.pctSafe}% Normal</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD 2: STRIPED BLUE PILL BAR CHART (7 cols) */}
                <div className="md:col-span-7 rounded-[32px] bg-white p-6 shadow-[0_12px_32px_rgba(17,24,39,0.04)] flex flex-col justify-between">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-[#121417]">Distribusi Pembayaran & Risiko</h2>
                      <p className="text-xs text-[#6B7280]">
                        Rasio skrining VIP Berbayar, Gratis, Tingkat Risiko & Penyelesaian Rekam Medis
                      </p>
                    </div>
                    <div className="flex items-center gap-1 bg-[#F3F5F9] p-1 rounded-full">
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#121417] text-white">
                        Real-time
                      </span>
                      <span className="px-3 py-1 rounded-full text-[11px] font-semibold text-[#6B7280]">
                        {stats.total} Data
                      </span>
                    </div>
                  </div>

                  {/* Chart Canvas with Horizontal Dashed Grid Lines */}
                  <div className="relative h-52 flex items-end justify-between gap-2 sm:gap-3 pt-6 pb-2 px-1">
                    <div className="absolute inset-x-0 top-6 bottom-8 flex flex-col justify-between pointer-events-none">
                      {[100, 75, 50, 25, 0].map((val) => (
                        <div key={val} className="w-full border-b border-dashed border-slate-200 flex items-center">
                          <span className="text-[9px] font-semibold text-[#9CA3AF] -mt-3 bg-white pr-1">
                            {val}%
                          </span>
                        </div>
                      ))}
                    </div>

                    {domainBarData.map((bar, idx) => {
                      const isHighlight = idx === 0 || idx === 6;
                      return (
                        <div
                          key={bar.label}
                          className="relative z-10 flex-1 flex flex-col items-center h-full justify-end group"
                        >
                          <div className="mb-1.5 px-2 py-0.5 rounded-full bg-[#121417] text-white text-[10px] font-bold opacity-90 group-hover:scale-105 transition-transform">
                            {bar.pct}%
                          </div>
                          <div
                            style={{
                              height: `${bar.pct}%`,
                              backgroundImage: isHighlight
                                ? 'repeating-linear-gradient(135deg, #1D7AFC 0px, #1D7AFC 6px, #4694FF 6px, #4694FF 12px)'
                                : 'repeating-linear-gradient(135deg, #67A8FF 0px, #67A8FF 6px, #93C2FF 6px, #93C2FF 12px)',
                            }}
                            className="w-full max-w-[38px] rounded-full shadow-sm transition-all duration-300 group-hover:brightness-105"
                          />
                          <span className="mt-2 text-[10px] font-bold text-[#6B7280] truncate max-w-full">
                            {bar.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* BOTTOM WIDE CARD: DAFTAR PASIEN / MASTER PROMPT / SQL TAB */}
              <div className="rounded-[32px] bg-white p-6 shadow-[0_12px_32px_rgba(17,24,39,0.04)] flex-1 flex flex-col justify-between">
                {activeTab === 'MasterPrompt' ? (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                          Generator 4-Bagian dr.ipit
                        </span>
                        <h3 className="text-xl font-bold text-[#121417]">
                          Master Prompt AI —{' '}
                          {selectedRecord ? `An. ${selectedRecord.child_name}` : 'Pilih Pasien'}
                        </h3>
                      </div>
                      {selectedRecord && (
                        <button
                          onClick={() => handleCopyPrompt(selectedRecord, selectedPromptSection)}
                          className="px-4 py-2.5 rounded-full bg-[#121417] text-[#C8FF29] text-xs font-bold flex items-center gap-2 cursor-pointer"
                        >
                          {copiedId === `${selectedRecord.id}-${selectedPromptSection}` ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                          {copiedId === `${selectedRecord.id}-${selectedPromptSection}`
                            ? 'Tersalin ke Clipboard!'
                            : 'Salin Master Prompt'}
                        </button>
                      )}
                    </div>

                    {/* 5 Prompt Section Pills */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {PROMPT_SECTIONS.map((sec) => (
                        <button
                          key={sec.id}
                          onClick={() => setSelectedPromptSection(sec.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            selectedPromptSection === sec.id
                              ? 'bg-[#121417] text-[#C8FF29]'
                              : 'bg-[#F3F5F9] text-[#6B7280] hover:text-[#121417]'
                          }`}
                        >
                          {sec.shortTitle}
                        </button>
                      ))}
                    </div>

                    <pre className="p-4 rounded-2xl bg-[#121417] text-slate-100 text-xs font-mono whitespace-pre-wrap max-h-[340px] overflow-y-auto leading-relaxed">
                      {selectedRecord
                        ? getPromptForRecord(selectedRecord, selectedPromptSection)
                        : 'Pilih salah satu pasien untuk melihat Master Prompt AI 4-Bagian.'}
                    </pre>
                  </div>
                ) : activeTab === 'Pengaturan' ? (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                          Integrasi Cloud Supabase ({SUPABASE_URL})
                        </span>
                        <h3 className="text-xl font-bold text-[#121417]">SQL Schema & Kebijakan RLS</h3>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
                          setCopiedId('sql');
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        className="px-4 py-2 rounded-full bg-[#121417] text-[#C8FF29] text-xs font-bold flex items-center gap-2 cursor-pointer"
                      >
                        {copiedId === 'sql' ? <Check className="w-4 h-4" /> : <Database className="w-4 h-4" />}
                        {copiedId === 'sql' ? 'SQL Tersalin' : 'Salin SQL Schema'}
                      </button>
                    </div>
                    <pre className="p-4 rounded-2xl bg-[#121417] text-emerald-300 text-xs font-mono whitespace-pre-wrap max-h-[320px] overflow-y-auto">
                      {SUPABASE_SQL_SETUP}
                    </pre>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                          Database Skrining Anak (/assessment)
                        </span>
                        <h3 className="text-xl font-bold text-[#121417]">
                          Daftar Pasien, 3 Pertanyaan Dokter & Prompt AI
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1.5 rounded-full bg-[#C8FF29] text-[#121417] text-xs font-bold">
                          {stats.paid} VIP Paid
                        </span>
                        <span className="px-3 py-1.5 rounded-full bg-red-50 text-red-700 text-xs font-bold">
                          {stats.danger} Risiko Tinggi
                        </span>
                      </div>
                    </div>

                    {filteredRecords.length === 0 ? (
                      <div className="py-12 text-center rounded-2xl bg-[#F8FAFC] border border-dashed border-slate-200">
                        <p className="text-sm font-bold text-[#121417]">Belum ada data skrining yang cocok</p>
                        <p className="text-xs text-[#6B7280] mt-1">
                          Data yang diinput pasien dari /assessment otomatis tampil secara real-time di sini.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                              <th className="py-3 px-3">Pasien & Ibu</th>
                              <th className="py-3 px-3">Tipe</th>
                              <th className="py-3 px-3">Antropometri & Risiko</th>
                              <th className="py-3 px-3">3 Pertanyaan ke Dokter</th>
                              <th className="py-3 px-3 text-right">Aksi Cepat</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {filteredRecords.slice(0, 8).map((rec) => {
                              const isSelected = selectedRecord?.id === rec.id;
                              const questions = getParentQuestions(rec);
                              return (
                                <tr
                                  key={rec.id}
                                  onClick={() => handleSelectRecord(rec)}
                                  className={`transition-colors cursor-pointer ${
                                    isSelected ? 'bg-[#F3F5F9]' : 'hover:bg-[#F8FAFC]'
                                  }`}
                                >
                                  <td className="py-3.5 px-3">
                                    <div className="flex items-center gap-2.5">
                                      <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                          isSelected
                                            ? 'bg-[#121417] text-[#C8FF29]'
                                            : 'bg-[#F3F5F9] text-[#121417]'
                                        }`}
                                      >
                                        {(rec.child_name || 'AN').slice(0, 2).toUpperCase()}
                                      </div>
                                      <div>
                                        <p className="font-bold text-[#121417]">An. {rec.child_name}</p>
                                        <p className="text-[11px] text-[#6B7280]">
                                          {rec.age_text} • Ibu {rec.mother_name}
                                        </p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-3">
                                    <span
                                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                        rec.type === 'paid'
                                          ? 'bg-[#121417] text-[#C8FF29]'
                                          : 'bg-slate-100 text-[#6B7280]'
                                      }`}
                                    >
                                      {rec.type === 'paid' ? 'VIP Rp 9.999' : 'Gratis'}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-3">
                                    <p className="font-semibold text-[#121417]">
                                      {rec.last_weight} kg / {rec.last_height} cm
                                    </p>
                                    <p className="text-[11px] text-[#6B7280]">{rec.risk_level}</p>
                                  </td>
                                  <td className="py-3.5 px-3">
                                    {questions.length > 0 ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-[#1D7AFC] font-bold text-[11px]">
                                        {questions.length} Pertanyaan Ibu
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-[#9CA3AF]">Tidak ada pertanyaan</span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-3 text-right">
                                    <div
                                      className="inline-flex items-center gap-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        onClick={() => handleCopyPrompt(rec, 'all')}
                                        title="Salin Master Prompt AI"
                                        className="px-2.5 py-1.5 rounded-full bg-[#C8FF29] hover:brightness-95 text-[#121417] font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                      >
                                        {copiedId === `${rec.id}-all` ? (
                                          <Check className="w-3.5 h-3.5" />
                                        ) : (
                                          <Copy className="w-3.5 h-3.5" />
                                        )}
                                        Prompt
                                      </button>
                                      <button
                                        onClick={() => {
                                          handleSelectRecord(rec);
                                          setShowDetailModal(true);
                                        }}
                                        title="Lihat Detail & Cetak A4"
                                        className="p-1.5 rounded-full hover:bg-slate-200 text-[#121417] cursor-pointer"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </button>
                                      {modeRole === 'admin' && (
                                        <button
                                          onClick={() => handleDelete(rec.id)}
                                          title="Hapus Rekam Medis"
                                          className="p-1.5 rounded-full hover:bg-red-50 text-red-600 cursor-pointer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* RIGHT 4 COLUMNS: CLINICAL REVIEW + MASTER PROMPT SUMMARY */}
            <div className="lg:col-span-4 flex flex-col gap-5">
              {/* TOP RIGHT CARD: EDITOR & QUICK ACTIONS */}
              <div className="rounded-[32px] bg-white p-6 shadow-[0_12px_32px_rgba(17,24,39,0.04)] flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-[#121417] leading-snug">
                        Panel Eksekusi & Audit Pasien
                      </h2>
                      <p className="text-xs text-[#6B7280] mt-0.5">
                        {selectedRecord
                          ? `ID: ${selectedRecord.id} • Ibu ${selectedRecord.mother_name}`
                          : 'Pilih pasien di tabel samping'}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-[#F3F5F9] text-[11px] font-bold text-[#121417] shrink-0">
                      {modeRole === 'admin' ? 'Admin' : 'Analis'}
                    </span>
                  </div>

                  {/* 4 Rounded-Square Action Icon Buttons */}
                  <div className="grid grid-cols-4 gap-2.5 mb-5">
                    <button
                      onClick={() => selectedRecord && handleCopyPrompt(selectedRecord, 'all')}
                      title="Salin Master Prompt AI"
                      className="h-12 rounded-2xl bg-[#F3F5F9] hover:bg-[#121417] hover:text-white text-[#121417] flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                      <span className="text-[9px] font-bold">Prompt</span>
                    </button>
                    <button
                      onClick={() => selectedRecord && setShowDetailModal(true)}
                      title="Cetak Laporan A4"
                      className="h-12 rounded-2xl bg-[#F3F5F9] hover:bg-[#121417] hover:text-white text-[#121417] flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span className="text-[9px] font-bold">Cetak A4</span>
                    </button>
                    <button
                      onClick={handleExportCSV}
                      title="Unduh CSV"
                      className="h-12 rounded-2xl bg-[#F3F5F9] hover:bg-[#121417] hover:text-white text-[#121417] flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span className="text-[9px] font-bold">CSV</span>
                    </button>
                    <button
                      onClick={() => {
                        if (selectedRecord?.phone) {
                          const cleanPhone = selectedRecord.phone.replace(/\D/g, '');
                          const waPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
                          window.open(`https://wa.me/${waPhone}`, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      title="Hubungi WhatsApp Ibu"
                      className="h-12 rounded-2xl bg-[#F3F5F9] hover:bg-[#121417] hover:text-white text-[#121417] flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span className="text-[9px] font-bold">WA Ibu</span>
                    </button>
                  </div>

                  {/* Neon Lime Progress Slider Track */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-[#121417]">Kelengkapan Audit & Prompt</span>
                      <span className="font-bold text-[#121417]">{completionPct}%</span>
                    </div>
                    <div className="w-full h-7 rounded-full bg-[#F3F5F9] p-1 flex items-center relative">
                      <div
                        style={{ width: `${completionPct}%` }}
                        className="h-full rounded-full bg-[#C8FF29] transition-all duration-300 flex items-center justify-end pr-1"
                      >
                        <div className="w-4 h-4 rounded-full bg-white border-2 border-[#121417] shadow-sm" />
                      </div>
                    </div>
                  </div>

                  {/* Patient Selector Dropdown */}
                  <div className="mb-3">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">
                      Pasien Terpilih
                    </label>
                    <select
                      value={selectedRecord?.id || ''}
                      onChange={(e) => {
                        const found = records.find((r) => r.id === e.target.value);
                        if (found) handleSelectRecord(found);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F3F5F9] text-xs font-bold text-[#121417] focus:outline-none"
                    >
                      {records.length === 0 && <option value="">Belum ada pasien</option>}
                      {records.map((r) => (
                        <option key={r.id} value={r.id}>
                          An. {r.child_name} ({r.age_text}) — {r.type === 'paid' ? 'VIP PAID' : 'FREE'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3 Parent Questions Preview */}
                  {selectedRecord && (
                    <div className="mb-3 p-3 rounded-2xl bg-[#F8FAFC] border border-slate-200/80">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">
                        3 Pertanyaan Ibu ke Dokter:
                      </p>
                      {getParentQuestions(selectedRecord).length > 0 ? (
                        <ol className="list-decimal list-inside text-xs text-[#121417] space-y-1 font-medium">
                          {getParentQuestions(selectedRecord).map((q, i) => (
                            <li key={i} className="truncate">
                              {q}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="text-xs text-[#9CA3AF]">Ibu tidak menuliskan pertanyaan tambahan.</p>
                      )}
                    </div>
                  )}

                  {/* Clinical Notes Textarea */}
                  <div className="mb-3">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">
                      Catatan Medis / Advis Dokter
                    </label>
                    <textarea
                      rows={3}
                      value={clinicalNotes}
                      onChange={(e) => setClinicalNotes(e.target.value)}
                      placeholder="Tuliskan evaluasi tumbuh kembang atau instruksi kontrol..."
                      className="w-full p-3 rounded-2xl bg-[#F3F5F9] text-xs font-medium text-[#121417] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#121417]"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 mb-4">
                    <select
                      value={recordStatus}
                      onChange={(e) => setRecordStatus(e.target.value as ScreeningStatus)}
                      className="px-3 py-2 rounded-full bg-[#F3F5F9] text-xs font-bold text-[#121417] focus:outline-none"
                    >
                      <option value="Baru">Status: Baru</option>
                      <option value="Dalam Review">Status: Dalam Review</option>
                      <option value="Selesai">Status: Selesai</option>
                      <option value="Follow-Up">Status: Follow-Up</option>
                    </select>

                    <button
                      onClick={handleSaveReview}
                      disabled={!selectedRecord || isSavingReview}
                      className="px-4 py-2 rounded-full bg-[#121417] hover:bg-black disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#C8FF29]" />
                      {isSavingReview ? 'Menyimpan...' : saveSuccess ? 'Tersimpan!' : 'Simpan Audit'}
                    </button>
                  </div>
                </div>

                {/* Bottom Realtime Status Bar */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#F3F5F9] flex items-center justify-center">
                      <Activity className="w-3.5 h-3.5 text-[#121417]" />
                    </div>
                    <span className="text-[11px] font-semibold text-[#6B7280]">
                      {fromSupabase ? 'Supabase Cloud Aktif' : 'Penyimpanan Lokal Browser'}
                    </span>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#121417] text-white text-[11px] font-bold">
                    {stats.completed}/{stats.total} Selesai
                  </span>
                </div>
              </div>

              {/* BOTTOM RIGHT CARD: MASTER PROMPT & AVATAR STACK */}
              <div className="rounded-[32px] bg-white p-6 shadow-[0_12px_32px_rgba(17,24,39,0.04)] flex flex-col justify-between flex-1">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                      Master Prompt AI (4-Bagian)
                    </span>
                    <Sparkles className="w-4 h-4 text-[#1D7AFC]" />
                  </div>

                  <div className="flex items-baseline gap-3 my-2">
                    <span className="text-4xl font-bold tracking-tight text-[#121417]">
                      {selectedRecord ? (selectedRecord.problem_areas || []).length : 0}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-[#121417]">Area Masalah Terdeteksi</p>
                      <p className="text-[11px] text-[#6B7280]">
                        {selectedRecord
                          ? `Risiko: ${selectedRecord.risk_level}`
                          : 'Pilih pasien untuk melihat ringkasan'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 my-3">
                    <button
                      onClick={() => selectedRecord && handleCopyPrompt(selectedRecord, 'all')}
                      className="px-3 py-1.5 rounded-full bg-[#121417] text-white text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3 h-3 text-[#C8FF29]" />
                      {copiedId === `${selectedRecord?.id}-all` ? 'Prompt Disalin!' : 'Copy Full Prompt'}
                    </button>
                    <button
                      onClick={() => setActiveTab('MasterPrompt')}
                      className="px-3 py-1.5 rounded-full bg-[#F3F5F9] hover:bg-slate-200 text-[#121417] text-[11px] font-semibold cursor-pointer"
                    >
                      Buka 4 Bagian
                    </button>
                  </div>
                </div>

                {/* Overlapping Circular Avatar Stack + Neon Lime Counter */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex -space-x-2.5 overflow-hidden">
                    {records.slice(0, 4).map((r, i) => (
                      <div
                        key={r.id}
                        onClick={() => handleSelectRecord(r)}
                        title={`An. ${r.child_name}`}
                        className={`w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-bold cursor-pointer ${
                          i % 2 === 0 ? 'bg-[#121417] text-white' : 'bg-[#1D7AFC] text-white'
                        }`}
                      >
                        {(r.child_name || 'AN').slice(0, 2).toUpperCase()}
                      </div>
                    ))}
                    <div className="w-9 h-9 rounded-full border-2 border-white bg-[#C8FF29] text-[#121417] flex items-center justify-center text-[11px] font-bold">
                      +{Math.max(0, records.length - 4)}
                    </div>
                  </div>

                  <button
                    onClick={() => selectedRecord && setShowDetailModal(true)}
                    className="text-xs font-bold text-[#121417] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Detail A4 <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DETAIL & PRINT A4 MODAL */}
      {showDetailModal && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[32px] max-w-4xl w-full p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#121417] text-[#C8FF29] flex items-center justify-center">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#121417]">
                    Laporan Medis & Master Prompt — An. {selectedRecord.child_name}
                  </h2>
                  <p className="text-xs text-[#6B7280]">
                    ID: {selectedRecord.id} • Ibu {selectedRecord.mother_name} • WA: {selectedRecord.phone}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyPrompt(selectedRecord, selectedPromptSection)}
                  className="px-4 py-2 rounded-full bg-[#C8FF29] text-[#121417] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedId === `${selectedRecord.id}-${selectedPromptSection}` ? 'Tersalin!' : 'Salin Prompt'}
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-full bg-[#121417] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-[#C8FF29]" />
                  Cetak A4
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="w-9 h-9 rounded-full bg-[#F3F5F9] flex items-center justify-center text-[#121417] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-2xl bg-[#F8FAFC]">
                <span className="text-[10px] font-bold uppercase text-[#6B7280]">Antropometri WHO</span>
                <p className="text-sm font-bold text-[#121417] mt-1">
                  BB {selectedRecord.last_weight} kg • TB {selectedRecord.last_height} cm
                </p>
                <p className="text-xs text-[#6B7280] mt-1">
                  Usia: {selectedRecord.age_text} ({selectedRecord.gender})
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-[#F8FAFC]">
                <span className="text-[10px] font-bold uppercase text-[#6B7280]">Tingkat Risiko</span>
                <p className="text-sm font-bold text-[#121417] mt-1">{selectedRecord.risk_level}</p>
                <p className="text-xs text-[#6B7280] mt-1">
                  {(selectedRecord.problem_areas || []).length} Area Masalah Klinis
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-[#F8FAFC]">
                <span className="text-[10px] font-bold uppercase text-[#6B7280]">Status Pembayaran & Rekam Medis</span>
                <p className="text-sm font-bold text-[#121417] mt-1">
                  {selectedRecord.type === 'paid' ? 'VIP Berbayar (Rp 9.999)' : 'Akses Gratis'}
                </p>
                <p className="text-xs text-[#6B7280] mt-1">Status: {selectedRecord.status}</p>
              </div>
            </div>

            {(selectedRecord.problem_areas || []).length > 0 && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 mb-6">
                <p className="text-xs font-bold uppercase text-red-800 mb-2">
                  Temuan Klinis & Red Flags ({(selectedRecord.problem_areas || []).length})
                </p>
                <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                  {(selectedRecord.problem_areas || []).map((rf, idx) => (
                    <li key={idx}>{rf}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mb-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <p className="text-xs font-bold uppercase text-[#6B7280]">
                  Master Prompt AI 4-Bagian (Siap Tempel ke Claude / ChatGPT / Gemini)
                </p>
                <div className="flex flex-wrap gap-1">
                  {PROMPT_SECTIONS.map((sec) => (
                    <button
                      key={sec.id}
                      onClick={() => setSelectedPromptSection(sec.id)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer ${
                        selectedPromptSection === sec.id
                          ? 'bg-[#121417] text-[#C8FF29]'
                          : 'bg-[#F3F5F9] text-[#6B7280]'
                      }`}
                    >
                      {sec.shortTitle}
                    </button>
                  ))}
                </div>
              </div>
              <pre className="p-4 rounded-2xl bg-[#121417] text-slate-100 text-xs font-mono whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed">
                {getPromptForRecord(selectedRecord, selectedPromptSection)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* SUPABASE SQL MODAL */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-2xl w-full p-6 md:p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#C8FF29] flex items-center justify-center text-[#121417]">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#121417]">Konfigurasi Tabel Supabase (/admin & /rm)</h3>
                  <p className="text-xs text-[#6B7280]">
                    Status: {fromSupabase ? 'Terhubung ke Cloud Supabase' : 'Mode Offline / LocalStorage'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="w-8 h-8 rounded-full bg-[#F3F5F9] flex items-center justify-center text-[#121417] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <pre className="p-4 rounded-2xl bg-[#121417] text-emerald-300 text-xs font-mono whitespace-pre-wrap max-h-80 overflow-y-auto mb-4">
              {SUPABASE_SQL_SETUP}
            </pre>

            <div className="flex justify-end gap-2">
              <button
                onClick={async () => {
                  await syncRecordsToSupabase(records);
                  await loadData();
                }}
                className="px-4 py-2.5 rounded-full bg-[#F3F5F9] hover:bg-slate-200 text-[#121417] text-xs font-bold flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Sync ke Cloud
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
                  setCopiedId('sql-modal');
                  setTimeout(() => setCopiedId(null), 2000);
                }}
                className="px-5 py-2.5 rounded-full bg-[#121417] text-[#C8FF29] text-xs font-bold flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                {copiedId === 'sql-modal' ? 'SQL Berhasil Disalin!' : 'Salin Script SQL'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
