/**
 * admin-users-api.ts
 *
 * Mengintegrasikan manajemen user/staf dengan endpoint backend K-POS.
 *
 * Endpoint backend yang digunakan:
 *  - GET   /api/v1/users                    — daftar semua user di merchant
 *  - POST  /api/v1/users                    — buat user OPERATOR/ENTRY baru
 *  - PATCH /api/v1/users/:id_user/status    — aktifkan/nonaktifkan user
 *  - GET   /api/v1/devices                  — daftar perangkat
 *  - DELETE /api/v1/devices/:id_device      — revoke/hapus perangkat
 */

import { z } from "zod"
import { requestJson } from "@/infrastructure/api/http-client"
import type { AuthSession } from "@/infrastructure/persistence/models"

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const adminUserSchema = z.object({
  id_user: z.string(),
  full_name: z.string(),
  email: z.string(),
  role: z.enum(["OWNER", "OPERATOR", "ENTRY"]),
  id_merchant: z.string().nullable().optional(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string().optional(),
})

export type AdminOperator = z.output<typeof adminUserSchema>

const userListResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  data: z.object({
    items: z.array(adminUserSchema),
  }),
})

const userMutationResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  data: adminUserSchema,
})

const adminDeviceSchema = z.object({
  id_device: z.string(),
  name: z.string(),
  status: z.enum(["UNPAIRED", "PAIRED", "REVOKED"]),
  last_online_at: z.string().nullable().optional(),
  created_at: z.string(),
  is_active: z.boolean().optional(),
})

const deviceListResponseSchema = z.object({
  status: z.string().optional(),
  message: z.string().optional(),
  data: z.union([
    z.array(adminDeviceSchema),
    z.object({
      items: z.array(adminDeviceSchema),
    }),
  ]),
})

const revokeDeviceResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  data: z.object({
    id_device: z.string(),
    status: z.string(),
    is_active: z.boolean().optional(),
  }),
})

const createDeviceResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  data: z.object({
    id_device: z.string(),
    pairing_code: z.string(),
    status: z.string(),
  }),
})

// ---------------------------------------------------------------------------
// Request Types
// ---------------------------------------------------------------------------

export type CreateOperatorRequest = {
  full_name: string
  email: string
  password: string
  role: "OPERATOR" | "ENTRY"
}

export type UpdateOperatorRequest = {
  is_active: boolean
}

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

/** Ambil daftar semua user di merchant yang sedang login */
export function fetchOperators(session: AuthSession) {
  return requestJson("/api/v1/users", userListResponseSchema, {}, session.token)
}

/** Buat user OPERATOR atau ENTRY baru */
export function createOperator(session: AuthSession, input: CreateOperatorRequest) {
  return requestJson(
    "/api/v1/users",
    userMutationResponseSchema,
    { method: "POST", body: JSON.stringify(input) },
    session.token,
  )
}

/** Aktifkan atau nonaktifkan user (soft delete) */
export function updateOperator(
  session: AuthSession,
  userId: string,
  input: UpdateOperatorRequest,
) {
  return requestJson(
    `/api/v1/users/${encodeURIComponent(userId)}/status`,
    userMutationResponseSchema,
    { method: "PATCH", body: JSON.stringify(input) },
    session.token,
  )
}

export type AdminDevice = z.output<typeof adminDeviceSchema>

/** Ambil daftar perangkat milik merchant */
export async function fetchDevices(session: AuthSession) {
  const response = await requestJson("/api/v1/devices", deviceListResponseSchema, {}, session.token)
  const items = Array.isArray(response.data) ? response.data : response.data.items
  return {
    ...response,
    data: { items },
  }
}

/** Soft delete / revoke perangkat (DELETE /api/v1/devices/:id_device) */
export function revokeDevice(session: AuthSession, deviceId: string) {
  return requestJson(
    `/api/v1/devices/${encodeURIComponent(deviceId)}`,
    revokeDeviceResponseSchema,
    { method: "DELETE" },
    session.token,
  )
}

/** Tambah perangkat baru */
export function createDevice(session: AuthSession, name: string) {
  return requestJson(
    "/api/v1/devices",
    createDeviceResponseSchema,
    {
      method: "POST",
      body: JSON.stringify({ name }),
    },
    session.token,
  )
}
