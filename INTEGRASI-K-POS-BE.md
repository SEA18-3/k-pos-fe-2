# Checklist Integrasi `k-pos-fe-2` → `k-pos-be` (Backend sebagai Source of Truth)

> Arah adaptasi: **frontend menyesuaikan diri ke kontrak backend `k-pos-be`**.
> Backend tidak diubah untuk mengikuti `@operator/contracts`; kontrak backend
> (`/api/v1`, envelope `{status,message,data}`, login email+password, id
> snake_case, money `Decimal`) menjadi acuan.

## Ringkasan Kontrak Backend (Acuan)

| Aspek | Nilai |
|---|---|
| Base URL dev | `http://localhost:3000` (`PORT=3000`) |
| Prefix | `/api/v1` (kecuali `/health` dan root) |
| Response sukses | `{ status: "success", message: "OK", data: <payload> }` |
| Response error | `{ status: "error", message, data: null, error_details: { statusCode, path, timestamp } }` |
| Auth | `POST /auth/register`, `POST /auth/login` (email+password), `GET /auth/profile`, `POST /auth/refresh`, `POST /auth/logout` |
| Role | `OWNER`, `ADMIN`, `OPERATOR`, `ENTRY` |
| Money | `Decimal(12,2)` → diserialisasi string (`"15000.00"`) |
| ID | snake_case (`id_user`, `id_merchant`, `id_product`, `id_transaction`, `id_device`) |

**Status endpoint backend saat ini:** `auth` (lengkap) dan `products` (lengkap,
multipart upload) sudah jalan. `users`, `merchants`, `devices`, `transactions`,
`payments`, `sync`, `health` masih **scaffold** (hanya balikin string). Task yang
menyentuh endpoint scaffold perlu menunggu implementasi backend.

---

## Bagian A — Fondasi HTTP Client (wajib, blokir semua)

- [ ] **A1. Base URL** — `src/infrastructure/api/http-client.ts`: set default dev
      ke `http://localhost:3000` (atau `VITE_API_URL`).
- [ ] **A2. Prefix path** — ubah semua path `requestJson(...)` dari `/v1/...`
      menjadi `/api/v1/...`:
  - `api-client.ts` (probe `/health` tetap, sync transaksi)
  - `features/auth/auth-api.ts`
  - `features/admin-catalog/admin-catalog-api.ts`
  - `features/admin-users/admin-users-api.ts`
  - `features/reconciliation/reconciliation-api.ts`
- [ ] **A3. Unwrap envelope sukses** — `requestJson`: setelah `response.ok`,
      parse `body.data` (bukan `body`) ke zod schema.
- [ ] **A4. Mapping error** — sesuaikan parser error dari `{status, message,
      data, error_details}` menjadi `ApiError`. Backend tidak mengirim `code` &
      `requestId` → turunkan `code` dari `status`/`message`, set `requestId`
      undefined (sesuaikan `ApiError` agar field opsional).
- [ ] **A5. Demo mode** — pastikan `VITE_DEMO_MODE` mati saat konek backend sungguhan.

## Bagian B — Alur Auth (frontend mengikuti backend)

- [ ] **B1. Login email+password** — `features/auth/auth-api.ts` &
      `features/auth/login-page.tsx`: ganti form merchantCode/operatorCode/PIN
      menjadi `email` + `password`. Hapus alur `activateAndLogin`
      (device register) dan `bootstrapLocalData`.
- [ ] **B2. Model `AuthSession`** — `infrastructure/persistence/models.ts`:
  - simpan `accessToken` + `refreshToken` (dari `{access_token,
    refresh_token, user}`).
  - `operator` ← map `user` (`id_user→id`, `full_name→name`,
    `role`).
  - `merchantId` ← **gap**: respons login/profile backend tidak memuat
    `id_merchant`. Perlu backend menambahkannya (lihat D2) atau frontend
    meminta `POST /merchants` (masih scaffold).
  - `offlineLeaseExpiresAt` & `expiresAt` ← backend tidak punya konsep offline
    lease → hapus/derivasi dari `JWT_EXPIRATION_TIME`.
- [ ] **B3. Perluas tipe role** — `operator.role` dari `"OPERATOR"|"ADMIN"`
      menjadi `"OWNER"|"ADMIN"|"OPERATOR"|"ENTRY"`.
- [ ] **B4. Refresh token flow** — backend punya `POST /auth/refresh`
      (`{ refresh_token }` → `{ access_token }`). Tambah interceptor auto-refresh
      di `http-client.ts` + simpan refresh token di session-repository.
- [ ] **B5. Logout** — `POST /auth/logout` dengan body `{ refresh_token }`
      (backend butuh body, bukan sekadar Bearer).

## Bagian C — Fitur Per Feature

### C1. Catalog (ambil produk dari backend)
- [ ] Ganti `bootstrapLocalData` → `GET /api/v1/products` (Bearer), simpan ke
      IndexedDB via `replaceCatalog`.
- [ ] **Mapper produk** (`snake_case → camelCase`): `id_product→id`,
      `price` (string) → number, `is_active→active`, `updated_at→updatedAt`.
- [ ] **Field tak tersedia** (`description`, `category`, `accent`,
      `lowStockThreshold`, `stock`): backend `Product` hanya punya `name, sku,
      price, image_url, is_active`. Isi default/fallback di mapper.
- [ ] **Stock** — `GET /products` (`products.service.ts:42`) tidak `include`
      Inventory. Gap backend: tambahkan `include: { inventory: true }` (D3).

### C2. Checkout & Transaksi Lokal
- [ ] Pastikan `transaction-builder` / `confirm-sale` tetap menghasilkan transaksi
      lokal; hanya transport sync yang berubah (C3).
