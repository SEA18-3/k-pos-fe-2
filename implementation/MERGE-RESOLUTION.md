# Merge Resolution — feat/c3-sync → merge/api

> Tanggal: 2026-08-18. Penyelesaian konflik merge `feat/c3-sync` ke `merge/api`
> (cabang saat ini: `merge/api`). Referensi desain: `implementation/C3.md` §5/§8
> dan `implementation/CONTEXT.md`.

## 1. Konteks

Branch `merge/api` menggabungkan kerja dua pihak pada modul sync yang sama:

- **Current (HEAD/`merge/api`)** — hasil `auth-integration` (RyanHandhika,
  commit `1c583a9`/`09e8e5a`): adapter sync lama berbasis `SyncResult[]`,
  `buildTransactionPayload`, `transitionForResult`, `settlementStatus`.
- **Incoming (`feat/c3-sync`)** — hasil C3 (Aido, commit `320d8f2`): desain
  baru berbasis `BackendSyncAck`, `transactionPayload`, `applyAck`, poll
  rekonsiliasi `GET /transactions`.

Merge-base = `d97f558` (C1 catalog). Kedua pihak menulis ulang file yang sama
dari base yang sama → muncul konflik di 4 file.

## 2. Keputusan Resolusi

**Semua konflik diambil sisi incoming (`feat/c3-sync`)** karena:

1. Itu desain C3 yang sudah disepakati di `implementation/C3.md` (hapus
   `SyncResult`/`transitionForResult`, `applyResults`→`applyAck`,
   `sendTransactionBatch`→`BackendSyncAck`).
2. Konsistensi tree: seluruh file yang sudah ter-staged otomatis (models.ts
   dengan `SyncStatus` 5-state + `offlineUuid`, `reconcile.ts`,
   `transaction-api.ts`, `sync-runtime.ts`, `sync-page.tsx`, tests) adalah versi
   C3. Mengambil sisi current akan membuat tree tidak compile
   (`SettlementStatus`, `syncStatus:"FAILED"`, `applyResults` sudah tidak ada).
3. Deliverable Ryan (Bagian A: `http-client.ts`) tidak berkonflik dan tidak
   tersentuh.

## 3. Perubahan per File

### `src/infrastructure/api/api-client.ts` (6 hunk konflik)

File shared (riwayat: init Aido → auth-integration Ryan → C3 Aido).
Resolusi: **dasar incoming**, dengan penyesuaian:

- Pertahankan doc-comment header (penjelasan endpoint).
- **Konvensi import dipertahankan dari current**: `healthResponseSchema` diimport
  dari `@/lib/contracts` (bukan `@operator/contracts` — sesuai
  `src/lib/contracts.ts:5` yang menggantikan dependency `@operator/contracts`).
- `syncResponseSchema` dihapus (tidak terpakai lagi).
- `buildTransactionPayload`/`SyncResult`/`Promise<SyncResult[]>` dibuang →
  diganti `toBackendPaymentMethod` + `transactionPayload(transaction, deviceId)`
  + `backendSyncAckSchema` + `BackendSyncAck`.
- `sendTransactionBatch(session, device, _batchId, transactions)` → `POST
  /api/v1/sync`, return `Promise<BackendSyncAck>`.
- Dipertahankan (identik di kedua sisi): `DEMO_MODE`, `probeBackend`,
  re-export `ApiError`/`API_URL`.

### `src/features/sync/sync-policy.ts` (1 hunk konflik)

- Import cuma `OutboxEntry` (incoming). `SyncStatus`/`SyncResult` dihapus —
  sisa `transitionForResult`/`ResultTransition` yang sudah dibuang oleh C3.

### `src/features/sync/local-sync-repository.ts` (1 hunk konflik)

- Import `BackendSyncAck` (incoming) menggantikan `SyncResult`.
- Sisanya sudah versi C3 (`applyAck`, `SYNC_FAILED`, outbox `SYNCING`).

