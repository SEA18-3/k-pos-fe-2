import { beforeEach, describe, expect, it } from "vitest"

import { confirmSale } from "./confirm-sale"
import { database } from "@/infrastructure/persistence/database"
import type { AuthSession, DeviceIdentity, Product } from "@/infrastructure/persistence/models"
import { saveAuthSession } from "@/infrastructure/persistence/session-repository"
import { writeSetting } from "@/infrastructure/persistence/settings-repository"

const testMerchantId = "M-MERCHANT-01"

const productA: Product = {
  id: "prod-flow-1",
  name: "Iced Latte",
  description: "Fresh espresso with cold milk",
  sku: "LAT-01",
  category: "Coffee",
  price: 24000,
  stock: 20,
  accent: "#8b5cf6",
  updatedAt: new Date().toISOString(),
}

const productB: Product = {
  id: "prod-flow-2",
  name: "Cinnamon Roll",
  description: "Freshly baked cinnamon roll",
  sku: "CIN-01",
  category: "Pastry",
  price: 28000,
  stock: 15,
  accent: "#f59e0b",
  updatedAt: new Date().toISOString(),
}

const testSession: AuthSession = {
  token: "jwt-test-token",
  refreshToken: "refresh-token",
  merchantId: testMerchantId,
  operator: { id: "op-1", name: "Kasir Maya", role: "OPERATOR" },
  expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
}

const testDevice: DeviceIdentity = {
  id: "device-pos-001",
  name: "Counter Tablet 1",
  createdAt: new Date().toISOString(),
}

describe("Checkout Feature Integration Flow", () => {
  beforeEach(async () => {
    await database.delete()
    await database.open()

    // Seed products
    await database.products.bulkAdd([productA, productB])
    // Seed session and device identity
    await saveAuthSession(testSession)
    await writeSetting("deviceIdentity", JSON.stringify(testDevice))
  })

  it("processes a complete checkout flow from cart items to atomic IndexedDB & Outbox storage", async () => {
    // 1. Arrange cart items and payment selection
    const cartItems = [
      { product: productA, quantity: 2 }, // 24.000 * 2 = 48.000
      { product: productB, quantity: 1 }, // 28.000 * 1 = 28.000
    ]
    const amountReceived = 100000

    // 2. Act: Confirm sale
    const transaction = await confirmSale({
      items: cartItems,
      paymentMethod: "CASH",
      amountReceived,
    })

    // 3. Assert: Transaction was created with correct values
    expect(transaction.id).toBeDefined()
    expect(transaction.merchantId).toBe(testMerchantId)
    expect(transaction.deviceId).toBe(testDevice.id)
    expect(transaction.operatorName).toBe("Kasir Maya")
    expect(transaction.total).toBe(76000)
    expect(transaction.paymentMethod).toBe("CASH")
    expect(transaction.amountReceived).toBe(100000)
    expect(transaction.change).toBe(24000)
    expect(transaction.syncStatus).toBe("PENDING_SYNC")
    expect(transaction.transactionStatus).toBe("CONFIRMED")
    expect(transaction.items).toHaveLength(2)

    // 4. Assert: IndexedDB database state
    const savedTx = await database.transactions.get(transaction.id)
    expect(savedTx).toBeDefined()
    expect(savedTx?.total).toBe(76000)

    // 5. Assert: Outbox record created
    const outboxEntry = await database.outbox.where("transactionId").equals(transaction.id).first()
    expect(outboxEntry).toBeDefined()
    expect(outboxEntry?.status).toBe("PENDING")
    expect(outboxEntry?.operation).toBe("UPSERT_TRANSACTION")
    expect(outboxEntry?.retryCount).toBe(0)

    // 6. Assert: Inventory local stock projection updated atomically
    const updatedProdA = await database.products.get(productA.id)
    const updatedProdB = await database.products.get(productB.id)
    expect(updatedProdA?.stock).toBe(18) // 20 - 2
    expect(updatedProdB?.stock).toBe(14) // 15 - 1

    // 7. Assert: Active draft cleaned up
    const activeDraft = await database.drafts.get("active")
    expect(activeDraft).toBeUndefined()
  })

  it("rejects checkout when cart is empty", async () => {
    await expect(
      confirmSale({
        items: [],
        paymentMethod: "CASH",
        amountReceived: 0,
      }),
    ).rejects.toThrow("Keranjang masih kosong")
  })
})
