/**
 * api-client.ts
 *
 * Adapter layer antara model lokal Dexie (camelCase) dan API backend K-POS (snake_case).
 * Seluruh konversi nama field dilakukan di sini agar model internal tidak perlu berubah.
 *
 * Endpoint:
 *  - POST /api/v1/sync  — kirim batch transaksi offline
 *  - GET  /health       — probe ketersediaan backend
 */

import { z } from "zod"

import { healthResponseSchema } from "@/lib/contracts"

import { ApiError, API_URL, requestJson } from "@/infrastructure/api/http-client"
import type { LocalTransaction } from "@/infrastructure/persistence/models"

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true"

export function probeBackend(signal?: AbortSignal) {
  return requestJson("/health", healthResponseSchema, { signal, cache: "no-store" })
}

function toBackendPaymentMethod(method: LocalTransaction["paymentMethod"]) {
  return method === "TRANSFER" ? "BANK_TRANSFER" : method
}

export function transactionPayload(transaction: LocalTransaction, deviceId: string) {
  const method = toBackendPaymentMethod(transaction.paymentMethod)
  return {
    offline_uuid: transaction.offlineUuid,
    created_at_local: transaction.createdAt,
    subtotal: transaction.subtotal,
    total: transaction.total,
    notes: null,
    items: transaction.items.map((item) => ({
      id_product: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      subtotal: item.subtotal,
      product_name: item.name,
      sku_snapshot: (item as any).sku ?? item.productId,
      catalog_version: (item as any).catalogVersion ?? transaction.createdAt,
    })),
    payment: {
      method,
      amount: transaction.total,
      cash_received: transaction.amountReceived ?? null,
      change_amount: transaction.change ?? null,
      qris_code: method === "STATIC_QRIS" ? (transaction.paymentReference ?? null) : null,
      transfer_ref: method === "BANK_TRANSFER" ? (transaction.paymentReference ?? null) : null,
    },
  }
}

const backendSyncAckSchema = z.object({
  status: z.string().optional(),
  message: z.string().optional(),
  data: z.object({
    message: z.string().optional(),
    data: z
      .object({
        accepted: z.number(),
        queued_at: z.string(),
      })
      .optional(),
    accepted: z.number().optional(),
    queued_at: z.string().optional(),
  }),
})

export type BackendSyncAck = { accepted: number; queuedAt: string }

export async function sendTransactionBatch(
  session: { token: string },
  device: { id: string },
  _batchId: string,
  transactions: LocalTransaction[],
): Promise<BackendSyncAck> {
  if (DEMO_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 350))
    return { accepted: transactions.length, queuedAt: new Date().toISOString() }
  }
  const response = await requestJson(
    "/api/v1/sync",
    backendSyncAckSchema,
    {
      method: "POST",
      headers: {
        "X-Device-ID": device.id,
      },
      body: JSON.stringify({ transactions: transactions.map((t) => transactionPayload(t, device.id)) }),
    },
    session.token,
  )
  const accepted = response.data.data?.accepted ?? response.data.accepted ?? 0
  const queuedAt = response.data.data?.queued_at ?? response.data.queued_at ?? new Date().toISOString()
  return { accepted, queuedAt }
}

export type BackendSyncStatus = {
  offline_uuid: string
  status: "CONFLICT" | "SYNCED" | "FAILED" | "PENDING" | "UNKNOWN"
  transaction_id: string | null
  error: string | null
}

const syncStatusResponseSchema = z.object({
  status: z.string().optional(),
  message: z.string().optional(),
  data: z.object({
    data: z.array(
      z.object({
        offline_uuid: z.string(),
        status: z.enum(["CONFLICT", "SYNCED", "FAILED", "PENDING", "UNKNOWN"]),
        transaction_id: z.string().nullable(),
        error: z.string().nullable(),
      })
    ),
  }),
})

export async function fetchSyncStatus(
  session: { token: string },
  offlineUuids: string[],
): Promise<BackendSyncStatus[]> {
  if (DEMO_MODE || offlineUuids.length === 0) return []
  const response = await requestJson(
    `/api/v1/sync/status?offline_uuid=${encodeURIComponent(offlineUuids.join(","))}`,
    syncStatusResponseSchema,
    { method: "GET" },
    session.token,
  )
  return response.data.data
}

export { ApiError, API_URL }
