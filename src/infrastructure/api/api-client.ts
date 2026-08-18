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

import { healthResponseSchema, syncResponseSchema } from "@/lib/contracts"
import { ApiError, API_URL, requestJson } from "@/infrastructure/api/http-client"
import type {
  AuthSession,
  DeviceIdentity,
  LocalTransaction,
} from "@/infrastructure/persistence/models"

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true"

export function probeBackend(signal?: AbortSignal) {
  return requestJson("/health", healthResponseSchema, { signal, cache: "no-store" })
}

/**
 * Mengonversi model transaksi lokal (camelCase Dexie) ke format payload
 * yang diterima oleh backend K-POS (snake_case, nested payment object).
 */
function buildTransactionPayload(transaction: LocalTransaction) {
  const paymentBase = {
    // Pemetaan metode: frontend TRANSFER -> backend BANK_TRANSFER
    method: transaction.paymentMethod === "TRANSFER" ? "BANK_TRANSFER" : transaction.paymentMethod,
    amount: transaction.total,
  }

  const paymentFields: Record<string, unknown> = {}
  if (transaction.paymentMethod === "CASH") {
    paymentFields.cash_received = transaction.amountReceived
    paymentFields.change_amount = transaction.change
  } else if (transaction.paymentMethod === "STATIC_QRIS") {
    paymentFields.qris_code = transaction.paymentReference
  } else if (transaction.paymentMethod === "TRANSFER") {
    paymentFields.transfer_ref = transaction.paymentReference
  }

  return {
    // Frontend menyimpan UUID v4 di field `id` — backend menerima di `offline_uuid`
    offline_uuid: transaction.id,
    // id_device diambil dari model lokal
    id_device: transaction.deviceId,
    // Waktu transaksi lokal (ISO string) -> created_at_local
    created_at_local: transaction.createdAt,
    subtotal: transaction.subtotal,
    total: transaction.total,
    notes: null,
    // Items: productId -> id_product, unitPrice -> unit_price
    items: transaction.items.map((item) => ({
      id_product: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      subtotal: item.subtotal,
    })),
    // Semua info pembayaran dikelompokkan dalam satu object `payment`
    payment: {
      ...paymentBase,
      ...paymentFields,
    },
  }
}

/**
 * SyncResult yang digunakan oleh sync-policy.ts (format internal frontend).
 * Karena backend menggunakan model "fire-and-forget" (async via RabbitMQ),
 * kita anggap semua transaksi dalam batch ACCEPTED apabila HTTP 200 dikembalikan.
 */
export type SyncResult = {
  transactionId: string
  status: "ACCEPTED" | "ALREADY_PROCESSED" | "REJECTED_PERMANENT" | "RETRYABLE_ERROR"
  settlementStatus?: "SETTLED"
  receivedAtBackend?: string
  reason?: string
}

export async function sendTransactionBatch(
  session: AuthSession,
  _device: DeviceIdentity,
  _batchId: string,
  transactions: LocalTransaction[],
): Promise<SyncResult[]> {
  // Demo mode: simulasi sync tanpa memanggil backend
  if (DEMO_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 350))
    return transactions.map((transaction) => ({
      transactionId: transaction.id,
      status: transaction.receivedAtBackend ? "ALREADY_PROCESSED" : "ACCEPTED",
      settlementStatus: "SETTLED",
      receivedAtBackend: transaction.receivedAtBackend ?? new Date().toISOString(),
    }))
  }

  // POST /api/v1/sync — backend menerima { transactions: [...] }
  // Prefix /api/v1 sudah ditangani oleh API_URL atau tambahkan di sini
  const response = await requestJson(
    "/api/v1/sync",
    syncResponseSchema,
    {
      method: "POST",
      body: JSON.stringify({
        transactions: transactions.map(buildTransactionPayload),
      }),
    },
    session.token,
  )

  // Backend mengembalikan { accepted: N, queued_at: "..." } — bukan per-transaksi result.
  // Kita mapping semua transaksi dalam batch sebagai ACCEPTED jika request berhasil.
  const receivedAt = response.data.queued_at
  return transactions.map((transaction) => ({
    transactionId: transaction.id,
    status: "ACCEPTED" as const,
    settlementStatus: "SETTLED" as const,
    receivedAtBackend: receivedAt,
  }))
}

export { ApiError, API_URL }
