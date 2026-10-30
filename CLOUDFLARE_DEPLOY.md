# Panduan Deploy & Update ke GitHub & Cloudflare Pages
Domain Target: `screening.littlebitefeeding.com`

---

## Mengapa `/community`, `/admincommunity`, atau `/rm` Menampilkan 404 di `screening.littlebitefeeding.com`?

Perubahan yang dibuat di **Google AI Studio** tersimpan di workspace AI Studio dan **belum otomatis ter-push ke GitHub (`teamkreatiftka-web/screening`)**. Akibatnya, Cloudflare Pages (`screening.littlebitefeeding.com`) masih menampilkan versi commit lama yang hanya memiliki rute `/`, `/assessment`, dan `/admin`.

Agar rute baru (`/community`, `/admincommunity`, dan `/rm`) langsung aktif di **`https://screening.littlebitefeeding.com`**, lakukan **1 langkah sinkronisasi ke GitHub** di bawah ini:

---

## Langkah 1: Sinkronkan / Push Update dari AI Studio ke GitHub

### Cara A (Langsung dari Google AI Studio):
1. Klik ikon **GitHub (Save to GitHub / Export to GitHub)** di bagian atas Google AI Studio.
2. Pilih repository GitHub Anda (`teamkreatiftka-web/screening`) dan branch `main`.
3. Commit & Push perubahan terbaru.
4. Begitu ter-push ke GitHub, **Cloudflare Pages** akan otomatis mem-build ulang dalam ~1 menit dan mengaktifkan semua rute baru di `screening.littlebitefeeding.com`!

### Cara B (Jika Download ZIP / Push via Terminal):
```bash
git add .
git commit -m "feat: add /community, /admincommunity, and /rm with separate Supabase tables"
git push origin main
```

---

## Langkah 2: Konfigurasi Build di Cloudflare Pages (`screening.littlebitefeeding.com`)

Pastikan di dashboard Cloudflare (**Workers & Pages** > project Anda > **Settings** > **Builds & deployments**):
- **Framework preset**: `Next.js (Static HTML Export)`
- **Build command**: `npm run build`
- **Build output directory**: `out`
- **Environment variables**: `NODE_VERSION` = `20`

Jika perlu memicu ulang deploy tanpa commit baru: buka tab **Deployments** di Cloudflare Pages > klik **Retry deployment** pada deployment paling atas.

---

## Daftar Rute Lengkap yang Tersedia:
- **`https://screening.littlebitefeeding.com/`** : Skrining Makan Singkat Gratis (Lead Magnet)
- **`https://screening.littlebitefeeding.com/community/`** : Form Asesmen Kebiasaan & Aturan Makan Anak (11 Bagian & 11 Aturan R1–R11)
- **`https://screening.littlebitefeeding.com/admincommunity/`** : Dashboard Admin Community (Tabel `public.community_assessments` terpisah)
- **`https://screening.littlebitefeeding.com/rm/`** : Dashboard Rekam Medis Calescence Admin & Inbox Dokter (Sandi: `faceb00k`, Tabel `public.screenings`)
- **`https://screening.littlebitefeeding.com/assessment/`** : Asesmen Lengkap 10 Bagian (Berbayar)
- **`https://screening.littlebitefeeding.com/admin/`** : Dashboard Admin Lama (PIN: `admin123`)

