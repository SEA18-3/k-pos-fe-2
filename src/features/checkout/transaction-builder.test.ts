import { describe, expect, it } from "vitest"

import type { Product } from "@/infrastructure/persistence/models"

import { buildLocalTransaction, invoiceNumberFor } from "./transaction-builder"

const product: Product = {
  id: "prd-aren",
  sku: "KSA-01",
  name: "Kopi Susu Aren",
  description: "",
  category: "Kopi",
  price: 22_000,
  stock: 10,
  lowStockThreshold: 5,
  accent: "#0891b2",
  active: true,
  updatedAt: "2026-08-15T00:00:00.000Z",
}

describe("transaction builder", () => {
  it("snapshots product and payment values into a provisional sale", () => {
    const sale = buildLocalTransaction(
      { items: [{ product, quantity: 2 }], paymentMethod: "CASH", amountReceived: 50_000 },
      context("0198a123-0000-7000-8000-00000000abcd"),
    )

    expect(sale).toMatchObject({
      invoiceNumber: "OPS-0000ABCD",
      subtotal: 44_000,
      total: 44_000,
      change: 6_000,
      syncStatus: "PENDING_SYNC",
      items: [{ productId: "prd-aren", unitPrice: 22_000, quantity: 2, subtotal: 44_000 }],
    })
    expect(sale.offlineUuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  it("uses the random UUID tail so concurrent devices do not share invoice numbers", () => {
    expect(invoiceNumberFor("0198a123-0000-7000-8000-00000000abcd")).not.toBe(
      invoiceNumberFor("0198a123-0000-7000-8000-00000000ef01"),
    )
  })
})

function context(transactionId: string) {
  return {
    transactionId,
    createdAt: "2026-08-15T00:00:00.000Z",
    merchantId: "merchant-1",
    deviceId: "device-1",
    operatorId: "operator-1",
    operatorName: "Rani",
  }
}
