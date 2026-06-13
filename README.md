# AETHERA UMKM

Progressive Web App (PWA) untuk pencatatan omset penjualan & pembelian UMKM. Ringan, **offline-first**, dan jalan di semua perangkat tanpa install dari app store.

Dibangun mengikuti PRD v1.0.0 (Fase 1 — MVP).

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Styling | Tailwind CSS v4 + design tokens (tema gelap/terang) |
| Animasi | GSAP 3 |
| Database lokal | SQLite via `sql.js` (WASM) + persistensi IndexedDB |
| State | Zustand |
| Charting | Recharts |
| Form & Validasi | React state + Zod |
| Export | jsPDF (PDF) + PapaParse (CSV) |
| Ikon | Lucide React |

> **Catatan deviasi dari PRD:** PRD menyebut Drizzle ORM. Karena database berjalan
> sepenuhnya di browser melalui `sql.js`, Drizzle menambah kompleksitas tanpa manfaat
> nyata, sehingga query ditulis langsung di atas `sql.js` menggunakan skema & query
> persis dari PRD bagian 11. Versi Next.js/Tailwind juga lebih baru dari PRD namun kompatibel.

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build produksi
npm run start    # jalankan hasil build
```

## Fitur (Fase 1 — MVP)

- **Onboarding**: setup nama usaha, jenis, pemilik, pilih tema.
- **Dashboard**: ringkasan penjualan/pembelian/laba hari ini (counter animasi), tren 7 hari, transaksi terbaru, aksi cepat.
- **Penjualan & Pembelian**: CRUD penuh, filter periode, pencarian, sortir, swipe-to-action di mobile, autocomplete produk, format Rupiah otomatis.
- **Produk & Kategori**: kelola produk (harga jual/beli, satuan, aktif/nonaktif) dan kategori.
- **Laporan**: harian / mingguan / bulanan / kustom, grafik tren & perbandingan, donut kategori, produk terlaris, ekspor **PDF & CSV** (client-side).
- **Pengaturan**: profil usaha, tema (gelap/terang/sistem), backup `.db`, restore, reset data.
- **PWA**: manifest, ikon, service worker (app shell + cache aset & WASM), banner offline, shortcuts.

## Struktur Singkat

```
app/
  (app)/            # shell dashboard (sidebar + bottom nav + FAB)
    dashboard/ penjualan/ pembelian/ produk/ laporan/ pengaturan/
  onboarding/
components/         # ui/, forms/, charts/, layout/
lib/
  db/              # client sql.js, schema, queries per modul
  stores/          # zustand stores
  utils/           # format rupiah/tanggal, ranges, export
  animations/      # helper GSAP
public/
  sql-wasm/        # sql-wasm.wasm + loader
  icons/           # ikon PWA
  manifest.json  sw.js
