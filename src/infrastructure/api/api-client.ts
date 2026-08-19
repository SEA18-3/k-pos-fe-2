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

function resolveSkuSnapshot(sku?: string, productId?: string): string {
  if (sku && sku.trim().length > 0) return sku.trim()
  if (productId) {
    const trimmedId = productId.trim()
    if (/^[A-Z0-9_-]+$/i.test(trimmedId) && trimmedId.length <= 30 && !trimmedId.includes(" ")) {
      return trimmedId.toUpperCase()
    }
    return `SKU-${trimmedId.slice(-6).toUpperCase()}`
  }
  return "SKU-UNKNOWN"
}

export function transactionPayload(transaction: LocalTransaction, _deviceId?: string) {
  const method = toBackendPaymentMethod(transaction.paymentMethod)
  return {
    offline_uuid: transaction.offlineUuid,
    created_at_local: transaction.createdAt,
    subtotal: transaction.subtotal,
    total: transaction.total,
    ...(transaction.lastSyncError ? { notes: transaction.lastSyncError } : {}),
    items: transaction.items.map((item) => ({
      id_product: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      subtotal: item.subtotal,
      product_name: item.name || "Item Penjualan",
      sku_snapshot: resolveSkuSnapshot(item.sku, item.productId),
      catalog_version: item.catalogVersion || transaction.createdAt || new Date().toISOString(),
    })),
    payment: {
      method,
      amount: transaction.total,
      ...(transaction.amountReceived != null ? { cash_received: transaction.amountReceived } : {}),
      ...(transaction.change != null ? { change_amount: transaction.change } : {}),
      ...(method === "STATIC_QRIS" && transaction.paymentReference ? { qris_code: transaction.paymentReference } : {}),
      ...(method === "BANK_TRANSFER" && transaction.paymentReference ? { transfer_ref: transaction.paymentReference } : {}),
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
      body: JSON.stringify({ transactions: transactions.map((t) => transactionPayload(t)) }),
    },
    session.token,
  )
  const accepted = response.data.data?.accepted ?? response.data.accepted ?? 0
  const queuedAt = response.data.data?.queued_at ?? response.data.queued_at ?? new Date().toISOString()
  return { accepted, queuedAt }
}

export { ApiError, API_URL }
