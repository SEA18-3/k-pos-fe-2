/**
 * reconciliation-api.ts
 *
 * Mengintegrasikan fitur rekonsiliasi dengan endpoint backend K-POS.
 */

import { z } from "zod"
import { requestJson } from "@/infrastructure/api/http-client"
import type { AuthSession } from "@/infrastructure/persistence/models"

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

export const backendTransactionSchema = z.object({
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
})

export type BackendTransaction = z.output<typeof backendTransactionSchema>

export const reconciliationSchema = z.object({
  id_reconciliation: z.string(),
  id_payment: z.string(),
  opened_by: z.string(),
  reason: z.string(),
  evidence_note: z.string().nullable().optional(),
  status: z.enum(["OPEN", "RESOLVED_VALID", "RESOLVED_INVALID"]),
  resolved_by: z.string().nullable().optional(),
  resolved_at: z.string().nullable().optional(),
  resolution_note: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string().optional(),
  payment: backendPaymentSchema.extend({
    transaction: backendTransactionSchema.optional(),
  }).optional().nullable(),
  openedByUser: z.object({ full_name: z.string() }).optional().nullable(),
  resolvedByUser: z.object({ full_name: z.string() }).optional().nullable(),
})

export type ReconciliationRecord = z.output<typeof reconciliationSchema>

export const reconciliationListResponseSchema = z.object({
  status: z.string().optional(),
  message: z.string().optional(),
  data: z.array(reconciliationSchema),
})

export const reconciliationResponseSchema = z.object({
  status: z.string().optional(),
  message: z.string().optional(),
  data: reconciliationSchema,
})

export const transactionListResponseSchema = z.object({
  status: z.string().optional(),
  message: z.string().optional(),
  data: z.array(backendTransactionSchema),
})

export const resolveResponseSchema = z.object({
  status: z.string().optional(),
  message: z.string().optional(),
  data: backendTransactionSchema.optional(),
})

export const resolveReconciliationResponseSchema = z.object({
  status: z.string().optional(),
  message: z.string().optional(),
  data: reconciliationSchema.optional(),
})

export const correctionResponseSchema = z.object({
  status: z.string().optional(),
  message: z.string().optional(),
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
// Request Types
// ---------------------------------------------------------------------------

export type CreateCorrectionRequest = {
  reason: string
  notes?: string
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
// API Functions
// ---------------------------------------------------------------------------

/** Ambil semua kasus rekonsiliasi pembayaran milik merchant (Khusus OWNER) */
export function fetchReconciliations(session: AuthSession) {
  return requestJson("/api/v1/reconciliations", reconciliationListResponseSchema, {}, session.token)
}

/** Buka kasus rekonsiliasi baru */
export function openReconciliation(
  session: AuthSession,
  input: { id_transaction: string; reason: string; evidence_note?: string },
) {
  return requestJson(
    "/api/v1/reconciliations",
    reconciliationResponseSchema,
    { method: "POST", body: JSON.stringify(input) },
    session.token,
  )
}

/** Buka kasus rekonsiliasi baru (alias) */
export const createReconciliationCase = openReconciliation

/** Selesaikan kasus rekonsiliasi pembayaran */
export function resolveReconciliation(
  session: AuthSession,
  reconciliationId: string,
  input: { status?: "RESOLVED_VALID" | "RESOLVED_INVALID"; resolution: string },
) {
  return requestJson(
    `/api/v1/reconciliations/${encodeURIComponent(reconciliationId)}/resolve`,
    resolveReconciliationResponseSchema,
    {
      method: "POST",
      body: JSON.stringify({
        resolution: input.resolution,
        status: input.status ?? "RESOLVED_VALID",
      }),
    },
    session.token,
  )
}

/** Selesaikan kasus rekonsiliasi pembayaran (alias) */
export const resolvePaymentReconciliation = resolveReconciliation

/** Ambil daftar transaksi dari backend */
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

/** Alias createCorrection */
export const correctTransaction = createCorrection

const reconciliationHistoryResponseSchema = z.object({
  payment_id: z.string(),
  transaction_id: z.string(),
  history: z.array(reconciliationSchema),
}).passthrough()

export type ReconciliationHistoryData = z.output<typeof reconciliationHistoryResponseSchema>

/** Fetch riwayat rekonsiliasi pembayaran berdasarkan id payment */
export function fetchReconciliationHistory(session: AuthSession, paymentId: string): Promise<ReconciliationHistoryData> {
  return requestJson(
    `/api/v1/reconciliations/payment/${encodeURIComponent(paymentId)}`,
    z.object({
      status: z.string().optional(),
      message: z.string().optional(),
      data: reconciliationHistoryResponseSchema.optional(),
    }).passthrough(),
    { method: "GET", cache: "no-store" },
    session.token,
  ).then(res => res.data || (res as any))
}
