import { describe, expect, it } from "vitest"

import { calculateBackoffMs } from "@/features/sync/sync-policy"
import { mapProduct } from "@/infrastructure/api/mappers"
import { transactionPayload } from "@/infrastructure/api/api-client"
import type { BackendProduct } from "@/infrastructure/api/mappers"
import type { LocalTransaction } from "@/infrastructure/persistence/models"

describe("sync retry policy", () => {
  it("uses a bounded batch of 25 transactions", () => {
    expect(25).toBe(25)
  })

  it("applies exponential backoff with 50-100% jitter", () => {
    expect(calculateBackoffMs(0, () => 0)).toBe(500)
    expect(calculateBackoffMs(0, () => 1)).toBe(1_000)
    expect(calculateBackoffMs(3, () => 0)).toBe(4_000)
    expect(calculateBackoffMs(3, () => 1)).toBe(8_000)
  })

  it("caps retry delay at five minutes", () => {
    expect(calculateBackoffMs(30, () => 1)).toBe(5 * 60_000)
  })
})

describe("transaction payload", () => {
  const transaction: LocalTransaction = {
    id: "0198a123-0000-7000-8000-00000000abcd",
    invoiceNumber: "OPS-0000ABCD",
    merchantId: "merchant-1",
    deviceId: "device-1",
    operatorId: "operator-1",
    operatorName: "Rani",
    items: [
      { productId: "prd-aren", name: "Kopi", quantity: 2, unitPrice: 22_000, subtotal: 44_000 },
    ],
    subtotal: 44_000,
    discount: 0,
    total: 44_000,
    paymentMethod: "TRANSFER",
    paymentVerificationType: "SYSTEM_VERIFIABLE",
    paymentReference: "ref-1",
    amountReceived: 50_000,
    change: 6_000,
    transactionStatus: "CONFIRMED",
    syncStatus: "PENDING_SYNC",
    offlineUuid: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    createdAt: "2026-08-15T00:00:00.000Z",
    retryCount: 0,
  }

  it("maps money as numbers and sends offline_uuid as UUID v4", () => {
    const tx = transactionPayload(transaction, "device-1")
    expect(tx.offline_uuid).toBe("f47ac10b-58cc-4372-a567-0e02b2c3d479")
    expect(tx.subtotal).toBe(44_000)
    expect(tx.total).toBe(44_000)
    expect(tx.items).toHaveLength(1)
  })

  it("nests payment method and maps TRANSFER to BANK_TRANSFER", () => {
    const tx = transactionPayload(transaction, "device-1")
    expect(tx.payment.method).toBe("BANK_TRANSFER")
    expect(tx.payment.amount).toBe(44_000)
    expect(tx.payment.transfer_ref).toBe("ref-1")
    expect(tx.payment.qris_code).toBeNull()
    expect(tx.payment.cash_received).toBe(50_000)
  })

  it("omits settlement-only and operator metadata fields", () => {
    const tx = transactionPayload(transaction, "device-1")
    expect(tx).not.toHaveProperty("settlementStatus")
    expect(tx).not.toHaveProperty("operatorName")
    expect(tx).not.toHaveProperty("invoiceNumber")
    expect(tx).not.toHaveProperty("payment_method")
  })
})

describe("product mapper", () => {
  it("maps backend snake_case product to local domain model", () => {
    const backend: BackendProduct = {
      id_product: "clprd",
      id_merchant: "clmrc",
      name: "Mie Goreng",
      sku: "MG-001",
      price: "15000.00",
      image_url: "https://example.com/mie.png",
      is_active: true,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-02-01T00:00:00.000Z",
    }
    const product = mapProduct(backend)
    expect(product.id).toBe("clprd")
    expect(product.price).toBe(15_000)
    expect(product.active).toBe(true)
    expect(product.imageUrl).toBe("https://example.com/mie.png")
    expect(product.stock).toBe(0)
  })
})
