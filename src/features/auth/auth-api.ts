/**
 * auth-api.ts
 *
 * Mengintegrasikan auth frontend dengan backend K-POS.
 *
 * Endpoint backend yang digunakan:
 *  - POST /api/v1/auth/register — registrasi OWNER baru
 *  - POST /api/v1/auth/login    — login dengan email + password
 *  - GET  /api/v1/auth/profile  — ambil profil user yang sedang login
 *  - POST /api/v1/auth/refresh  — refresh access token via HttpOnly cookie
 *  - POST /api/v1/auth/logout   — logout dan revoke refresh token
 */

import { loginResponseSchema } from "@/lib/contracts"
import { z } from "zod"
import { requestJson } from "@/infrastructure/api/http-client"
import { mapProduct } from "@/infrastructure/api/mappers"
import { fetchCatalogProducts } from "@/features/catalog/catalog-api"
import { replaceCatalog } from "@/infrastructure/persistence/catalog-repository"
import { saveDeviceIdentity } from "@/infrastructure/persistence/device-repository"
import type { AuthSession, DeviceIdentity, Product } from "@/infrastructure/persistence/models"
import {
  saveAuthSession,
  saveCachedCredential,
  verifyAndRestoreCachedSession,
} from "@/infrastructure/persistence/session-repository"
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

// Schema untuk response refresh token
export const refreshResponseSchema = z.object({
  status: z.string().optional(),
  message: z.string().optional(),
  data: z.object({
    access_token: z.string(),
  }),
})

const registerResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  data: z.unknown().optional(),
})

export type RegisterOwnerRequest = {
  full_name: string
  email: string
  password: string
  merchant_name: string
}

export async function registerOwner(input: RegisterOwnerRequest) {
  return requestJson(
    "/api/v1/auth/register",
    registerResponseSchema,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  )
}

/**
 * Mengekstrak expiry time (exp) dari JWT payload.
 * Fallback ke 15 menit jika token bukan JWT standar.
 */
export function parseJwtExpiry(token: string): string {
  try {
    const parts = token.split(".")
    if (parts.length === 3) {
      const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
      const payload = JSON.parse(atob(base64))
      if (typeof payload.exp === "number") {
        return new Date(payload.exp * 1000).toISOString()
      }
    }
  } catch {
    // fallback
  }
  return new Date(Date.now() + 15 * 60 * 1000).toISOString()
}

/**
 * Login menggunakan email dan password.
 * Fungsi ini menggantikan flow lama (merchantCode + pin + activationCode).
 */
export async function activateAndLogin(input: {
  email: string
  password: string
  device: DeviceIdentity
}): Promise<AuthSession> {
  try {
    // 1. Coba login ke backend menggunakan email + password
    const result = await requestJson("/api/v1/auth/login", loginResponseSchema, {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        password: input.password,
      }),
    })

    const user = result.data.user
    const accessToken = result.data.access_token
    const session: AuthSession = {
      token: accessToken,
      refreshToken: result.data.refresh_token ?? "",
      // id_merchant bisa null jika user belum memiliki merchant
      merchantId: user.id_merchant ?? "",
      operator: {
        id: user.id_user,
        name: user.full_name,
        role: user.role as AuthSession["operator"]["role"],
      },
      expiresAt: parseJwtExpiry(accessToken),
    }

    // Coba ambil device dari backend atau daftarkan jika belum ada
    try {
      const devicesRes = await requestJson(
        "/api/v1/devices",
        z.any(),
        { method: "GET" },
        session.token,
      )
      if (devicesRes?.data && Array.isArray(devicesRes.data) && devicesRes.data.length > 0) {
        input.device.id = devicesRes.data[0].id_device
      } else if (user.role === "OWNER") {
        const createRes = await requestJson(
          "/api/v1/devices",
          z.any(),
          {
            method: "POST",
            body: JSON.stringify({ name: input.device.name }),
          },
          session.token,
        )
        if (createRes?.data?.id_device) {
          input.device.id = createRes.data.id_device
        }
      }
    } catch (err) {
      console.error("Failed to auto-register device with backend", err)
    }

    await saveAuthSession(session)
    await saveCachedCredential(input.email, input.password, session)

    return session
  } catch (error) {
    // 2. Fallback offline: jika offline / network unreachable, coba verifikasi credential cache lokal
    const isNetworkError =
      (typeof navigator !== "undefined" && !navigator.onLine) ||
      error instanceof TypeError ||
      (error instanceof Error &&
        (error.message.includes("fetch") ||
          error.message.includes("Network") ||
          error.message.includes("Failed to fetch") ||
          error.message.includes("ECONNREFUSED") ||
          error.message.includes("network")))

    if (isNetworkError) {
      const offlineSession = await verifyAndRestoreCachedSession(input.email, input.password)
      if (offlineSession) {
        return offlineSession
      }
      throw new Error(
        "Gagal login offline. Email atau kata sandi tidak cocok, atau akun ini belum pernah login di perangkat ini saat online.",
      )
    }

    throw error
  }
}

/**
 * Memanggil endpoint POST /api/v1/auth/refresh (HttpOnly cookie)
 * dan memperbarui token sesi di IndexedDB.
 */
export async function refreshAuthSession(): Promise<AuthSession | null> {
  const session = await (await import("@/infrastructure/persistence/session-repository")).getAuthSession()
  if (!session) return null

  const result = await requestJson(
    "/api/v1/auth/refresh",
    refreshResponseSchema,
    { method: "POST" },
    undefined,
    true, // isRetry=true mencegah interceptor loop
  )

  const newAccessToken = result.data.access_token
  const updatedSession: AuthSession = {
    ...session,
    token: newAccessToken,
    expiresAt: parseJwtExpiry(newAccessToken),
  }

  await saveAuthSession(updatedSession)
  return updatedSession
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
