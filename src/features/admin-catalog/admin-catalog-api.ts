import {
  productListResponseSchema,
  productMutationResponseSchema,
  type ProductInput,
  type ProductPatch,
} from "@operator/contracts"

import { requestJson } from "@/infrastructure/api/http-client"
import type { AuthSession } from "@/infrastructure/persistence/models"

export function fetchAdminProducts(session: AuthSession) {
  return requestJson("/v1/admin/products", productListResponseSchema, {}, session.token)
}

export function createAdminProduct(session: AuthSession, input: ProductInput) {
  return requestJson(
    "/v1/admin/products",
    productMutationResponseSchema,
    { method: "POST", body: JSON.stringify(input) },
    session.token,
  )
}

export function updateAdminProduct(session: AuthSession, productId: string, patch: ProductPatch) {
  return requestJson(
    `/v1/admin/products/${encodeURIComponent(productId)}`,
    productMutationResponseSchema,
    { method: "PATCH", body: JSON.stringify(patch) },
    session.token,
  )
}

export function setAdminProductArchived(
  session: AuthSession,
  productId: string,
  archived: boolean,
) {
  return requestJson(
    `/v1/admin/products/${encodeURIComponent(productId)}/${archived ? "archive" : "restore"}`,
    productMutationResponseSchema,
    { method: "POST" },
    session.token,
  )
}
