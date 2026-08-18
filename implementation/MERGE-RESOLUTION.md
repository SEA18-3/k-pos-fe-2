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

- `src/infrastructure/api/http-client.test.ts > resolveApiUrl > uses the local
  API during development` — file dari init (`e6b6de0`), tidak berubah di merge.
- `src/infrastructure/persistence/session-repository.test.ts > offline session
  lease` (2 test) — terakhir diubah `auth-integration` Ryan (`1c583a9`),
  semantik lease berubah tanpa update test.

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