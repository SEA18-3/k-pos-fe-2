import { z } from "zod"

import { requestJson } from "@/infrastructure/api/http-client"
import type { BackendProduct } from "@/infrastructure/api/mappers"

export const backendProductSchema = z.object({
  id_product: z.string(),
  id_merchant: z.string(),
  name: z.string(),
  sku: z.string(),
  price: z.string(),
  image_url: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const backendProductListSchema = z.array(backendProductSchema)

export async function fetchCatalogProducts(
  token: string,
  search?: string,
): Promise<BackendProduct[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : ""
  return requestJson(
    `/api/v1/products${query}`,
    backendProductListSchema,
    { method: "GET" },
    token,
  )
}
