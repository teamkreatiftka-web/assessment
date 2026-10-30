-- ==============================================================================
-- DATABASE SCHEMA SUPABASE TERBARU (VERSI TERUPDATE)
-- Mencakup:
--   A. Tabel `public.screenings` (untuk `/` Skrining Cepat & `/assessment` -> Admin `/rm`)
--   B. Tabel `public.community_assessments` (untuk `/community` 10 Bagian + Feeding Rules R1-R11 -> Admin `/admincommunity`)
--
-- URL Target Supabase: https://odcdtrzuwglyrjmeadgb.supabase.co
--
-- CARA PENGGUNAAN DI SUPABASE:
-- 1. Buka dashboard Supabase: https://supabase.com/dashboard/project/odcdtrzuwglyrjmeadgb
-- 2. Pilih menu "SQL Editor" di bilah navigasi sebelah kiri.
-- 3. Klik tombol "+ New query".
-- 4. Salin (copy) dan tempel (paste) seluruh skrip SQL di bawah ini.
-- 5. Klik tombol "RUN" (atau tekan Ctrl+Enter / Cmd+Enter).
-- ==============================================================================

-- ==============================================================================
-- BAGIAN A: TABEL SKRINING & REKAM MEDIS (/rm & /assessment)
-- Tabel: public.screenings
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.screenings (
  id TEXT PRIMARY KEY,                                      -- ID unik rekam medis (contoh: RM-PRO-2026-XXXX)
  created_at TIMESTAMPTZ DEFAULT NOW(),                     -- Waktu submit skrining
  updated_at TIMESTAMPTZ DEFAULT NOW(),                     -- Waktu terakhir diupdate dokter/admin
  type TEXT NOT NULL,                                       -- 'free' (Skrining Cepat) atau 'paid' (Rekam Medis Lengkap /rm)
  status TEXT DEFAULT 'Baru',                               -- 'Baru', 'Dalam Review', 'Selesai', 'Follow-Up'
  risk_level TEXT DEFAULT 'PERLU DIPERHATIKAN',             -- 'NORMAL', 'PERLU DIPERHATIKAN', 'BUTUH PERHATIAN KHUSUS'
  doctor_name TEXT DEFAULT 'dr. Harys Maulana',             -- Dokter pemeriksa rekam medis
  child_name TEXT NOT NULL,                                 -- Nama lengkap anak
  mother_name TEXT,                                         -- Nama ibu / bunda
  father_name TEXT,                                         -- Nama ayah (opsional)
  phone TEXT,                                               -- Nomor WhatsApp Ibu
  secondary_phone TEXT,                                     -- Nomor telepon alternatif
  age_text TEXT,                                            -- Usia anak terhitung otomatis
  gender TEXT,                                              -- 'Laki-laki' atau 'Perempuan'
  last_weight TEXT,                                         -- Berat badan terakhir
  last_height TEXT,                                         -- Tinggi / panjang badan terakhir
  measurement_date TEXT,                                    -- Tanggal pengukuran BB/TB
  summary TEXT,                                             -- Kesimpulan evaluasi klinis
  problem_areas JSONB DEFAULT '[]'::jsonb,                  -- List area masalah & feeding rules
  clinical_notes TEXT DEFAULT '',                           -- Catatan klinis dr. Harys Maulana
  free_data JSONB,                                          -- Data mentah skrining gratis
  paid_data JSONB                                           -- Data mentah asesmen berbayar 10 bagian (Pasien, Repertoire, Oral, Sensorik, 24h Recall, Riwayat BB)
);

-- Pastikan kolom tambahan selalu ada bila tabel sudah pernah dibuat sebelumnya
ALTER TABLE public.screenings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.screenings ADD COLUMN IF NOT EXISTS doctor_name TEXT DEFAULT 'dr. Harys Maulana';
ALTER TABLE public.screenings ADD COLUMN IF NOT EXISTS father_name TEXT;
ALTER TABLE public.screenings ADD COLUMN IF NOT EXISTS secondary_phone TEXT;
ALTER TABLE public.screenings ADD COLUMN IF NOT EXISTS measurement_date TEXT;
ALTER TABLE public.screenings ADD COLUMN IF NOT EXISTS problem_areas JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.screenings ADD COLUMN IF NOT EXISTS clinical_notes TEXT DEFAULT '';
ALTER TABLE public.screenings ADD COLUMN IF NOT EXISTS free_data JSONB;
ALTER TABLE public.screenings ADD COLUMN IF NOT EXISTS paid_data JSONB;

-- Index untuk performa pencarian dan filter cepat di /rm
CREATE INDEX IF NOT EXISTS idx_screenings_created_at ON public.screenings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_screenings_type ON public.screenings (type);
CREATE INDEX IF NOT EXISTS idx_screenings_status ON public.screenings (status);
CREATE INDEX IF NOT EXISTS idx_screenings_phone ON public.screenings (phone);

-- View Khusus Rekam Medis Asesmen Lengkap (/rm)
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

