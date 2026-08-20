import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"
import { ApiError, requestJson } from "./http-client"
import * as authApi from "@/features/auth/auth-api"

describe("Silent Token Refresh & Concurrency", () => {
  const dummySchema = z.object({
    status: z.string(),
    data: z.object({
      message: z.string(),
    }),
  })

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("completes normal request without triggering refresh when status is 200 OK", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "success", data: { message: "Hello World" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    )

    const refreshSpy = vi.spyOn(authApi, "refreshAuthSession")

    const result = await requestJson("/api/v1/test", dummySchema, {}, "initial-token")

    expect(result.data.message).toBe("Hello World")
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(refreshSpy).not.toHaveBeenCalled()
  })

  it("intercepts 401, triggers refresh, and retries request with new access token", async () => {
    let callCount = 0
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      callCount++
      const authHeader = new Headers(init?.headers).get("authorization")

      if (callCount === 1) {
        // First call fails with 401
        expect(authHeader).toBe("Bearer expired-token")
        return new Response(
          JSON.stringify({
            status: "error",
            message: "Unauthorized",
            error: { code: "UNAUTHORIZED" },
          }),
          { status: 401, headers: { "content-type": "application/json" } },
        )
      }

      // Retry call succeeds with new token
      expect(authHeader).toBe("Bearer fresh-access-token")
      return new Response(
        JSON.stringify({ status: "success", data: { message: "Success after refresh" } }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    })

    const refreshSpy = vi.spyOn(authApi, "refreshAuthSession").mockResolvedValue({
      token: "fresh-access-token",
      refreshToken: "",
      merchantId: "M-1",
      operator: { id: "u-1", name: "Operator", role: "OPERATOR" },
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    })

    const result = await requestJson("/api/v1/protected", dummySchema, {}, "expired-token")

    expect(result.data.message).toBe("Success after refresh")
    expect(refreshSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it("executes exactly ONE refresh request for concurrent 401 responses and retries all with fresh token", async () => {
    let refreshCalls = 0
    vi.spyOn(authApi, "refreshAuthSession").mockImplementation(async () => {
      refreshCalls++
      // simulate network latency
      await new Promise((resolve) => setTimeout(resolve, 50))
      return {
        token: "concurrent-fresh-token",
        refreshToken: "",
        merchantId: "M-1",
        operator: { id: "u-1", name: "Operator", role: "OPERATOR" },
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      }
    })

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      const authHeader = new Headers(init?.headers).get("authorization")

      if (authHeader === "Bearer old-expired-token") {
        return new Response(
          JSON.stringify({
            status: "error",
            message: "Unauthorized",
            error: { code: "UNAUTHORIZED" },
          }),
          { status: 401, headers: { "content-type": "application/json" } },
        )
      }

      if (authHeader === "Bearer concurrent-fresh-token") {
        return new Response(
          JSON.stringify({ status: "success", data: { message: "Concurrent OK" } }),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }

      return new Response("Unknown token", { status: 400 })
    })

    // Launch 5 concurrent requests with expired token
    const promises = [
      requestJson("/api/v1/endpoint-1", dummySchema, {}, "old-expired-token"),
      requestJson("/api/v1/endpoint-2", dummySchema, {}, "old-expired-token"),
      requestJson("/api/v1/endpoint-3", dummySchema, {}, "old-expired-token"),
      requestJson("/api/v1/endpoint-4", dummySchema, {}, "old-expired-token"),
      requestJson("/api/v1/endpoint-5", dummySchema, {}, "old-expired-token"),
    ]

    const results = await Promise.all(promises)

    expect(results).toHaveLength(5)
    results.forEach((res) => expect(res.data.message).toBe("Concurrent OK"))

    // Crucial check: exactly 1 refresh call executed across all 5 concurrent requests!
    expect(refreshCalls).toBe(1)
    // 5 original calls (401) + 5 retry calls (200) = 10 total fetch calls
    expect(fetchSpy).toHaveBeenCalledTimes(10)
  })

  it("does not retry indefinitely if retry request also returns 401", async () => {
    vi.spyOn(authApi, "refreshAuthSession").mockResolvedValue({
      token: "still-invalid-token",
      refreshToken: "",
      merchantId: "M-1",
      operator: { id: "u-1", name: "Operator", role: "OPERATOR" },
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    })

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "error",
          message: "Unauthorized",
          error: { code: "UNAUTHORIZED" },
        }),
        { status: 401, headers: { "content-type": "application/json" } },
      ),
    )

    await expect(
      requestJson("/api/v1/protected", dummySchema, {}, "token"),
    ).rejects.toThrow(ApiError)

    // Should fetch exactly twice (1 original + 1 retry), then throw without infinite loop
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it("handles FormData multipart request safely during retry", async () => {
    const formData = new FormData()
    formData.append("name", "Product With Image")

    let callCount = 0
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      callCount++
      if (callCount === 1) {
        return new Response(
          JSON.stringify({ status: "error", message: "Unauthorized" }),
          { status: 401, headers: { "content-type": "application/json" } },
        )
      }

      expect(init?.body).toBe(formData)
      return new Response(
        JSON.stringify({ status: "success", data: { message: "Multipart Upload Success" } }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    })

    vi.spyOn(authApi, "refreshAuthSession").mockResolvedValue({
      token: "new-token-multipart",
      refreshToken: "",
      merchantId: "M-1",
      operator: { id: "u-1", name: "Operator", role: "OPERATOR" },
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    })

    const result = await requestJson(
      "/api/v1/products",
      dummySchema,
      { method: "POST", body: formData },
      "expired-token",
    )

    expect(result.data.message).toBe("Multipart Upload Success")
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })
})
