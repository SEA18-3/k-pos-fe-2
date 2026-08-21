import { describe, expect, it } from "vitest"

import type { AuthSession } from "./models"
import {
  isOfflineCheckoutAllowed,
  isOnlineSessionValid,
  saveCachedCredential,
  verifyAndRestoreCachedSession,
} from "./session-repository"

function session(now: number): AuthSession {
  return {
    token: "token",
    refreshToken: "refreshToken",
    merchantId: "merchant-123",
    operator: { id: "operator-1", name: "Operator Maya", role: "OPERATOR" },
    expiresAt: new Date(now + 15 * 60 * 1_000).toISOString(),
  }
}

describe("offline session and credential caching", () => {
  it("allows offline checkout as long as valid session exists without arbitrary time lease", () => {
    const now = Date.UTC(2026, 7, 15)
    const active = session(now)
    const farFuture = now + 180 * 24 * 60 * 60 * 1_000 // 6 months later
    expect(isOnlineSessionValid(active, now + 16 * 60 * 1_000)).toBe(false)
    expect(isOfflineCheckoutAllowed(active)).toBe(true)
    expect(isOfflineCheckoutAllowed(null)).toBe(false)
  })

  it("saves and verifies offline credentials using salted SHA-256 hash", async () => {
    const now = Date.now()
    const active = session(now)
    await saveCachedCredential("maya@kpos.com", "secret123", active)

    // Valid credentials restore the session
    const restored = await verifyAndRestoreCachedSession("maya@kpos.com", "secret123")
    expect(restored).not.toBeNull()
    expect(restored?.operator.name).toBe("Operator Maya")
    expect(restored?.merchantId).toBe("merchant-123")

    // Wrong password returns null
    const wrongPass = await verifyAndRestoreCachedSession("maya@kpos.com", "wrongpassword")
    expect(wrongPass).toBeNull()

    // Non-existent email returns null
    const wrongEmail = await verifyAndRestoreCachedSession("other@kpos.com", "secret123")
    expect(wrongEmail).toBeNull()
  })
})
