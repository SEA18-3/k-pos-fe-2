import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { database } from "@/infrastructure/persistence/database"
import { readSetting } from "@/infrastructure/persistence/settings-repository"
import type { AuthSession, DeviceIdentity, Product } from "@/infrastructure/persistence/models"
import { bootstrapLocalData } from "./auth-api"
import * as catalogApi from "@/features/catalog/catalog-api"

describe("Bootstrap Flow & Failure Semantics", () => {
  const sampleDevice: DeviceIdentity = {
    id: "dev-boot-1",
    name: "Terminal Boot 1",
    createdAt: new Date().toISOString(),
  }

  const sampleSession: AuthSession = {
    token: "jwt-boot-token",
    refreshToken: "refresh-boot-token",
    merchantId: "M-BOOT-01",
    operator: { id: "op-1", name: "Operator Maya", role: "OPERATOR" },
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }

  beforeEach(async () => {
    await database.products.clear()
    await database.settings.clear()
    vi.restoreAllMocks()
  })

  afterEach(async () => {
    await database.products.clear()
    await database.settings.clear()
  })

  it("successfully populates IndexedDB catalog and records lastBootstrapAt on server fetch success", async () => {
    const mockBackendProducts = [
      {
        id_product: "p-001",
        id_merchant: "M-BOOT-01",
        name: "Iced Cappuccino",
        sku: "CAP-01",
        price: "28000",
        image_url: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id_product: "p-002",
        id_merchant: "M-BOOT-01",
        name: "Croissant Almond",
        sku: "ALM-02",
        price: "32000",
        image_url: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    vi.spyOn(catalogApi, "fetchCatalogProducts").mockResolvedValue(mockBackendProducts)

    const result = await bootstrapLocalData(sampleSession, sampleDevice)

    expect(result).toHaveLength(2)
    expect(result[0].name).toBe("Iced Cappuccino")
    expect(result[0].price).toBe(28000)

    // Verify IndexedDB persistence
    const localProducts = await database.products.toArray()
    expect(localProducts).toHaveLength(2)
    expect(localProducts.map((p) => p.sku)).toEqual(["CAP-01", "ALM-02"])

    // Verify metadata persistence
    const lastBootstrap = await readSetting("lastBootstrapAt")
    expect(lastBootstrap).toBeDefined()
    expect(new Date(lastBootstrap!).getTime()).toBeGreaterThan(0)

    const merchantProfile = await readSetting("merchantProfile")
    expect(merchantProfile).toBe(JSON.stringify({ id: "M-BOOT-01" }))
  })

  it("preserves existing local catalog and does not update lastBootstrapAt when network fetch fails", async () => {
    // Pre-seed local IndexedDB catalog with existing cache
    const existingProduct: Product = {
      id: "p-cached",
      sku: "CACHE-01",
      name: "Cached Americano",
      description: "Existing cache",
      category: "Coffee",
      price: 20000,
      stock: 10,
      accent: "#8b5cf6",
      updatedAt: "2026-08-18T00:00:00Z",
    }
    await database.products.put(existingProduct)

    // Mock network failure
    vi.spyOn(catalogApi, "fetchCatalogProducts").mockRejectedValue(new Error("Network connection failed"))

    // Execution should NOT reject
    const result = await bootstrapLocalData(sampleSession, sampleDevice)
    expect(result).toEqual([])

    // Verify local IndexedDB catalog is preserved 100%
    const localProducts = await database.products.toArray()
    expect(localProducts).toHaveLength(1)
    expect(localProducts[0].name).toBe("Cached Americano")

    // Verify lastBootstrapAt is NOT set
    const lastBootstrap = await readSetting("lastBootstrapAt")
    expect(lastBootstrap).toBeUndefined()

    // Verify merchantProfile is still saved for offline display
    const merchantProfile = await readSetting("merchantProfile")
    expect(merchantProfile).toBe(JSON.stringify({ id: "M-BOOT-01" }))
  })
})
