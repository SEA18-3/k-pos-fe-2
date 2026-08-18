# Progress Implementasi C1–C3 (`k-pos-fe-2` → `k-pos-be`)

> Update: 2026-08-17. Dokumen ini merangkum progres nyata di working tree
> berdasarkan `CONTEXT.md`, `BACKEND_ENDPOINT.md`, dan `c1-c3-tasks.md`.
> Referensi kontrak HTTP ada di `implementation/BACKEND_ENDPOINT.md`.

## Ringkasan Status

| Bagian | Status | Catatan |
|---|---|---|
| **C1 — Catalog** | SELESAI (committed) | Perlu A2/A3 teman sebelum bisa di-run |
| **C2 — Checkout lokal** | ANALISIS SELESAI, no-op | Verifikasi + kontrak, tidak ada kode berubah |
| **C3 — Sync Batch** | SELESAI (belum di-commit) | Butuh A2/A3 teman sebelum bisa di-run. Detail di `implementation/C3.md` |

## State Git

- Branch saat ini: **`feat/c1-catalog`** (dibuat dari `api/catalog`).
- Commit C1: **`d97f558`** — `feat(catalog): implement C1 backend product catalog integration` (4 file, +77/-8).
- File referensi `INTEGRASI-K-POS-BE.md` & `implementation/` **tidak di-commit** (tetap untracked).
- `api/catalog` juga menunjuk ke commit C1 yang sama.

---

## C1 — Catalog (SELESAI)

Tujuan: ambil produk dari `GET /api/v1/products` (backend source of truth) dan
simpan ke Dexie lokal via mapper bersama.

### Perubahan per subtask

**C1.4 — `src/infrastructure/persistence/models.ts`**
- Tambah `imageUrl?: string` ke `Product` (optional, aman untuk teman/C4).

**C1.1 — `src/infrastructure/api/mappers.ts`** (BARU, shared dgn C4)
- `type BackendProduct` = bentuk snake_case dari backend
  (`id_product, id_merchant, name, sku, price:string, image_url, is_active,
  created_at, updated_at`).
- `mapProduct(b: BackendProduct): Product` — mapping:
  `id_product→id`, `price`(string)→`decimalToNumber`, `is_active→active`,
  `updated_at→updatedAt`, `image_url→imageUrl`.
- Fallback lokal: `description:""`, `category:""`, `accent:"#64748b"`
  (bukan `"#..."` agar valid CSS), `lowStockThreshold:0`, `stock:0` (D3),
  `featured:false`.
- Helper `decimalToNumber`, `snakeToCamel`.

**C1.2 — `src/features/catalog/catalog-api.ts`** (BARU)
- `backendProductSchema` (zod, snake_case) + `backendProductListSchema`
  (`z.array(...)`).
- `fetchCatalogProducts(token, search?)` → `GET /api/v1/products?search=...`
  via `requestJson`. Hanya query `search` (sesuai kontrak; tidak ada
  `page`/`limit`/`is_active`). Tidak menyentuh `http-client.ts`.

**C1.3 — `src/features/catalog/catalog-refresh.ts`**
- `refreshActiveCatalog` ditulis ulang: ambil `session` →
  `fetchCatalogProducts(session.token)` → `replaceCatalog(products.map(mapProduct))`.
- Lepas import `auth-api` (`bootstrapLocalData` dihapus teman di B1) &
  `device-repository` (endpoint produk tak butuh `id_device`).

### Verifikasi
- `tsc -b --pretty false` → **bersih, tanpa error**.

### Risiko / Prasyarat (BELUM TERPELAJARI)
- **A2/A3 dari teman (Bagian A) belum di-merge** di working tree ini:
  - A2: prefix `/api/v1` pada `API_URL`/`requestJson`.
  - A3: `requestJson` harus **unwrap `body.data`** (TransformInterceptor
    backend membungkus response jadi `{status,message,data}`).
  - Sampai A3 ada, `refreshActiveCatalog` akan gagal validasi zod (envelope
    belum di-unwrap) — kode benar, tapi belum bisa di-run.
