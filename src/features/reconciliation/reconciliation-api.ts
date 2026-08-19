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
})

export type BackendTransaction = z.output<typeof backendTransactionSchema>

const reconciliationSchema = z.object({
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
  updated_at: z.string(),
  payment: backendPaymentSchema.extend({
    transaction: backendTransactionSchema.optional()
  }).optional(),
  openedByUser: z.object({ full_name: z.string() }).optional(),
  resolvedByUser: z.object({ full_name: z.string() }).optional().nullable(),
})

export type ReconciliationRecord = z.output<typeof reconciliationSchema>

const reconciliationListResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  data: z.array(reconciliationSchema),
})

const reconciliationResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  data: reconciliationSchema,
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
// API Functions
// ---------------------------------------------------------------------------

export function getReconciliations(session: AuthSession) {
  return requestJson(`/api/v1/reconciliations`, reconciliationListResponseSchema, {}, session.token)
}

export function openReconciliation(
  session: AuthSession,
  input: { id_transaction: string; reason: string }
) {
  return requestJson(
    `/api/v1/reconciliations`,
    reconciliationResponseSchema,
    { method: "POST", body: JSON.stringify(input) },
    session.token,
  )
}

export function resolveReconciliation(
  session: AuthSession,
  id_reconciliation: string,
  input: { status: "RESOLVED_VALID" | "RESOLVED_INVALID", resolution?: string }
) {
  return requestJson(
    `/api/v1/reconciliations/${encodeURIComponent(id_reconciliation)}/resolve`,
    reconciliationResponseSchema,
    { method: "POST", body: JSON.stringify(input) },
    session.token,
  )
}

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

export function correctTransaction(
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

