import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { database as db } from "@/infrastructure/persistence/database"
import { getOrCreateDeviceIdentity } from "@/infrastructure/persistence/device-repository"
import type { LocalTransaction, Product } from "@/infrastructure/persistence/models"
import {
  commitLocalSale,
  voidProvisionalTransaction,
} from "@/infrastructure/persistence/transaction-repository"

const product: Product = {
  id: "prd-test",
  sku: "TST-001",
  name: "Test Coffee",
  description: "Fixture",
  category: "Kopi",
  price: 20_000,
  stock: 5,
  accent: "#06b6d4",
}

function transaction(id = "0197f0a0-test-transaction"): LocalTransaction {
  return {
    id,
    invoiceNumber: "OPS-TEST01",
    merchantId: "MRC-TEST",
    deviceId: "DVC-TEST",
    operatorId: "OPR-TEST",
    operatorName: "Test Operator",
    items: [
      {
        productId: product.id,
        name: product.name,
        quantity: 2,
        unitPrice: product.price,
        subtotal: 40_000,
      },
    ],
    subtotal: 40_000,
    discount: 0,
    total: 40_000,
    paymentMethod: "CASH",
    paymentVerificationType: "SYSTEM_VERIFIABLE",
    transactionStatus: "CONFIRMED",
    syncStatus: "LOCAL_ONLY",
    settlementStatus: "PROVISIONAL",
    createdAt: new Date().toISOString(),
    retryCount: 0,
  }
}

beforeEach(async () => {
  await db.delete()
  await db.open()
  await db.products.add(product)
  await db.drafts.add({
    id: "active",
    cart: { [product.id]: 2 },
    transactionStatus: "PENDING",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
})

afterEach(() => db.close())

describe("offline local persistence", () => {
  it("atomically stores a sale and outbox entry without network access", async () => {
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: false })
    const sale = transaction()

    await commitLocalSale(sale)

    expect(await db.transactions.get(sale.id)).toMatchObject({
      syncStatus: "LOCAL_ONLY",
      settlementStatus: "PROVISIONAL",
    })
    expect(await db.outbox.where("transactionId").equals(sale.id).first()).toMatchObject({
      status: "PENDING",
      retryCount: 0,
    })
    expect((await db.products.get(product.id))?.stock).toBe(3)
    expect(await db.drafts.get("active")).toBeUndefined()

    db.close()
    await db.open()
    expect(await db.transactions.get(sale.id)).toBeDefined()
  })

  it("accepts a negative local projection for eventual inventory reconciliation", async () => {
    const sale = transaction("0197f0a0-insufficient-stock")
    sale.items[0]!.quantity = 99

    await commitLocalSale(sale)

    expect(await db.transactions.get(sale.id)).toBeDefined()
    expect(await db.outbox.count()).toBe(1)
    expect((await db.products.get(product.id))?.stock).toBe(-94)
  })

  it("persists one device identity per browser installation", async () => {
    const first = await getOrCreateDeviceIdentity()
    const second = await getOrCreateDeviceIdentity()
    expect(second).toEqual(first)
  })

  it("voids only provisional sales and restores the local stock projection", async () => {
    const sale = transaction("0197f0a0-void-test")
    await commitLocalSale(sale)
    await voidProvisionalTransaction(sale.id)

    expect(await db.transactions.get(sale.id)).toMatchObject({
      transactionStatus: "VOIDED",
      syncStatus: "LOCAL_ONLY",
    })
    expect((await db.products.get(product.id))?.stock).toBe(5)
    expect(await db.outbox.where("transactionId").equals(sale.id).first()).toMatchObject({
      status: "PENDING",
    })
  })
})