- `apiErrorResponseSchema` (`@operator/contracts`) **wajib** `code`+`requestId`,
  padahal backend kirim `error_details{statusCode,path,timestamp}` tanpa
  keduanya → error backend belum ter-parse benar sampai A3 beres (di luar scope C1).

---

## C2 — Checkout & Transaksi Lokal (ANALISIS SELESAI, NO-OP)

Tujuan awal: pastikan transaksi tetap lokal/offline-first dan field yang tak
ada di backend dibuang saat disusun payload sync.

### Temuan
- **C2.1 — Offline-first terbukti utuh**
  - `buildLocalTransaction` (`transaction-builder.ts:23`): fungsi murni,
    bangun `LocalTransaction` di memori, tanpa network.
  - `confirmSale` (`confirm-sale.ts:16`): hanya `getAuthSession`,
    `getOrCreateDeviceIdentity`, `commitLocalSale`, `draftPersistence.flush`
    — **semuanya Dexie/local**.
  - Grep `fetch|requestJson|api-client|http-client` di `src/features/checkout/**`
    → **0 hasil**.
- **C2.2 — Field lokal sudah sesuai (kontrak, bukan kode C2)**
  - `LocalTransaction` (`models.ts:31`) **sudah** menyimpan `discount`,
    `paymentVerificationType`, `operatorName` secara lokal.
  - `tax` **tidak ada** di model (hanya hardcode `tax:0` di payload lama
    `api-client.ts:27` yang akan ditulis ulang di C3.1). Tak ada field `tax`
    untuk dibuang.
  - Pemangkasan field saat menyusun payload sync = tugas **C3.1**, bukan C2.
- **C2.3 — UI checkout: tidak ada yang dilindungi**
  - Grep `discount|tax|pajak|Diskon|Pajak` di `src/features/checkout/**/*.tsx`
    → **0 hasil**. UI saat ini tak menampilkan diskon/pajak.

### Kesimpulan C2
**Tidak ada file yang diubah.** C2 murni verifikasi + kontrak.

### Catatan lintas-task
Penambahan `offlineUuid` (v4) ke `LocalTransaction` + set di `confirmSale`
dijadwalkan di **C3.4** (bukan C2), meski menyentuh file `confirm-sale.ts`
milik C2. Akan dikerjakan saat C3.

---

## C3 — Sync Batch (BELUM DIMULAI)

Backend `/sync` **SUDAH IMPLEMENTED** (RabbitMQ async) per `BACKEND_ENDPOINT.md`
§2 — tidak lagi menunggu D5. Sub-task dari `c1-c3-tasks.md`:
C3.4 (model status) → C3.1 (transport + `offlineUuid` v4) → C3.2 (unwrap ack)
→ C3.3 (policy) → C3.6 (retry idempoten) → C3.8 (poll rekonsiliasi)
→ C3.5 (UI) → C3.7 (test).

Prasyarat sebelum C3 dijalankan:
1. **A2/A3 teman di-merge** (sama seperti C1).
2. **C3.4**: perluas `SyncStatus` → `PENDING_SYNC|SYNCING|SYNCED|SYNC_FAILED|
   SYNC_CONFLICT` (hapus `SettlementStatus`) + tambah `offlineUuid: string` di
   `LocalTransaction` (di-set v4 di `confirmSale`).

---

## Blocker / Dependency (status)

| ID | Isu | Status | Dampak |
|---|---|---|---|
| A2/A3 | prefix `/api/v1` + unwrap `body.data` | BELUM (milik teman) | C1 & C3 belum bisa di-run |
| D2 | `merchantId` dari decode JWT | menunggu teman (B2) | C3 butuh `session.merchantId` |
| D3 | `stock` belum di response produk | sudah di-handle (fallback `0`) | C1 aman |
| D5 | `POST /sync` | SUDAH IMPLEMENTED | C3 lanjut tanpa nunggu |
| D6 | Money asimetris (req number / res string) | sudah diketahui | C3 kirim number, `parseFloat` baca res |
