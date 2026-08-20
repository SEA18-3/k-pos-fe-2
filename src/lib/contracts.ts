/**
 * contracts.ts
 *
 * Mendefinisikan semua Zod schema untuk validasi response dari backend K-POS.
 * File ini menggantikan dependency @operator/contracts yang tidak lagi digunakan.
 * Seluruh schema disesuaikan dengan API Contract backend (docs/api_contract.md).
 */

import { z } from "zod"

// ---------------------------------------------------------------------------
// Shared / Utility Schemas
// ---------------------------------------------------------------------------

/** Envelope sukses generik dari backend */
export const successEnvelopeSchema = z.object({
  status: z.literal("success"),
  message: z.string(),
  data: z.unknown(),
})

/** Error response dari backend (dari HttpExceptionFilter) */
export const apiErrorResponseSchema = z.object({
  status: z.literal("error"),
  message: z.union([z.string(), z.array(z.string())]),
  data: z.unknown().optional(),
  error: z
    .object({
      code: z.string().optional(),
      details: z.unknown().optional(),
      request_id: z.string().optional(),
      path: z.string().optional(),
      timestamp: z.string().optional(),
    })
    .optional(),
  // Fallback direct root properties if any
  code: z.string().optional(),
  requestId: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Health Check
// ---------------------------------------------------------------------------

export const healthResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  data: z.object({
    uptime: z.number().optional(),
    database: z.string().optional(),
    message_queue: z.string().optional(),
  }).passthrough(),
})

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const loginResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  data: z.object({
    access_token: z.string(),
    refresh_token: z.string().optional(), // Backend mengembalikan refresh_token via HttpOnly cookie
    user: z.object({
      id_user: z.string(),
      full_name: z.string(),
      email: z.string(),
      role: z.enum(["OWNER", "OPERATOR", "ENTRY"]),
      id_merchant: z.string().nullable(),
      is_active: z.boolean(),
    }),
  }),
})

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

/**
 * Response sync dari backend.
 * Backend controller mengembalikan { message, data: { accepted, queued_at } }
 * yang dibungkus oleh TransformInterceptor menjadi data.data.
 */
export const syncResponseSchema = z.object({
  status: z.string().optional(),
  message: z.string(),
  data: z.object({
    message: z.string().optional(),
    data: z
      .object({
        accepted: z.number(),
        queued_at: z.string(),
      })
      .optional(),
    accepted: z.number().optional(),
    queued_at: z.string().optional(),
  }),
})

// ---------------------------------------------------------------------------
// Derived Types
// ---------------------------------------------------------------------------

export type LoginResponse = z.output<typeof loginResponseSchema>
export type SyncResponse = z.output<typeof syncResponseSchema>
export type HealthResponse = z.output<typeof healthResponseSchema>
