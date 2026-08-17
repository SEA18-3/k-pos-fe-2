import { healthResponseSchema, syncResponseSchema, type SyncResult } from "@operator/contracts"

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

function transactionPayload(transaction: LocalTransaction) {
  return {
    transactionId: transaction.id,
    invoiceNumber: transaction.invoiceNumber,
    operatorId: transaction.operatorId,
    transactionStatus: transaction.transactionStatus,
    paymentMethod: transaction.paymentMethod,
    paymentVerificationType: transaction.paymentVerificationType,
    paymentReference: transaction.paymentReference,
    subtotal: transaction.subtotal,
    discount: transaction.discount,
    tax: 0,
    total: transaction.total,
    createdAtDevice: transaction.createdAt,
    items: transaction.items.map((item) => ({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    })),
  }
}

export async function sendTransactionBatch(
  session: AuthSession,
  device: DeviceIdentity,
  batchId: string,
  transactions: LocalTransaction[],
): Promise<SyncResult[]> {
  if (DEMO_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 350))
    return transactions.map((transaction) => ({
      transactionId: transaction.id,
      status: transaction.receivedAtBackend ? "ALREADY_PROCESSED" : "ACCEPTED",
      settlementStatus: "SETTLED",
      receivedAtBackend: transaction.receivedAtBackend ?? new Date().toISOString(),
    }))
  }
  const response = await requestJson(
    "/v1/sync/transactions",
    syncResponseSchema,
    {
      method: "POST",
      body: JSON.stringify({
        schemaVersion: 1,
        merchantId: session.merchantId,
        deviceId: device.id,
        batchId,
        transactions: transactions.map(transactionPayload),
      }),
    },
    session.token,
  )
  return response.results
}

export { ApiError, API_URL }
