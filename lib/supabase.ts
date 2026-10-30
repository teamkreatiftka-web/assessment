import { createClient } from '@supabase/supabase-js';

// Provided Supabase Credentials
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://odcdtrzuwglyrjmeadgb.supabase.co';
export const SUPABASE_REST_URL = `${SUPABASE_URL}/rest/v1/`;
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2R0cnp1d2dseXJqbWVhZGdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNDE3OTIsImV4cCI6MjEwNjgxNzc5Mn0.jC_SmmTMvzf2tMxstaTGi-nAorVuYiWX2TLbWt8bSc0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
  },
});

export function getSupabaseClient() {
  return supabase;
}

export const SUPABASE_CLIENT_CODE_SNIPPET = `// lib/supabase.ts — Koneksi Client & Fungsi CRUD Rekam Medis (/rm) ke Supabase
import { createClient } from '@supabase/supabase-js';
import { ScreeningRecord } from '@/types/screening';

export const SUPABASE_URL = 'https://odcdtrzuwglyrjmeadgb.supabase.co';
export const SUPABASE_ANON_KEY = '${SUPABASE_ANON_KEY}';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

// 1. Ambil Semua Rekam Medis Asesmen Lengkap (type = 'paid')
export async function fetchPaidMedicalRecordsFromSupabase() {
  const { data, error } = await supabase
    .from('screenings')
    .select('*')
    .eq('type', 'paid')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// 2. Simpan / Upsert Rekam Medis Asesmen Lengkap Baru ke Supabase
export async function upsertMedicalRecordToSupabase(record: ScreeningRecord) {
  const { data, error } = await supabase
    .from('screenings')
    .upsert(
      [
        {
          id: record.id,
          created_at: record.created_at,
          type: 'paid',
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
          paid_data: record.paid_data || null,
        },
      ],
      { onConflict: 'id' }
    )
    .select();

  if (error) throw error;
  return data;
}

// 3. Update Catatan Klinis dr. Harys Maulana & Status Review
export async function updateDoctorNotesInSupabase(
  id: string,
  status: string,
  clinical_notes: string
) {
  const { error } = await supabase
    .from('screenings')
    .update({
      status,
      clinical_notes,
    })
    .eq('id', id);

  if (error) throw error;
  return true;
}`;

