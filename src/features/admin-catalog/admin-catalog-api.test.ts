import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AuthSession } from "@/infrastructure/persistence/models"
import { requestJson } from "@/infrastructure/api/http-client"
import {
  ACCEPTED_IMAGE_MIME_TYPES,
  MAX_IMAGE_FILE_SIZE,
  buildProductFormData,
  createAdminProduct,
  updateAdminProduct,
  validateProductImage,
} from "./admin-catalog-api"

vi.mock("@/infrastructure/api/http-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/infrastructure/api/http-client")>()
  return { ...actual, requestJson: vi.fn() }
})

const requestJsonMock = vi.mocked(requestJson)

const session: AuthSession = {
  token: "jwt-token",
  refreshToken: "",
  merchantId: "M-001",
  operator: { id: "op-1", name: "Owner", role: "OWNER" },
  expiresAt: "2099-01-01T00:00:00.000Z",
}

describe("buildProductFormData", () => {
  it("builds multipart fields as strings for name, sku and price", () => {
    const form = buildProductFormData({ name: "Mie Goreng", sku: "MG-001", price: 15000 })
    expect(form.get("name")).toBe("Mie Goreng")
    expect(form.get("sku")).toBe("MG-001")
    expect(form.get("price")).toBe("15000")
  })

  it("skips undefined fields (PATCH semantics)", () => {
    const form = buildProductFormData({ name: "Mie Goreng", price: 15000 })
    expect(form.get("name")).toBe("Mie Goreng")
    expect(form.has("sku")).toBe(false)
    expect(form.get("price")).toBe("15000")
  })

  it("does not include image_url (backend rejects unknown fields)", () => {
    const form = buildProductFormData({ name: "X", sku: "X-1", price: 1 })
    expect(form.has("image_url")).toBe(false)
  })

  it("appends the image file under the 'image' field when provided", () => {
    const file = new File(["data"], "product.png", { type: "image/png" })
    const form = buildProductFormData({ name: "X", sku: "X-1", price: 1 }, file)
    const uploaded = form.get("image") as File
    expect(uploaded.name).toBe("product.png")
    expect(uploaded.type).toBe("image/png")
  })
})

describe("validateProductImage", () => {
  it("accepts an allowed MIME type within size limit", () => {
    const file = new File(["data"], "a.png", { type: "image/png" })
    expect(validateProductImage(file)).toBeNull()
  })

  it("rejects disallowed MIME types", () => {
    const file = new File(["data"], "a.pdf", { type: "application/pdf" })
    expect(validateProductImage(file)).toMatch(/Format gambar tidak didukung/)
  })

  it("rejects files over the 5MB limit", () => {
    const big = new File([new Uint8Array(MAX_IMAGE_FILE_SIZE + 1)], "big.png", {
      type: "image/png",
    })
    expect(validateProductImage(big)).toMatch(/maksimal 5MB/)
  })

  it("accepts every MIME type the backend whitelist allows", () => {
    for (const mime of ACCEPTED_IMAGE_MIME_TYPES) {
      const file = new File(["data"], `a.${mime}`, { type: mime })
      expect(validateProductImage(file), mime).toBeNull()
    }
  })
})

describe("createAdminProduct", () => {
  beforeEach(() => requestJsonMock.mockReset())

  it("sends multipart FormData (not JSON) to POST /api/v1/products", async () => {
    requestJsonMock.mockResolvedValue({ status: "success", message: "OK", data: {} as never })
    const image = new File(["data"], "product.png", { type: "image/png" })

    await createAdminProduct(session, { name: "Mie Goreng", sku: "MG-001", price: 15000 }, image)

    const [, , init, token] = requestJsonMock.mock.calls[0]
    expect(requestJsonMock.mock.calls[0][0]).toBe("/api/v1/products")
    expect(init?.method).toBe("POST")
    expect(init?.body).toBeInstanceOf(FormData)
    expect(token).toBe(session.token)
  })
})

describe("updateAdminProduct", () => {
  beforeEach(() => requestJsonMock.mockReset())

  it("sends multipart FormData to PATCH /api/v1/products/:id", async () => {
    requestJsonMock.mockResolvedValue({ status: "success", message: "OK", data: {} as never })

    await updateAdminProduct(session, "prod-1", { name: "Mie Goreng", price: 18000 })

    expect(requestJsonMock.mock.calls[0][0]).toBe("/api/v1/products/prod-1")
    expect(requestJsonMock.mock.calls[0][2]?.method).toBe("PATCH")
    expect(requestJsonMock.mock.calls[0][2]?.body).toBeInstanceOf(FormData)
  })
})