```

## Privasi

Semua data tersimpan **lokal** di perangkat (IndexedDB). Tidak ada data yang dikirim ke
server. Backup berkala disarankan via menu Pengaturan.

## Fitur Lanjutan (v2.0 — Fase 3 & 4)

Semua fitur berikut berjalan client-side / offline-first kecuali yang ditandai.

### Manajemen Stok
- Aktifkan "Lacak Stok" per produk + batas stok menipis.
- Stok otomatis berkurang saat penjualan, bertambah saat pembelian.
- Halaman **Stok** (`/stok`) untuk pantau & adjust manual (+/-).
- Alert stok menipis muncul di Dashboard dan halaman Stok.

### Laporan Laba Rugi (P&L)
- Di halaman **Laporan**: laba per produk (omset - HPP), ringkasan Omset/HPP/Laba kotor.

### Multi-channel
- Tag setiap penjualan dengan saluran (Langsung, GoFood, GrabFood, ShopeeFood, WhatsApp, Tokopedia, Shopee).
- Laporan "Omset per Saluran" dengan bar proporsional.

### Target Omset & Gamifikasi
- Set target harian/bulanan di Pengaturan → progress bar di Dashboard.
- Sistem **Pencapaian** (achievement) yang ter-unlock otomatis + toast notifikasi.

### Transaksi Berulang
- Halaman **Berulang** (`/berulang`): template transaksi rutin (sewa, gaji, langganan).
- Jalan otomatis saat jatuh tempo (saat app dibuka) atau sekali klik (⚡).

### Kalkulator Harga Jual
- Di form Produk: hitung harga jual dari HPP + margin/markup + biaya operasional.

### Input via Foto Nota (OCR)
- Tombol kamera di form transaksi → Tesseract.js (offline) deteksi nominal total dari foto struk.

### Barcode / QR Scanner
- Scan barcode produk via kamera (html5-qrcode) untuk mengisi field SKU/barcode.

### Cetak Struk
- Tombol printer pada daftar penjualan → struk thermal-style PDF (80mm).

### Bagikan ke WhatsApp
- Tombol share di Dashboard → ringkasan harian terformat dikirim via `wa.me` deep link.

### AI Insight (OpenRouter)
- Halaman **AI Insight** (`/insight`): analisis bisnis (ringkasan, temuan, rekomendasi).
- Data bisnis diringkas lokal lalu dikirim ke model OpenRouter pilihan.
- **Perlu API key** OpenRouter (gratis dibuat di openrouter.ai), dimasukkan di Pengaturan, disimpan lokal.

### Keamanan PIN
- Kunci aplikasi dengan PIN 6 digit (hash SHA-256 lokal). Lock screen saat app dibuka.

### Cloud Sync (Opsional — perlu backend)
- Sinkronisasi snapshot SQLite ke endpoint REST milik sendiri (PUT/GET).
- Last-write-wins. Cocok untuk Cloudflare R2, Supabase Storage, atau serverless function.
- Kontrak endpoint:
  - `PUT {url}` body biner db, header `x-sync-key` → simpan snapshot
  - `GET {url}` header `x-sync-key` → kembalikan snapshot biner

## Dependency tambahan v2.0
- `tesseract.js` — OCR nota (WASM, offline)
- `html5-qrcode` — barcode/QR scanner kamera

## Fase 4 — Ekspansi (Cloud, Kolaborasi, Monetisasi)

### Versi Premium / Berlangganan
- Halaman **Premium** (`/premium`): perbandingan paket + aktivasi license key.
- Lisensi divalidasi **offline** (HMAC-SHA256, format `payload.signature`). Tersedia tombol "Coba Gratis 30 Hari".
- Gating fitur via komponen `PremiumGate`. Fitur premium: AI Insight, Cloud Sync, Multi-pengguna, Laporan Pajak, Webhook, Produk tanpa batas (gratis maks 20 produk).
- ⚠️ Catatan: gate bersifat *soft* (client-side). Untuk enforcement keras, validasi ke server lisensi.

### Multi-pengguna (Kasir & Pemilik)
- Halaman **Pengguna** (`/pengguna`, premium): kelola akun kasir/pemilik dengan PIN masing-masing.
- Transaksi penjualan mencatat `cashier_id` & `cashier_name` (kolom baru).

### Laporan Pajak UMKM
- Halaman **Pajak** (`/pajak`, premium): PPh Final UMKM 0,5% (PP 55/2022).
- Hitung omset & pajak bulanan + fasilitas bebas pajak Rp500jt/tahun pertama (WP OP).

### Integrasi QRIS (dinamis dari QRIS statis)
- Tempel kode QRIS statis merchant di Pengaturan → app generate QR **dinamis** dengan nominal otomatis (inject tag 54 + recompute CRC16).
- Muncul saat metode bayar = QRIS di form penjualan. Tidak ada dana lewat aplikasi — pelanggan bayar via app bank/e-wallet sendiri.
- CRC16-CCITT terverifikasi (test vector `123456789` → `29B1`).

### Integrasi API / Webhook
- Pengaturan Webhook (premium): kirim event `sale.created`, `purchase.created`, dll via HTTP POST ke endpoint mana pun (Zapier, spreadsheet, backend).
- Header `x-webhook-secret` opsional + log pengiriman.

### Cloud Sync (premium)
- (dari v2.0) Sinkronisasi snapshot SQLite antar perangkat via endpoint REST sendiri.

## Dependency tambahan Fase 4
- `qrcode` — render QR dinamis QRIS

## Cara menerbitkan License Key (untuk admin)
Key dibuat dengan `generateLicense({ name, plan: "premium", exp })` dari `lib/premium/license.ts`
(payload base64url + HMAC-SHA256 truncated). `exp` epoch ms atau `null` untuk lifetime.