-- Aktifkan Row Level Security (RLS) & Policies untuk public.screenings
ALTER TABLE public.screenings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Izinkan publik tambah screening" ON public.screenings;
CREATE POLICY "Izinkan publik tambah screening" ON public.screenings
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Izinkan anon baca data screening" ON public.screenings;
CREATE POLICY "Izinkan anon baca data screening" ON public.screenings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Izinkan anon update data screening" ON public.screenings;
CREATE POLICY "Izinkan anon update data screening" ON public.screenings
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Izinkan anon hapus data screening" ON public.screenings;
CREATE POLICY "Izinkan anon hapus data screening" ON public.screenings
  FOR DELETE TO anon, authenticated USING (true);

GRANT ALL ON TABLE public.screenings TO anon, authenticated, service_role;
GRANT SELECT ON public.rm_asesmen_lengkap_view TO anon, authenticated, service_role;


-- ==============================================================================
-- BAGIAN B: TABEL KHUSUS /COMMUNITY & /ADMINCOMMUNITY (TERPISAH 100% DARI /rm)
-- Mencakup: 10 Bagian Asesmen Lengkap (sama dengan /assessment, hanya Nama Ibu)
--           + Bagian 11 Evaluasi 11 Feeding Rules (R1-R11) & Red Flag Klinis
-- Tabel: public.community_assessments
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.community_assessments (
  id TEXT PRIMARY KEY,                                      -- Contoh: LB-COMM-2026-XXXX / COMM-2026-9001
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'Baru',                               -- 'Baru', 'Dalam Review', 'Selesai', 'Follow-Up'
  child_name TEXT NOT NULL,                                 -- Nama Lengkap Anak
  mother_name TEXT NOT NULL,                                -- Nama Ibu (inputan /community hanya meminta Nama Ibu)
  father_name TEXT,                                         -- Nullable / tidak wajib (kompatibilitas data lama)
  phone TEXT NOT NULL,                                      -- No. WhatsApp Ibu
  domisili TEXT,                                            -- Kota / Domisili
  age_text TEXT,                                            -- Usia terkalkulasi otomatis dari DOB
  age_months INTEGER DEFAULT 0,                             -- Total usia dalam bulan
  gender TEXT,                                              -- 'Laki-laki' atau 'Perempuan'
  last_weight TEXT,                                         -- BB Sekarang (kg)
  last_height TEXT,                                         -- TB / PB Sekarang (cm)
  category TEXT NOT NULL,                                   -- 'Prioritas dokter', 'Masalah aturan makan', 'Selective eating', dll.
  recommended_package TEXT,                                 -- Rekomendasi tindak lanjut
  next_step TEXT,                                           -- Langkah konkret berikutnya
  has_red_flags BOOLEAN DEFAULT FALSE,                      -- Apakah ada tanda bahaya medis (Red Flag)
  red_flag_labels JSONB DEFAULT '[]'::jsonb,                -- Daftar Red Flag yang terdeteksi
  violated_rules JSONB DEFAULT '[]'::jsonb,                 -- Array kode R1..R11 yang berstatus 'Perlu koreksi'
  compliant_rules JSONB DEFAULT '[]'::jsonb,                -- Array kode R1..R11 yang berstatus 'Sesuai'
  total_violated_count INTEGER DEFAULT 0,                   -- Total aturan makan yang dilanggar (0-11)
  top3_priority_codes JSONB DEFAULT '[]'::jsonb,            -- Maksimal 3 prioritas koreksi utama (R6, R2, R5, R8, R3, R4, R1, R9, R7, R10, R11)
  home_feeding_is_likely_main_cause BOOLEAN DEFAULT FALSE,  -- TRUE bila >= 6 aturan berstatus 'Perlu koreksi'
  whatsapp_template TEXT,                                   -- Template pesan WhatsApp otomatis untuk Ibu
  reviewer_notes TEXT DEFAULT '',                           -- Catatan review tim di /admincommunity
  form_data JSONB NOT NULL,                                 -- Seluruh jawaban 11 Bagian dari /community (Data Ibu, Anak, Susu, Repertoire 7 kelompok, Oral Motor, Perilaku, Sensorik, 24h Food Recall, Riwayat BB 3 bulan, Keluhan & 3 Pertanyaan Dokter, serta Feeding Rules R1-R11)
  evaluation_result JSONB NOT NULL                          -- Hasil kalkulasi penuh R1-R11, Red Flag, & rekomendasi
);