export const SUPABASE_SQL_SETUP = `-- ============================================================================
-- SCRIPT SETUP DATABASE SUPABASE UNTUK HALAMAN /rm (REKAM MEDIS) & /admin
-- Proyek Supabase: odcdtrzuwglyrjmeadgb
-- Jalankan di SQL Editor: https://supabase.com/dashboard/project/odcdtrzuwglyrjmeadgb/sql/new
-- ============================================================================

-- 1. Buat Tabel Utama public.screenings (Menampung Screening Singkat & Rekam Medis Lengkap /rm)
CREATE TABLE IF NOT EXISTS public.screenings (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  type TEXT NOT NULL,                           -- 'free' (Skrining Cepat) atau 'paid' (Rekam Medis Lengkap /rm)
  status TEXT DEFAULT 'Baru',                   -- 'Baru', 'Dalam Review', 'Selesai', 'Follow-Up'
  risk_level TEXT DEFAULT 'PERLU DIPERHATIKAN', -- 'NORMAL', 'PERLU DIPERHATIKAN', 'BUTUH PERHATIAN KHUSUS'
  doctor_name TEXT DEFAULT 'dr. Harys Maulana', -- Dokter Penanggung Jawab Rekam Medis
  child_name TEXT NOT NULL,
  mother_name TEXT,
  father_name TEXT,
  phone TEXT,
  secondary_phone TEXT,
  age_text TEXT,
  gender TEXT,
  last_weight TEXT,
  last_height TEXT,
  measurement_date TEXT,
  summary TEXT,
  problem_areas JSONB DEFAULT '[]'::jsonb,
  clinical_notes TEXT DEFAULT '',
  free_data JSONB,
  paid_data JSONB                               -- Menyimpan 10 Bagian Asesmen Lengkap (Pasien, Repertoire, Oral Motor, Sensorik, 24h Recall, Riwayat BB)
);

-- Tambahkan kolom baru secara aman jika tabel sudah pernah dibuat sebelumnya
ALTER TABLE public.screenings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.screenings ADD COLUMN IF NOT EXISTS doctor_name TEXT DEFAULT 'dr. Harys Maulana';

-- 2. Buat Index untuk Query Cepat di Halaman /rm dan /admin
CREATE INDEX IF NOT EXISTS idx_screenings_created_at ON public.screenings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_screenings_type ON public.screenings (type);
CREATE INDEX IF NOT EXISTS idx_screenings_status ON public.screenings (status);
CREATE INDEX IF NOT EXISTS idx_screenings_phone ON public.screenings (phone);

-- 3. Buat View Khusus Rekam Medis Asesmen Lengkap (/rm)
CREATE OR REPLACE VIEW public.rm_asesmen_lengkap_view AS
SELECT
  id,
  created_at,
  updated_at,
  status,
  risk_level,
  doctor_name,
  child_name,
  age_text,
  gender,
  last_weight,
  last_height,
  measurement_date,
  mother_name,
  father_name,
  phone,
  summary,
  clinical_notes,
  paid_data->>'jumlahJenisDiterima' AS jumlah_repertoire,
  paid_data->'riwayatBB'->>'bb3BulanLalu' AS bb_3_bulan_lalu,
  paid_data->'riwayatBB'->>'bb2BulanLalu' AS bb_2_bulan_lalu,
  paid_data->'riwayatBB'->>'bb1BulanLalu' AS bb_1_bulan_lalu,
  paid_data->'riwayatBB'->>'bbStagnan' AS bb_stagnan,
  paid_data
FROM public.screenings
WHERE type = 'paid'
ORDER BY created_at DESC;

-- 4. Aktifkan Row Level Security (RLS)
ALTER TABLE public.screenings ENABLE ROW LEVEL SECURITY;

-- 5. Kebijakan Akses (RLS Policies) - Idempoten (Bebas Dijalankan Berulang Kali)
DROP POLICY IF EXISTS "Izinkan publik tambah screening" ON public.screenings;
CREATE POLICY "Izinkan publik tambah screening" ON public.screenings
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Izinkan anon baca data screening" ON public.screenings;
CREATE POLICY "Izinkan anon baca data screening" ON public.screenings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Izinkan anon update data screening" ON public.screenings;
CREATE POLICY "Izinkan anon update data screening" ON public.screenings
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Izinkan anon hapus data screening" ON public.screenings;
CREATE POLICY "Izinkan anon hapus data screening" ON public.screenings
  FOR DELETE USING (true);

-- 6. Berikan Hak Akses ke Role Supabase
GRANT ALL ON TABLE public.screenings TO anon, authenticated, service_role;
GRANT SELECT ON public.rm_asesmen_lengkap_view TO anon, authenticated, service_role;
`;

