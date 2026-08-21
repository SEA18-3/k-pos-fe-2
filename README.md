# 🛍️ K-POS Operator (PWA)

> **Offline-First Point of Sale Application**  
> *Local by default, exactly-once synchronization when it counts.*

[![React](https://img.shields.io/badge/React-19.1-blue.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.1-purple.svg?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg?logo=tailwind-css)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-82%20Passed%20(100%25)-success.svg?logo=vitest)](https://vitest.dev/)
[![PWA](https://img.shields.io/badge/PWA-Ready-orange.svg?logo=pwa)](https://web.dev/progressive-web-apps/)

**K-POS** adalah aplikasi kasir (*Point of Sale*) modern berbasis **Progressive Web App (PWA)** dengan arsitektur **Offline-First**. Dirancang untuk memastikan operasional transaksi toko ritel, restoran, dan UMKM tetap berjalan 100% lancar tanpa hambatan, bahkan saat terjadi pemadaman listrik, koneksi internet mati total, atau di daerah pelosok tanpa sinyal seluler.

---

## ✨ Fitur Utama (*Key Features*)

- ⚡ **100% Offline-First POS Engine**:
  - Scanning & pencarian produk instan dari database lokal browser (IndexedDB).
  - Kalkulasi subtotal, diskon, dan kembalian secara *real-time* di sisi klien.
  - Multi-metode pembayaran: **Tunai**, **QRIS Statis**, dan **Transfer Bank**.
  - Cetak struk belanja via Web Bluetooth / USB Thermal Printer.
- 🔐 **Offline Login (First-Login Caching)**:
  - Kasir dan staf yang pernah login online minimal 1x dapat login kembali saat offline menggunakan email & password yang sama.
  - Verifikasi lokal menggunakan *Salted SHA-256 Cryptographic Hash* via Web Crypto API bawaan browser.
- 👥 **Multi-Role Access Control**:
  - **`OWNER`**: Pengelolaan master katalog produk, harga, stok, manajemen kasir & perangkat, dan penyelesaian dispute rekonsiliasi.
  - **`OPERATOR`**: Antarmuka kasir penjualan cepat, cetak struk, dan riwayat transaksi lokal.
  - **`ENTRY`**: Akses katalog produk secara *read-only* untuk pengecekan stok gudang.
- 📦 **Event-Driven Batch Synchronization**:
  - **Zero Idle Polling**: Menghilangkan polling berkala yang boros daya dan beban database.
  - **Instant Push on Checkout**: Data otomatis terkirim seketika saat kasir konfirmasi penjualan online.
  - **Chunked Streaming Sync**: Menyinkronkan antrean transaksi dalam batch terkontrol (`BATCH_SIZE = 25`) dengan jaminan *Idempotency* via Monotonic `UUID v7`.
- ⚖️ **Reconciliation Desk**:
  - Pelacakan selisih transaksi dan penanganan status `SYNC_CONFLICT`.
  - Audit trail finansial berbasis pola *Immutable Bridge*.
- 🛡️ **Hardened Web Security**:
  - Dilindungi oleh *Content Security Policy* (CSP) ketat (`script-src 'self'`, `object-src 'none'`).
  - *Silent Token Refresh Lifecycle* otomatis di latar belakang saat jaringan pulih.

---

## 🛠️ Teknologi yang Digunakan (*Tech Stack*)

| Layer | Teknologi |
|---|---|
| **Frontend Framework** | [React 19](https://react.dev/) + [React Router v7](https://reactrouter.com/) |
| **Language & Type System** | [TypeScript 5.8 (Strict Mode)](https://www.typescriptlang.org/) |
| **Build Tool & Bundler** | [Vite 7](https://vitejs.dev/) + [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react) |
| **Local Database (Storage)** | [Dexie.js 4](https://dexie.org/) (IndexedDB Wrapper) + `dexie-react-hooks` |
| **State Management** | [Zustand 5](https://github.com/pmndrs/zustand) |
| **Styling & Icons** | [Tailwind CSS v4](https://tailwindcss.com/) + [Radix UI Primitives](https://www.radix-ui.com/) + [Tabler Icons](https://tabler.io/icons) |
| **Schema Validation** | [Zod v4](https://zod.dev/) |
| **PWA & Offline Service Worker** | [Vite Plugin PWA](https://vite-pwa-org.netlify.app/) + [Workbox](https://developer.chrome.com/docs/workbox/) |
| **Testing Suite** | [Vitest 3](https://vitest.dev/) + [React Testing Library](https://testing-library.com/) + `fake-indexeddb` |

---

## 📂 Struktur Direktori Proyek

Aplikasi ini menerapkan prinsip **Feature-Sliced / Screaming Architecture**:

```
k-pos-fe-2/
├── src/
│   ├── app/                          # Core App Shell, Routing, & Global State
│   │   ├── app.tsx                   # Inisialisasi aplikasi, provider, & route guards
│   │   ├── app-shell.tsx             # Layout sidebar, header, & indikator koneksi
│   │   └── ui-store.ts               # Zustand store untuk UI state & keranjang
│   ├── features/                     # Modul Berbasis Domain Fitur (High Cohesion)
│   │   ├── admin-catalog/            # Manajemen katalog produk oleh Owner
│   │   ├── admin-users/              # Manajemen kasir & pairing perangkat
│   │   ├── auth/                     # Autentikasi, login offline, registrasi, & bootstrap
│   │   ├── catalog/                  # Daftar produk & pencarian katalog kasir
│   │   ├── checkout/                 # Keranjang belanja, pembayaran, & builder transaksi
│   │   ├── reconciliation/           # Audit sengketa & rekonsiliasi pembayaran
│   │   ├── sync/                     # Mesin sinkronisasi outbox & scheduler event-driven
│   │   └── transactions/             # Riwayat transaksi lokal & server live
│   ├── infrastructure/               # Layer Data & Komunikasi Eksternal
│   │   ├── api/                      # HTTP client, interceptor, mappers, & error normalization
│   │   └── persistence/              # Dexie IndexedDB models & repository pattern
│   └── shared/                       # Komponen UI Reusable & Utilitas Bersama
│       ├── lib/                      # Currency formatting & helper contracts
│       └── ui/                       # Tombol, input, dialog, card, badge, dll.
├── index.html                        # Entry HTML dengan Content-Security-Policy (CSP)
├── vite.config.ts                    # Konfigurasi Vite & PWA Service Worker
└── package.json
```

---

## 🚀 Panduan Memulai (*Getting Started*)

### 1. Prasyarat Sistem
* **Node.js**: Versi `18.x`, `20.x`, atau yang lebih baru.
* **Package Manager**: `npm` atau `pnpm`.

### 2. Instalasi Dependensi
Clone repository dan pasang seluruh dependensi:
```bash
git clone https://github.com/your-username/k-pos-fe-2.git
cd k-pos-fe-2
npm install
```

### 3. Konfigurasi Environment Variable
Salin template `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```

Sesuaikan konfigurasi pada file `.env`:
```env
# URL Backend NestJS K-POS
VITE_API_URL=http://localhost:3000

# Mode Demo Offline (Opsional: true | false)
VITE_DEMO_MODE=false
```

### 4. Menjalankan Development Server
Jalankan dev server dengan hot-reload:
```bash
npm run dev
```
Aplikasi akan aktif di `http://localhost:5173`.

---

## 🧪 Pengujian & Quality Gates

Project ini dipagari dengan pengujian otomatis yang komprehensif:

```bash
# Menjalankan seluruh Unit & Integration Tests (19 test files / 82 tests)
npm run test

# Menjalankan Strict TypeScript Typecheck
npm run typecheck

# Membangun bundle produksi (Production Build PWA)
npm run build

# Menjalankan preview dari bundle produksi lokal
npm run preview
```

---

## 📄 Lisensi
Project ini dilisensikan di bawah [MIT License](LICENSE).
