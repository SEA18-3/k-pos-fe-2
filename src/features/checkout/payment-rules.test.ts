import { describe, expect, it } from "vitest"

import { validatePayment, verificationTypeFor } from "./payment-rules"

describe("payment rules", () => {
  it("requires sufficient cash and classifies it as system verifiable", () => {
    expect(validatePayment("CASH", 20_000, 19_000)).toBe(false)
    expect(validatePayment("CASH", 20_000, 20_000)).toBe(true)
    expect(verificationTypeFor("CASH")).toBe("SYSTEM_VERIFIABLE")
  })

  it("requires an operator assertion for QRIS and transfer", () => {
    expect(validatePayment("STATIC_QRIS", 20_000, undefined, false)).toBe(false)
    expect(validatePayment("TRANSFER", 20_000, undefined, true)).toBe(true)
    expect(verificationTypeFor("STATIC_QRIS")).toBe("OPERATOR_ASSERTED")
  })
})