export const SUPABASE_COMMUNITY_SQL_SETUP = `-- ============================================================================
-- SUPABASE SQL SCHEMA: ASESMEN KEBIASAAN & ATURAN MAKAN ANAK (/COMMUNITY)
-- Dashboard Admin: /admincommunity
-- Project URL: https://odcdtrzuwglyrjmeadgb.supabase.co
-- CATATAN: Tabel ini TERPISAH sepenuhnya dari tabel public.screenings (/rm)
-- ============================================================================

-- 1. Buat Tabel Utama Khusus Asesmen Community (11 Bagian & Aturan R1-R11)
CREATE TABLE IF NOT EXISTS public.community_assessments (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'Baru' CHECK (status IN ('Baru', 'Dalam Review', 'Selesai', 'Follow-Up')),
  child_name TEXT NOT NULL,
  mother_name TEXT NOT NULL,
  father_name TEXT,
  phone TEXT NOT NULL,
  domisili TEXT,
  age_text TEXT NOT NULL,
  age_months INTEGER NOT NULL DEFAULT 0,
  gender TEXT NOT NULL,
  last_weight TEXT NOT NULL,
  last_height TEXT NOT NULL,
  category TEXT NOT NULL,
  recommended_package TEXT NOT NULL,
  next_step TEXT NOT NULL,
  has_red_flags BOOLEAN NOT NULL DEFAULT FALSE,
  red_flag_labels JSONB NOT NULL DEFAULT '[]'::jsonb,
  violated_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  compliant_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_violated_count INTEGER NOT NULL DEFAULT 0,
  top3_priority_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  home_feeding_is_likely_main_cause BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp_template TEXT NOT NULL,
  reviewer_notes TEXT,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  evaluation_result JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 2. Trigger Otomatis Update Kolom updated_at
CREATE OR REPLACE FUNCTION public.handle_community_assessments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_community_assessments_updated_at ON public.community_assessments;
CREATE TRIGGER trg_community_assessments_updated_at
  BEFORE UPDATE ON public.community_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_community_assessments_updated_at();

-- 3. Buat Index untuk Performa Query & Filter di /admincommunity
CREATE INDEX IF NOT EXISTS idx_community_assessments_created_at ON public.community_assessments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_assessments_category ON public.community_assessments (category);
CREATE INDEX IF NOT EXISTS idx_community_assessments_status ON public.community_assessments (status);
CREATE INDEX IF NOT EXISTS idx_community_assessments_red_flags ON public.community_assessments (has_red_flags);
CREATE INDEX IF NOT EXISTS idx_community_assessments_child_name ON public.community_assessments (child_name);

-- 4. Buat View Analitik khusus Dashboard /admincommunity
CREATE OR REPLACE VIEW public.community_assessments_analytics_view AS
SELECT
  id,
  created_at,
  updated_at,
  status,
  child_name,
  mother_name,
  phone,
  domisili,
  age_text,
  age_months,
  gender,
  last_weight,
  last_height,
  category,
  recommended_package,
  has_red_flags,
  total_violated_count,
  violated_rules,
  top3_priority_codes,
  home_feeding_is_likely_main_cause,
  reviewer_notes
FROM public.community_assessments
ORDER BY created_at DESC;

-- 5. Aktifkan Row Level Security (RLS) & Policies
ALTER TABLE public.community_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Izinkan publik kirim asesmen community" ON public.community_assessments;
CREATE POLICY "Izinkan publik kirim asesmen community" ON public.community_assessments
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Izinkan admincommunity baca asesmen" ON public.community_assessments;
CREATE POLICY "Izinkan admincommunity baca asesmen" ON public.community_assessments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Izinkan admincommunity update asesmen" ON public.community_assessments;
CREATE POLICY "Izinkan admincommunity update asesmen" ON public.community_assessments
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Izinkan admincommunity hapus asesmen" ON public.community_assessments;
CREATE POLICY "Izinkan admincommunity hapus asesmen" ON public.community_assessments
  FOR DELETE USING (true);

-- 6. Berikan Hak Akses ke Role Supabase
GRANT ALL ON TABLE public.community_assessments TO anon, authenticated, service_role;
GRANT SELECT ON public.community_assessments_analytics_view TO anon, authenticated, service_role;
`;

export const SUPABASE_COMMUNITY_CLIENT_CODE = `// ============================================================================
// KODE INTEGRASI SUPABASE KHUSUS /COMMUNITY & /ADMINCOMMUNITY
// Tabel Database: public.community_assessments (TERPISAH dari /rm)
// ============================================================================
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://odcdtrzuwglyrjmeadgb.supabase.co';
export const SUPABASE_ANON_KEY = '${SUPABASE_ANON_KEY}';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 1. Simpan Hasil Asesmen dari Halaman /community ke Tabel community_assessments
export async function insertCommunityAssessmentToSupabase(record: any) {
  const { data, error } = await supabase
    .from('community_assessments')
    .upsert([record], { onConflict: 'id' })
    .select();

  if (error) throw error;
  return data;
}

// 2. Ambil Semua Data Pasien untuk Dashboard /admincommunity
export async function getCommunityAssessmentsForAdmin() {
  const { data, error } = await supabase
    .from('community_assessments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// 3. Update Status Review & Catatan Dokter (dr. Harys Maulana) di /admincommunity
export async function updateCommunityAssessmentReview(
  id: string,
  status: 'Baru' | 'Dalam Review' | 'Selesai' | 'Follow-Up',
  reviewerNotes: string,
  whatsappTemplate: string
) {
  const { data, error } = await supabase
    .from('community_assessments')
    .update({
      status,
      reviewer_notes: reviewerNotes,
      whatsapp_template: whatsappTemplate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select();

  if (error) throw error;
  return data;
}
`;

