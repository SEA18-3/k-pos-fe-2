import { z } from "zod"
import { requestJson } from "@/infrastructure/api/http-client"
import type { AuthSession, LocalTransaction } from "@/infrastructure/persistence/models"

// Prisma Decimal fields come as strings in JSON, so we coerce to number
const decimal = z.union([z.number(), z.string()]).transform(Number)

const transactionSchema = z.object({
  id_transaction: z.string(),
  offline_uuid: z.string().nullable().optional(),
  status: z.string(),
  sync_status: z.string(),
  subtotal: decimal,
  total: decimal,
  notes: z.string().nullable().optional(),
  created_at: z.string(),
  payment: z.object({
    method: z.string(),
    cash_received: decimal.nullable().optional(),
    change_amount: decimal.nullable().optional(),
    qris_code: z.string().nullable().optional(),
    transfer_ref: z.string().nullable().optional(),
  }).nullable().optional(),
  details: z.array(z.object({
    id_product: z.string(),
    quantity: z.number(),
    unit_price: decimal,
    subtotal: decimal,
    product_name: z.string(),
  })).optional(),
  correctionsAsNew: z.array(z.object({
    oldTransaction: z.object({
      payment: z.object({
        method: z.string(),
        cash_received: decimal.nullable().optional(),
        change_amount: decimal.nullable().optional(),
      }).nullable().optional(),
    }).optional(),
  })).optional(),
}).passthrough()

const fetchTransactionsResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  data: z.object({
    data: z.array(transactionSchema),
    meta: z.object({
      next_cursor: z.string().nullable(),
      limit: z.number(),
    }).passthrough(),
  }).passthrough(),
}).passthrough()

export function fetchServerTransactions(session: AuthSession): Promise<LocalTransaction[]> {
  return requestJson("/api/v1/transactions?limit=100", fetchTransactionsResponseSchema, { method: "GET" }, session.token)
    .then((res) => {
      return res.data.data.map((tx): LocalTransaction => {
        // Map payment method to frontend enum
        const methodMap: Record<string, LocalTransaction["paymentMethod"]> = {
          CASH: "CASH",
          STATIC_QRIS: "STATIC_QRIS",
          BANK_TRANSFER: "TRANSFER",
        }
        // For correction transactions, payment may be null → fall back to old transaction's payment
        const effectivePayment = (tx as any).payment
          ?? (tx as any).correctionsAsNew?.[0]?.oldTransaction?.payment
          ?? null
        return {
          id: tx.id_transaction,
          invoiceNumber: `SRV-${tx.id_transaction.replaceAll("-", "").slice(-8).toUpperCase()}`,
          merchantId: session.merchantId,
          deviceId: "server",
          operatorId: "server",
          operatorName: "Server",
          items: (tx.details || []).map((detail) => ({
            productId: detail.id_product,
            name: detail.product_name,
            quantity: detail.quantity,
            unitPrice: Number(detail.unit_price),
            subtotal: Number(detail.subtotal),
          })),
          subtotal: Number(tx.subtotal),
          discount: 0,
          total: Number(tx.total),
          paymentMethod: effectivePayment ? (methodMap[effectivePayment.method] ?? "CASH") : "CASH",
          paymentVerificationType: "OPERATOR_ASSERTED",
          amountReceived: effectivePayment?.cash_received ? Number(effectivePayment.cash_received) : undefined,
          change: effectivePayment?.change_amount ? Number(effectivePayment.change_amount) : undefined,
          transactionStatus: tx.status === "VOIDED" ? "VOIDED" : "CONFIRMED",
          syncStatus: "SYNCED",
          retryCount: 0,
          offlineUuid: tx.offline_uuid || tx.id_transaction,
          createdAt: tx.created_at,
          receivedAtBackend: tx.created_at,
        }
      })
    })
}

