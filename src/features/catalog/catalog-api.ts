import { z } from "zod"

import { requestJson } from "@/infrastructure/api/http-client"
import type { BackendProduct } from "@/infrastructure/api/mappers"

const backendInventorySchema = z.object({
  current_stock: z.number(),
  reserved: z.number().optional(),
  last_updated: z.string().optional(),
})

export const backendProductSchema = z.object({
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

export const backendProductListResponseSchema = z.object({
  status: z.string().optional(),
  message: z.string().optional(),
  data: z.union([
    z.object({
      items: z.array(backendProductSchema),
      meta: z
        .object({
          next_cursor: z.string().nullable().optional(),
          limit: z.number().optional(),
        })
        .optional(),
    }),
    z.array(backendProductSchema),
  ]),
})

export const backendProductListSchema = backendProductListResponseSchema

export async function fetchCatalogProducts(
  token: string,
  search?: string,
): Promise<BackendProduct[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : ""
  const response = await requestJson(
    `/api/v1/products${query}`,
    backendProductListResponseSchema,
    { method: "GET" },
    token,
  )
  const items = Array.isArray(response.data) ? response.data : response.data.items
  return items.map((item) => ({
    id_product: item.id_product,
    id_merchant: item.id_merchant ?? "",
    name: item.name,
    sku: item.sku,
    price: String(item.price),
    image_url: item.image_url ?? null,
    is_active: item.is_active,
    created_at: item.created_at,
    updated_at: item.updated_at ?? item.created_at,
    inventory: item.inventory ?? undefined,
  }))
}
