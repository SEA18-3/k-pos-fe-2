/**
 * reconciliation-api.ts
 *
 * Mengintegrasikan fitur rekonsiliasi dengan endpoint backend K-POS.
 *
 * Endpoint backend yang digunakan:
 *  - GET  /api/v1/transactions?sync_status=SYNC_CONFLICT — transaksi berkonflik
 *  - GET  /api/v1/transactions                           — semua transaksi
 *  - POST /api/v1/transactions/:id/resolve               — selesaikan konflik
 *  - POST /api/v1/transactions/:id/correct               — koreksi transaksi CONFIRMED
 */

import { z } from "zod"
import { requestJson } from "@/infrastructure/api/http-client"
import type { AuthSession } from "@/infrastructure/persistence/models"

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const backendPaymentSchema = z.object({
  id_payment: z.string(),
  amount: z.string().or(z.number()),
  method: z.enum(["CASH", "STATIC_QRIS", "BANK_TRANSFER"]),
  status: z.enum(["PENDING", "VERIFIED", "FAILED", "RECONCILED"]),
  cash_received: z.string().or(z.number()).nullable().optional(),
  change_amount: z.string().or(z.number()).nullable().optional(),
  qris_code: z.string().nullable().optional(),
  transfer_ref: z.string().nullable().optional(),
  verified_at: z.string().nullable().optional(),
  verified_by: z.string().nullable().optional(),
  reconciliation_note: z.string().nullable().optional(),
})

const backendTransactionSchema = z.object({
  id_transaction: z.string(),
  id_merchant: z.string(),
  id_user: z.string(),
  id_device: z.string(),
  offline_uuid: z.string().nullable().optional(),
  status: z.enum(["PENDING", "CONFIRMED", "VOIDED", "FAILED"]),
  sync_status: z.enum(["PENDING_SYNC", "SYNCING", "SYNCED", "SYNC_FAILED", "SYNC_CONFLICT"]),
  subtotal: z.string().or(z.number()),
  total: z.string().or(z.number()),
  notes: z.string().nullable().optional(),
  created_at_local: z.string().nullable().optional(),
  created_at: z.string(),
  confirmed_at: z.string().nullable().optional(),
  synced_at: z.string().nullable().optional(),
  voided_at: z.string().nullable().optional(),
  voided_by: z.string().nullable().optional(),
  void_reason: z.string().nullable().optional(),
  payment: backendPaymentSchema.nullable().optional(),
})

export type BackendTransaction = z.output<typeof backendTransactionSchema>

const transactionListResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  data: z.object({
    data: z.array(backendTransactionSchema),
    meta: z.object({
      next_cursor: z.string().nullable(),
      limit: z.number(),
    }),
  }),
})

const resolveResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  data: z.object({
    message: z.string().optional(),
    data: backendTransactionSchema.optional(),
  }).passthrough(),
})

const correctItemSchema = z.object({
  id_product: z.string(),
  quantity: z.number(),
  unit_price: z.number(),
  subtotal: z.number(),
})

const correctionResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  data: z.object({
    message: z.string().optional(),
    data: z.object({
      id_correction: z.string(),
      id_old_transaction: z.string(),
      id_new_transaction: z.string(),
      corrected_by: z.string(),
      reason: z.string(),
      created_at: z.string(),
    }).optional(),
  }).passthrough(),
})

// ---------------------------------------------------------------------------
// Payment Reconciliation Case Schemas (GET /api/v1/reconciliations)
// ---------------------------------------------------------------------------

export const backendReconciliationCaseSchema = z.object({
  id_reconciliation: z.string(),
  id_payment: z.string(),
  status: z.enum(["OPEN", "RESOLVED_VALID", "RESOLVED_INVALID"]),
  reason: z.string(),
  evidence_note: z.string().nullable().optional(),
  opened_by: z.string(),
  created_at: z.string(),
  resolved_at: z.string().nullable().optional(),
  resolved_by: z.string().nullable().optional(),
  resolution_note: z.string().nullable().optional(),
  payment: z
    .object({
      id_payment: z.string(),
      amount: z.string().or(z.number()),
      method: z.string(),
      transaction: z
        .object({
          id_transaction: z.string(),
          offline_uuid: z.string().nullable().optional(),
          total: z.string().or(z.number()),
        })
        .optional()
        .nullable(),
    })
    .optional()
    .nullable(),
  openedByUser: z.object({ full_name: z.string() }).optional().nullable(),
  resolvedByUser: z.object({ full_name: z.string() }).optional().nullable(),
})

