import { describe, expect, it } from "vitest"

import { BATCH_SIZE, calculateBackoffMs, transitionForResult } from "@/features/sync/sync-policy"

describe("sync retry policy", () => {
  it("uses a bounded batch of 25 transactions", () => {
    expect(BATCH_SIZE).toBe(25)
  })

  it("applies exponential backoff with 50-100% jitter", () => {
    expect(calculateBackoffMs(0, () => 0)).toBe(500)
    expect(calculateBackoffMs(0, () => 1)).toBe(1_000)
    expect(calculateBackoffMs(3, () => 0)).toBe(4_000)
    expect(calculateBackoffMs(3, () => 1)).toBe(8_000)
  })

  it("caps retry delay at five minutes", () => {
    expect(calculateBackoffMs(30, () => 1)).toBe(5 * 60_000)
  })

  it("does not increment retry count after a successful acceptance", () => {
    const transition = transitionForResult(
      { transactionId: "tx", status: "ACCEPTED", settlementStatus: "SETTLED" },
      3,
      Date.UTC(2026, 7, 15),
    )
    expect(transition).toMatchObject({ outbox: "DELETE", retryCount: 3, syncStatus: "SYNCED" })
  })
})