-- Pastikan seluruh kolom tersedia jika tabel public.community_assessments sudah pernah dibuat sebelumnya
ALTER TABLE public.community_assessments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.community_assessments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Baru';
ALTER TABLE public.community_assessments ADD COLUMN IF NOT EXISTS father_name TEXT;
ALTER TABLE public.community_assessments ADD COLUMN IF NOT EXISTS domisili TEXT;
ALTER TABLE public.community_assessments ADD COLUMN IF NOT EXISTS age_text TEXT;
ALTER TABLE public.community_assessments ADD COLUMN IF NOT EXISTS age_months INTEGER DEFAULT 0;
ALTER TABLE public.community_assessments ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.community_assessments ADD COLUMN IF NOT EXISTS last_weight TEXT;
ALTER TABLE public.community_assessments ADD COLUMN IF NOT EXISTS last_height TEXT;
ALTER TABLE public.community_assessments ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.community_assessments ADD COLUMN IF NOT EXISTS recommended_package TEXT;
ALTER TABLE public.community_assessments ADD COLUMN IF NOT EXISTS next_step TEXT;
ALTER TABLE public.community_assessments ADD COLUMN IF NOT EXISTS has_red_flags BOOLEAN DEFAULT FALSE;
ALTER TABLE public.community_assessments ADD COLUMN IF NOT EXISTS red_flag_labels JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.community_assessments ADD COLUMN IF NOT EXISTS violated_rules JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.community_assessments ADD COLUMN IF NOT EXISTS compliant_rules JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.community_assessments ADD COLUMN IF NOT EXISTS total_violated_count INTEGER DEFAULT 0;
ALTER TABLE public.community_assessments ADD COLUMN IF NOT EXISTS top3_priority_codes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.community_assessments ADD COLUMN IF NOT EXISTS home_feeding_is_likely_main_cause BOOLEAN DEFAULT FALSE;
ALTER TABLE public.community_assessments ADD COLUMN IF NOT EXISTS whatsapp_template TEXT;
ALTER TABLE public.community_assessments ADD COLUMN IF NOT EXISTS reviewer_notes TEXT DEFAULT '';
ALTER TABLE public.community_assessments ADD COLUMN IF NOT EXISTS form_data JSONB;
ALTER TABLE public.community_assessments ADD COLUMN IF NOT EXISTS evaluation_result JSONB;

-- Pastikan father_name tidak NOT NULL (karena form /community terbaru hanya meminta Nama Ibu)
ALTER TABLE public.community_assessments ALTER COLUMN father_name DROP NOT NULL;

-- Index untuk performa filter & pencarian di /admincommunity
CREATE INDEX IF NOT EXISTS idx_comm_assessments_created_at ON public.community_assessments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comm_assessments_category ON public.community_assessments (category);
CREATE INDEX IF NOT EXISTS idx_comm_assessments_status ON public.community_assessments (status);
CREATE INDEX IF NOT EXISTS idx_comm_assessments_phone ON public.community_assessments (phone);

-- View Ringkasan Asesmen Komunitas + Feeding Rules (/community -> /admincommunity)
CREATE OR REPLACE VIEW public.community_assessments_view AS
SELECT
  id,
  created_at,
  updated_at,
  status,
  child_name,
  mother_name,
  phone AS wa_ibu,
  form_data->>'email' AS email_ibu,
  domisili,
  age_text,
  age_months,
  gender,
  last_weight,
  last_height,
  form_data->>'tanggalUkur' AS measurement_date,
  category,
  total_violated_count,
  top3_priority_codes,
  violated_rules,
  compliant_rules,
  has_red_flags,
  red_flag_labels,
  form_data->>'jumlahJenisDiterima' AS jumlah_repertoire,
  form_data->'riwayatBB'->>'bb3BulanLalu' AS bb_3_bulan_lalu,
  form_data->'riwayatBB'->>'bb2BulanLalu' AS bb_2_bulan_lalu,
  form_data->'riwayatBB'->>'bb1BulanLalu' AS bb_1_bulan_lalu,
  form_data->'riwayatBB'->>'bbStagnan' AS bb_stagnan,
  form_data->>'ceritaKondisi' AS cerita_kondisi,
  form_data->>'pertanyaanDokter1' AS pertanyaan_dokter_1,
  form_data->>'pertanyaanDokter2' AS pertanyaan_dokter_2,
  form_data->>'pertanyaanDokter3' AS pertanyaan_dokter_3,
  reviewer_notes,
  form_data,
  evaluation_result
FROM public.community_assessments
ORDER BY created_at DESC;

-- Aktifkan Row Level Security (RLS) & Policies untuk public.community_assessments
ALTER TABLE public.community_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert community_assessments" ON public.community_assessments;
CREATE POLICY "Allow public insert community_assessments" ON public.community_assessments
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select community_assessments" ON public.community_assessments;
CREATE POLICY "Allow public select community_assessments" ON public.community_assessments
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow public update community_assessments" ON public.community_assessments;
CREATE POLICY "Allow public update community_assessments" ON public.community_assessments
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete community_assessments" ON public.community_assessments;
CREATE POLICY "Allow public delete community_assessments" ON public.community_assessments
  FOR DELETE TO anon, authenticated USING (true);

GRANT ALL ON TABLE public.community_assessments TO anon, authenticated, service_role;
GRANT SELECT ON public.community_assessments_view TO anon, authenticated, service_role;


-- ==============================================================================
-- BAGIAN C: AKTIFKAN SUPABASE REALTIME UNTUK KEDUA TABEL (IDEMPOTEN / AMAN DIJALANKAN ULANG)
-- ==============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'screenings'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.screenings;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'community_assessments'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.community_assessments;
    END IF;
  END IF;
END $$;
