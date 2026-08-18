import { afterEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

import { requestJson, resolveApiUrl } from "./http-client"

const responseSchema = z.object({ ok: z.literal(true) })

describe("requestJson", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("does not label a bodyless POST as JSON", async () => {
    const fetchMock = successfulFetch()
    vi.stubGlobal("fetch", fetchMock)

    await requestJson("/logout", responseSchema, { method: "POST" }, "token")

    expect(requestHeaders(fetchMock)).toEqual({ authorization: "Bearer token" })
  })

  it("labels serialized request bodies as JSON", async () => {
    const fetchMock = successfulFetch()
    vi.stubGlobal("fetch", fetchMock)

    await requestJson("/login", responseSchema, {
      method: "POST",
      body: JSON.stringify({ pin: "1234" }),
    })

    expect(requestHeaders(fetchMock)).toEqual({ "content-type": "application/json" })
  })

  it("preserves caller-provided headers over generated defaults", async () => {
    const fetchMock = successfulFetch()
    vi.stubGlobal("fetch", fetchMock)

    await requestJson(
      "/custom",
      responseSchema,
      {
        method: "POST",
        body: "payload",
        headers: [
          ["content-type", "text/plain"],
          ["authorization", "Custom credential"],
        ],
      },
      "token",
    )

    expect(requestHeaders(fetchMock)).toEqual({
      authorization: "Custom credential",
      "content-type": "text/plain",
    })
  })
})

describe("resolveApiUrl", () => {
  it("normalizes an explicitly configured URL", () => {
    expect(resolveApiUrl(" https://api.example.com/// ", false)).toBe("https://api.example.com")
  })

  it("uses the local API during development", () => {
    expect(resolveApiUrl(undefined, true)).toBe("http://localhost:3000")
  })

  it("uses same-origin requests in a production build", () => {
    expect(resolveApiUrl(undefined, false)).toBe("")
  })
})

function successfulFetch() {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  )
}

function requestHeaders(fetchMock: ReturnType<typeof successfulFetch>) {
  const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined
  return Object.fromEntries(new Headers(init?.headers).entries())
}