export type BackendReconciliationCase = z.output<typeof backendReconciliationCaseSchema>

export const reconciliationListResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  data: z.array(backendReconciliationCaseSchema),
})

export const resolveReconciliationResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  data: z
    .object({
      id_reconciliation: z.string().optional(),
      status: z.string().optional(),
      resolution_note: z.string().optional(),
    })
    .passthrough(),
})

// ---------------------------------------------------------------------------
// Request Types
// ---------------------------------------------------------------------------

export type CreateCorrectionRequest = {
  reason: string
  items: Array<{
    id_product: string
    quantity: number
    unit_price: number
    subtotal: number
  }>
  subtotal: number
  total: number
}

export type ResolveConflictRequest = {
  action: "CONFIRM" | "VOID"
  notes?: string
}

export type ResolveReconciliationCaseRequest = {
  resolution: string
  status?: "RESOLVED_VALID" | "RESOLVED_INVALID"
}

export type CreateReconciliationCaseRequest = {
  id_transaction: string
  reason: string
  evidence?: string
}

export type CorrectionRecord = {
  id_correction: string
  id_old_transaction: string
  id_new_transaction: string
  corrected_by: string
  reason: string
  created_at: string
}

export type InventoryDiscrepancy = {
  id: string
  description: string
}

// ---------------------------------------------------------------------------
// API Functions (disesuaikan dengan endpoint backend K-POS)
// ---------------------------------------------------------------------------

/** Ambil semua transaksi (bisa difilter dengan query params) */
export function fetchBackendTransactions(
  session: AuthSession,
  params: { sync_status?: string; limit?: number } = {},
) {
  const query = new URLSearchParams()
  if (params.sync_status) query.set("sync_status", params.sync_status)
  if (params.limit) query.set("limit", String(params.limit))
  const qs = query.toString() ? `?${query.toString()}` : ""
  return requestJson(`/api/v1/transactions${qs}`, transactionListResponseSchema, {}, session.token)
}

/** Selesaikan satu transaksi SYNC_CONFLICT secara manual (CONFIRM atau VOID) */
export function resolveConflict(
  session: AuthSession,
  transactionId: string,
  input: ResolveConflictRequest,
) {
  return requestJson(
    `/api/v1/transactions/${encodeURIComponent(transactionId)}/resolve`,
    resolveResponseSchema,
    { method: "POST", body: JSON.stringify(input) },
    session.token,
  )
}

/** Buat koreksi pada transaksi CONFIRMED (Immutable Bridge pattern) */
export function createCorrection(
  session: AuthSession,
  transactionId: string,
  input: CreateCorrectionRequest,
) {
  return requestJson(
    `/api/v1/transactions/${encodeURIComponent(transactionId)}/correct`,
    correctionResponseSchema,
    { method: "POST", body: JSON.stringify(input) },
    session.token,
  )
}

/** Ambil semua kasus rekonsiliasi pembayaran milik merchant (Khusus OWNER) */
export function fetchReconciliations(session: AuthSession) {
  return requestJson("/api/v1/reconciliations", reconciliationListResponseSchema, {}, session.token)
}

/** Buka kasus rekonsiliasi pembayaran baru */
export function createReconciliationCase(
  session: AuthSession,
  input: CreateReconciliationCaseRequest,
) {
  return requestJson(
    "/api/v1/reconciliations",
    resolveReconciliationResponseSchema,
    { method: "POST", body: JSON.stringify(input) },
    session.token,
  )
}

/** Selesaikan kasus rekonsiliasi pembayaran (RESOLVED_VALID / RESOLVED_INVALID) (Khusus OWNER) */
export function resolvePaymentReconciliation(
  session: AuthSession,
  reconciliationId: string,
  input: ResolveReconciliationCaseRequest,
) {
  return requestJson(
    `/api/v1/reconciliations/${encodeURIComponent(reconciliationId)}/resolve`,
    resolveReconciliationResponseSchema,
    { method: "POST", body: JSON.stringify(input) },
    session.token,
  )
}
