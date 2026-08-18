/**
 * http-client.ts
 *
 * HTTP utility layer generik — menangani auth header, JSON parsing, dan error normalisasi.
 * Seluruh endpoint dianggap relatif terhadap API_URL.
 * Default dev URL diubah ke port 3000 sesuai NestJS backend.
 */

import { apiErrorResponseSchema } from "@/lib/contracts"
import { z, type ZodType } from "zod"
import { getAuthSession, saveAuthSession, clearAuthSession } from "@/infrastructure/persistence/session-repository"

let refreshPromise: Promise<string | null> | null = null

async function attemptRefresh() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const session = await getAuthSession()
      if (!session) return null

      try {
        const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
          method: "POST",
          headers: session.refreshToken ? { "x-refresh-token": session.refreshToken } : {},
          credentials: "include",
        })

        if (!res.ok) {
          await clearAuthSession()
          // Optional: force reload to login screen
          window.location.reload()
          return null
        }

        const data = await res.json()
        session.token = data.data.access_token
        session.refreshToken = data.data.refresh_token ?? session.refreshToken
        session.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1_000).toISOString()
        
        await saveAuthSession(session)
        return session.token
      } catch {
        return null
      }
    })().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

export function resolveApiUrl(configuredUrl: string | undefined, isDevelopment: boolean) {
  const normalizedUrl = configuredUrl?.trim().replace(/\/+$/, "")
  if (normalizedUrl) return normalizedUrl
  // Backend NestJS berjalan di port 3000 (bukan 3001)
  return isDevelopment ? "http://localhost:3000" : ""
}

export const API_URL = resolveApiUrl(
  import.meta.env.VITE_API_URL as string | undefined,
  import.meta.env.DEV,
)

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable: boolean,
    readonly code?: string,
    readonly requestId?: string,
  ) {
    super(message)
  }
}

export async function requestJson<TSchema extends ZodType>(
  path: string,
  responseSchema: TSchema,
  init: RequestInit = {},
  token?: string,
): Promise<z.output<TSchema>> {
  let response: Response
  try {
    const headers = new Headers(init.headers)
    if (init.body !== undefined && init.body !== null && !(init.body instanceof FormData) && !headers.has("content-type")) {
      headers.set("content-type", "application/json")
    }
    if (token && !headers.has("authorization")) {
      headers.set("authorization", `Bearer ${token}`)
    }
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      credentials: init.credentials ?? "include",
    })

    // Auto-refresh token if 401 Unauthorized
    if (response.status === 401 && token) {
      const newToken = await attemptRefresh()
      if (newToken) {
        headers.set("authorization", `Bearer ${newToken}`)
        response = await fetch(`${API_URL}${path}`, {
          ...init,
          headers,
          credentials: init.credentials ?? "include",
        })
      }
    }
  } catch {
    throw new ApiError("Backend tidak dapat dijangkau", 0, true, "NETWORK_UNREACHABLE")
  }

  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const parsedError = apiErrorResponseSchema.safeParse(body)
    const retryable = response.status === 408 || response.status === 429 || response.status >= 500
    if (parsedError.success) {
      const message = Array.isArray(parsedError.data.message)
        ? parsedError.data.message.join(", ")
        : parsedError.data.message
      const code = parsedError.data.error?.code ?? parsedError.data.code ?? "ERROR"
      const requestId = parsedError.data.error?.request_id ?? parsedError.data.requestId
      throw new ApiError(
        message,
        response.status,
        retryable,
        code,
        requestId,
      )
    }
    throw new ApiError(
      `Request gagal (${response.status})`,
      response.status,
      retryable,
      "INVALID_RESPONSE",
    )
  }

  const parsed = responseSchema.safeParse(body)
  if (!parsed.success) {
    console.warn("[http-client] Response validation failed:", parsed.error.flatten())
    throw new ApiError(
      "Respons backend tidak sesuai kontrak",
      response.status,
      false,
      "INVALID_RESPONSE",
    )
  }
  return parsed.data
}