- [ ] Kolom `discount`, `tax`, `paymentVerificationType`, `operatorName` tidak ada
      di schema backend (`Transaction` hanya subtotal/total) → sesuaikan payload
      yang dikirim.

### C3. Sync Batch
- [ ] `api-client.ts sendTransactionBatch` → tulis ulang ke kontrak backend:
      `POST /api/v1/sync` dengan `{ transactions: [{ offline_uuid,
      id_device, created_at_local, payment_method, subtotal, total, notes,
      items: [{ id_product, quantity, unit_price, subtotal }], payment:
      { method, amount, cash_received, change_amount, qris_code, transfer_ref }
      }] }`.
- [ ] Unwrap respons `{status,message,data}`; map hasil ke status lokal
      (`ACCEPTED/REJECTED` dari `sync_status` backend).
- [ ] **Gap**: `POST /sync` masih scaffold → menunggu implementasi backend (D5).
- [ ] Sesuaikan `sync-service`/`sync-policy` & UI `sync-page` dengan status
      backend (`PENDING_SYNC, SYNCING, SYNCED, SYNC_FAILED, SYNC_CONFLICT`),
      hapus konsep `settlementStatus PROVISIONAL/SETTLED`.

### C4. Admin Catalog (Produk)
- [ ] `admin-catalog-api.ts` → `GET/POST/PATCH/DELETE /api/v1/products` (Bearer).
- [ ] **Multipart**: POST/PATCH kirim `FormData` (`name`, `sku?`, `price`,
      `image?`) bukan JSON — backend pakai `FileInterceptor`.
- [ ] Archive/restore → ganti dengan `DELETE /products/:id` (soft delete
      `is_active=false`); tidak ada endpoint archive terpisah.
- [ ] Mapper respons sama seperti C1 (unwrap + snake_case + price string→number).

### C5. Admin Users
- [ ] `admin-users-api.ts` → `/api/v1/users` (Bearer). Buat user pakai
      `{ full_name, email, password, role }` (ganti create-operator yang pakai
      code+PIN).
- [ ] Update user → `PATCH /users/:id` (backend pakai `:id` string, bukan
      `+id`; gunakan `id_user`).
- [ ] **Hapus** `resetOperatorPin`, `fetchOperators` (list) — backend users masih
      scaffold; tanpa implementasi backend fitur ini mati (D4).
- [ ] **Device panel** — `/api/v1/devices` masih scaffold & pakai id numerik →
      menunggu backend (D4). `register`/`revoke` tidak ada di backend.

### C6. Rekonsiliasi
- [ ] `reconciliation-api.ts` → sesuaikan ke kontrak backend:
  - void transaksi: `PATCH /transactions/:id/void` `{ void_reason }`
  - koreksi: `POST /transactions/:id/correct` (immutable bridge)
  - conflict resolve: `POST /transactions/:id/resolve` `{ action:
    "CONFIRM"|"VOID", notes }`
- [ ] **Hapus/disable** panel inventory discrepancies & corrections list — backend
      tidak punya endpoint `/inventory/*` maupun `/admin/corrections`.
- [ ] Mapper `TransactionCorrection` → bentuk yang dibutuhkan UI `reconciliation`.

## Bagian D — Gap Backend yang Memblokir (blocker, bukan tugas frontend)

> Karena backend adalah source of truth, frontend bisa menunggu endpoint ini
> selesai di `k-pos-be`. Tanpa ini beberapa fitur frontend tidak bisa jalan.

- [ ] **D1. `/health`** — `health.service.ts` masih scaffold (`"This action
      returns all health"`). Implementasikan status `{ database }` agar
      `probeBackend` & `browser-scheduler` bekerja.
- [ ] **D2. `id_merchant` di auth** — login/profile tidak mengembalikan
      `id_merchant`, padahal frontend butuh `AuthSession.merchantId`.
- [ ] **D3. Inventory di `GET /products`** — `include: { inventory: true }` agar
      frontend dapat `stock`.
- [ ] **D4. Users, Devices, Sync, Transactions** — implementasikan service yang
      sekarang scaffold (create/findAll/update) sesuai `docs/api_contract.md`.
- [ ] **D5. `POST /sync`** — terima batch transaksi, idempotency via
      `offline_uuid` (`@@unique([id_device, offline_uuid])`), balas
      accepted/queued.
- [ ] **D6. Money** — pastikan serialisasi konsisten: backend mengirim
      `Decimal` sebagai string; frontend mem-parse ke number (integer).

## Bagian E — Verifikasi

- [ ] `pnpm typecheck` & `pnpm test` di frontend (perbaiki unit test
      `http-client.test.ts`, `sync-engine.test.ts`).
- [ ] Uji manual alur: register OWNER → login email+password → refresh token →
      logout → list produk → sync transaksi → CRUD produk → void/koreksi.
- [ ] Pastikan offline-first tetap jalan: transaksi tersimpan lokal saat
      offline, tersinkron saat online.

## Catatan Keputusan

1. **Arah adaptasi**: frontend mengikuti kontrak backend. Konsekuensi — fitur
   yang tidak punya padanan di backend (`bootstrap`, `admin/operators`,
   `admin/devices`, `inventory/discrepancies`, offline lease) dihapus/disable
   atau menunggu backend mengimplementasikannya.
2. **Satu titik mapping**: buat modul mapper di `src/infrastructure/api` untuk
   (de)serialisasi snake_case↔camelCase & Decimal↔number agar UI tidak
   berubah banyak.
3. **Status endpoint scaffold**: beberapa task (C3/C5/C6) bersifat "menunggu"
   — selesaikan Bagian A & B dulu, lalu kerjakan feature setelah backend
   melengkapi service-nya.