import { describe, expect, it } from "vitest"

import type { AuthSession } from "./models"
import {
  isOfflineCheckoutAllowed,
  isOnlineSessionValid,
  OFFLINE_LEASE_MS,
} from "./session-repository"

function session(now: number): AuthSession {
  return {
    token: "token",
    refreshToken: "refreshToken",
    merchantId: "merchant",
    operator: { id: "operator", name: "Operator", role: "OPERATOR" },
    expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
  }
}

describe("offline session lease", () => {
  it("pauses sync after 12 hours while checkout remains allowed for 72 hours", () => {
    const now = Date.UTC(2026, 7, 15)
    const active = session(now)
    const afterTokenExpiry = now + 13 * 60 * 60 * 1_000
    expect(isOnlineSessionValid(active, afterTokenExpiry)).toBe(false)
    expect(isOfflineCheckoutAllowed(active, afterTokenExpiry)).toBe(true)
  })

  it("blocks only new checkout after the offline lease expires", () => {
    const now = Date.UTC(2026, 7, 15)
    expect(isOfflineCheckoutAllowed(session(now), now + OFFLINE_LEASE_MS + 1)).toBe(false)
  })
})
