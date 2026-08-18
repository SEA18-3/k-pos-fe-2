/**
 * admin-catalog-api.ts
 *
 * Mengintegrasikan manajemen produk dengan endpoint backend K-POS.
 *
 * Endpoint backend yang digunakan:
 *  - GET   /api/v1/products              — daftar produk
 *  - POST  /api/v1/products              — buat produk baru
 *  - PATCH /api/v1/products/:id_product  — update produk
 *  - DELETE /api/v1/products/:id_product — soft delete produk
 */

import { z } from "zod"
import { requestJson } from "@/infrastructure/api/http-client"
import type { AuthSession } from "@/infrastructure/persistence/models"

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const backendInventorySchema = z.object({
  id_inventory: z.string().optional(),
  current_stock: z.number(),
  reserved: z.number().optional(),
  last_updated: z.string().optional(),
})

const backendProductSchema = z.object({
  id_product: z.string(),
  id_merchant: z.string().optional(),
  name: z.string(),
  sku: z.string(),
  price: z.string().or(z.number()),
  image_url: z.string().nullable().optional(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string().optional(),
  inventory: backendInventorySchema.optional().nullable(),
})

export type BackendProduct = z.output<typeof backendProductSchema>

const productListResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  data: z.object({
    items: z.array(backendProductSchema),
    meta: z.object({
      next_cursor: z.string().nullable().optional(),
      limit: z.number().optional(),
    }).optional(),
  }),
})

const productMutationResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  data: backendProductSchema,
})

const softDeleteResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  data: z.object({
    id_product: z.string(),
    is_active: z.boolean(),
    updated_at: z.string().optional(),
  }),
})

// ---------------------------------------------------------------------------
// Request Types
// ---------------------------------------------------------------------------

export type ProductInput = {
  name: string
  sku: string
  price: number
  image?: File | null
}

export type ProductPatch = Partial<ProductInput>

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

/** Ambil daftar produk milik merchant yang sedang login */
export function fetchAdminProducts(session: AuthSession) {
  return requestJson("/api/v1/products", productListResponseSchema, {}, session.token)
}

function toFormData(data: Record<string, any>) {
  const form = new FormData()
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      if (value instanceof Blob) {
        form.append(key, value)
      } else {
        form.append(key, String(value))
      }
    }
  }
  return form
}

/** Buat produk baru + otomatis buat record Inventory dengan current_stock=0 */
export function createAdminProduct(session: AuthSession, input: ProductInput) {
  return requestJson(
    "/api/v1/products",
    productMutationResponseSchema,
    { method: "POST", body: toFormData(input) },
    session.token,
  )
}

/** Update detail produk (semua field opsional) */
export function updateAdminProduct(session: AuthSession, productId: string, patch: ProductPatch) {
  return requestJson(
    `/api/v1/products/${encodeURIComponent(productId)}`,
    productMutationResponseSchema,
    { method: "PATCH", body: toFormData(patch) },
    session.token,
  )
}

/** Soft delete produk (is_active = false) atau restore (is_active = true) */
export function setAdminProductArchived(
  session: AuthSession,
  productId: string,
  archived: boolean,
) {
  if (archived) {
    // Soft delete: DELETE /api/v1/products/:id
    return requestJson(
      `/api/v1/products/${encodeURIComponent(productId)}`,
      softDeleteResponseSchema,
      { method: "DELETE" },
      session.token,
    )
  } else {
    // Restore: PATCH /api/v1/products/:id dengan is_active = true
    return requestJson(
      `/api/v1/products/${encodeURIComponent(productId)}`,
      productMutationResponseSchema,
      { method: "PATCH", body: JSON.stringify({ is_active: true }) },
      session.token,
    )
  }
}

/** Sesuaikan stok produk (Inventory Reconciliation) */
export function adjustAdminProductStock(
  session: AuthSession,
  productId: string,
  quantity: number,
  notes?: string,
) {
  return requestJson(
    `/api/v1/products/${encodeURIComponent(productId)}/stock`,
    productMutationResponseSchema, // Backend mengembalikan data produk beserta inventory terbaru
    { 
      method: "POST", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity, notes }) 
    },
    session.token,
  )
}
