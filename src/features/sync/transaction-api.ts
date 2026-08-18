import { z } from "zod"

import { requestJson } from "@/infrastructure/api/http-client"

const backendTransactionSyncSchema = z.object({
  offline_uuid: z.string(),
  sync_status: z.string(),
})

const transactionsResponseSchema = z.object({
  status: z.string().optional(),
  message: z.string().optional(),
  data: z.union([
    z.object({
      data: z.array(backendTransactionSyncSchema),
      meta: z
        .object({
          next_cursor: z.string().nullable().optional(),
          limit: z.number().optional(),
        })
        .optional(),
    }),
    z.array(backendTransactionSyncSchema),
  ]),
  meta: z
    .object({
      next_cursor: z.string().nullable().optional(),
      limit: z.number().optional(),
    })
    .optional(),
})

export type BackendTransactionSync = z.infer<typeof backendTransactionSyncSchema>

export type ListTransactionsParams = {
  id_device: string
  sync_status?: string
  cursor?: string | null
  limit?: number
}

export async function fetchTransactions(
  token: string,
  params: ListTransactionsParams,
): Promise<{ items: BackendTransactionSync[]; nextCursor: string | null }> {
  const query = new URLSearchParams({ id_device: params.id_device })
  if (params.sync_status) query.set("sync_status", params.sync_status)
  if (params.cursor) query.set("cursor", params.cursor)
  if (params.limit != null) query.set("limit", String(params.limit))
  const response = await requestJson(
    `/api/v1/transactions?${query.toString()}`,
    transactionsResponseSchema,
    { method: "GET" },
    token,
  )
  if (Array.isArray(response.data)) {
    return { items: response.data, nextCursor: response.meta?.next_cursor ?? null }
  }
  return {
    items: response.data.data,
    nextCursor: response.data.meta?.next_cursor ?? response.meta?.next_cursor ?? null,
  }
}