### `src/features/sync/sync-service.ts` (1 hunk konflik)

- Import `SyncResult` dihapus; `SyncTransport` → `Promise<BackendSyncAck>`,
  `process` memakai `applyAck` (sudah ter-staged dari C3).

## 4. Verifikasi

| Check | Hasil |
|---|---|
| `git diff --check` | OK |
| `npx tsc -b --pretty false` | **green** (exit 0) |
| `npx vitest run` | 22 passed / 3 failed |

### 3 test gagal — **pre-existing, di luar scope C3**

Ketiga kegagalan adalah **stale test**: menguji perilaku lama yang **sengaja
diubah** di file wewenang teman (Bagian A/B), bukan akibat resolusi merge C3.
Ketiga test sudah gagal di cabang `merge/api` sebelum resolusi, dan file sumber
serta file test-nya tidak berubah selama merge.

#### 1. `http-client.test.ts:63` — "uses the local API during development"

- Harapan test: `resolveApiUrl(undefined, true) === "http://localhost:3001"`.
- Implementasi `http-client.ts:16`: mengembalikan `"http://localhost:3000"`.
- Sebab: default dev URL diubah ke port **3000** (backend NestJS berjalan di
  3000; lihat komentar `http-client.ts:15` "bukan 3001"). Test dari commit init
  (`e6b6de0`) belum di-update.
- **Fix (milik teman):** ubah harapan test jadi `3000`.

#### 2. `session-repository.test.ts:25` — "pauses sync after 12 hours…"

- Harapan test: `isOnlineSessionValid(session, afterTokenExpiry) === false`
  (token dianggap kedaluwarsa setelah 12 jam).
- Implementasi `session-repository.ts:20-22`: `expiresAt > now`.
- Sebab: helper `session(now)` di test mengisi `expiresAt` dari **real clock**
  (`Date.now() + 1 jam`, test line 16), bukan dari `now` yang di-inject. Karena
  real clock berjalan lebih maju dari `afterTokenExpiry` (berbasis
  `Date.UTC(2026,7,15)`), `expiresAt` malah **lebih besar** → hasil `true`,
  bukan `false`. Timing test-nya sendiri tidak konsisten terhadap argumen `now`.

#### 3. `session-repository.test.ts:31` — "blocks only new checkout after the offline lease expires"

- Harapan test: `isOfflineCheckoutAllowed(session, now + OFFLINE_LEASE_MS + 1)
  === false`.
- Implementasi `session-repository.ts:24-26` (hasil refactor `auth-integration`
  Ryan, commit `1c583a9`):
  ```ts
  return isOnlineSessionValid(session, now) // Fallback ke sesi online biasa karena offline_lease ditiadakan
  ```
- Sebab: konsep **offline lease (12 jam sync / 72 jam checkout) dihapus total**;
  fungsi kini murni alias dari `isOnlineSessionValid`, sehingga selalu mengikuti
  masa berlaku token. Test masih menguji semantik lease lama → gagal.
- **Fix (milik teman):** rombak/hapus test offline lease agar selaras dengan
  perilaku baru (atau kembalikan mekanisme lease bila memang dibutuhkan).

Keduanya menyentuh file wewenang teman (Bagian A/B) → **tidak diperbaiki di sini**
(per `CONTEXT.md`, dilarang mengubah file tersebut). Seluruh test C3 hijau:
`sync-engine.test.ts` (7), `checkout-service.test.ts` (4),
`transaction-builder.test.ts` (2).

## 5. Catatan Runtime

A2/A3 (prefix `/api/v1` + unwrap `body.data` di `http-client.ts`) belum ada di
tree ini, sehingga `sendTransactionBatch`/`fetchTransactions` belum bisa
di-run end-to-end sampai Bagian A Ryan di-merge — sesuai catatan `C3.md` §10.
Kode benar secara tipe.

## 6. Commit

- `git add` 4 file resolusi + dokumen ini.
- Commit: finalisasi merge `feat/c3-sync` ke `merge/api`.