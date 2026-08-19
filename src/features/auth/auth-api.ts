/**
 * auth-api.ts
 *
 * Mengintegrasikan auth frontend dengan backend K-POS.
 *
 * Endpoint backend yang digunakan:
 *  - POST /api/v1/auth/login   — login dengan email + password
 *  - GET  /api/v1/auth/profile — ambil profil user yang sedang login
 *  - POST /api/v1/auth/logout  — logout dan revoke refresh token
 *
 * CATATAN PENTING:
 * Frontend lama menggunakan flow "merchantCode + operatorCode + pin + activationCode".
 * Backend K-POS menggunakan flow standar "email + password" (JWT).
 * Fungsi `activateAndLogin` dipertahankan signaturenya agar tidak merusak komponen login,
 * namun di dalam memetakan ke endpoint yang benar.
 */

import { loginResponseSchema } from "@/lib/contracts"
import { z } from "zod"
import { requestJson } from "@/infrastructure/api/http-client"
import { mapProduct } from "@/infrastructure/api/mappers"
import { fetchCatalogProducts } from "@/features/catalog/catalog-api"
import { replaceCatalog } from "@/infrastructure/persistence/catalog-repository"
import { saveDeviceIdentity } from "@/infrastructure/persistence/device-repository"
import type { AuthSession, DeviceIdentity, Product } from "@/infrastructure/persistence/models"
import { saveAuthSession } from "@/infrastructure/persistence/session-repository"
import { writeSetting } from "@/infrastructure/persistence/settings-repository"

// Schema untuk response logout
const logoutResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  data: z.unknown(),
})

// Schema untuk response profile
const profileResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  data: z.object({
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

/**
 * Login menggunakan email dan password.
 * Fungsi ini menggantikan flow lama (merchantCode + pin + activationCode).
 */
export async function activateAndLogin(input: {
  email: string
  password: string
  device: DeviceIdentity
}): Promise<AuthSession> {
  // Login ke backend menggunakan email + password
  const result = await requestJson("/api/v1/auth/login", loginResponseSchema, {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      password: input.password,
    }),
  })

  const user = result.data.user
  const session: AuthSession = {
    token: result.data.access_token,
    refreshToken: result.data.refresh_token ?? "",
    // id_merchant bisa null jika user belum memiliki merchant
    merchantId: user.id_merchant ?? "",
    operator: {
      id: user.id_user,
      name: user.full_name,
      role: user.role as AuthSession["operator"]["role"],
    },
    // Access token dari backend bertahan sesuai JWT_EXPIRATION_TIME
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1_000).toISOString(),
  }

  await saveAuthSession(session)
  await saveDeviceIdentity({ ...input.device, registeredAt: new Date().toISOString() })

  return session
}

/**
 * Mengambil data produk dari backend untuk dimasukkan ke IndexedDB.
 * Jika koneksi gagal, sistem tetap mempertahankan katalog lokal yang sudah ada
 * dan sesi login kasir tetap aktif (degraded offline mode).
 */
export async function bootstrapLocalData(session: AuthSession, _device: DeviceIdentity): Promise<Product[]> {
  await writeSetting("merchantProfile", JSON.stringify({ id: session.merchantId }))
  try {
    const backendProducts = await fetchCatalogProducts(session.token)
    const products = backendProducts.map(mapProduct)
    await replaceCatalog(products)
    return products
  } catch (error) {
    console.warn("[bootstrap] Catalog fetch failed during bootstrap; preserving existing local catalog:", error)
    return []
  }
}

/**
 * Logout online: revoke refresh token di backend.
 * Backend membaca HttpOnly cookie refreshToken atau header x-refresh-token.
 */
export async function logoutOnline(session: AuthSession) {
  return requestJson(
    "/api/v1/auth/logout",
    logoutResponseSchema,
    {
      method: "POST",
      headers: session.refreshToken ? { "x-refresh-token": session.refreshToken } : {},
    },
    session.token,
  )
}
