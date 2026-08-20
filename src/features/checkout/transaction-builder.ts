import type { LocalTransaction, PaymentMethod, Product } from "@/infrastructure/persistence/models"

import { verificationTypeFor } from "./payment-rules"

type CartLine = { product: Product; quantity: number }

export type ConfirmSaleInput = {
  items: CartLine[]
  paymentMethod: PaymentMethod
  amountReceived?: number
  paymentReference?: string
}

export type TransactionContext = {
  transactionId: string
  createdAt: string
  merchantId: string
  deviceId: string
  operatorId: string
  operatorName: string
  lastBootstrapAt?: string
}

export function buildLocalTransaction(
  input: ConfirmSaleInput,
  context: TransactionContext,
): LocalTransaction {
  const subtotal = input.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  return {
    id: context.transactionId,
    invoiceNumber: invoiceNumberFor(context.transactionId),
    merchantId: context.merchantId,
    deviceId: context.deviceId,
    operatorId: context.operatorId,
    operatorName: context.operatorName,
    items: input.items.map(({ product, quantity }) => ({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      catalogVersion: product.updatedAt || context.lastBootstrapAt || context.createdAt,
      quantity,
      unitPrice: product.price,
      subtotal: product.price * quantity,
    })),
    subtotal,
    discount: 0,
    total: subtotal,
    paymentMethod: input.paymentMethod,
    paymentVerificationType: verificationTypeFor(input.paymentMethod),
    paymentReference: input.paymentReference,
    amountReceived: input.amountReceived,
    change: input.amountReceived === undefined ? undefined : input.amountReceived - subtotal,
    transactionStatus: "CONFIRMED",
    syncStatus: "PENDING_SYNC",
    offlineUuid: crypto.randomUUID(),
    createdAt: context.createdAt,
    retryCount: 0,
  }
}

export function invoiceNumberFor(transactionId: string) {
  return transactionId
}
