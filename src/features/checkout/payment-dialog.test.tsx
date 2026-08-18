import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { PaymentDialog } from "./payment-dialog"
import { formatCurrency } from "@/shared/lib/format"

describe("PaymentDialog Component", () => {
  it("defaults to CASH mode and disables submit when cash received is insufficient", () => {
    render(
      <PaymentDialog
        open={true}
        total={50000}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    expect(screen.getByText("Selesaikan pembayaran")).toBeInTheDocument()
    expect(screen.getByText("Uang diterima")).toBeInTheDocument()

    const submitBtn = screen.getByRole("button", { name: /Konfirmasi penjualan/i })
    expect(submitBtn).toBeDisabled()
  })

  it("enables submit and computes change correctly when cash is sufficient", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn().mockResolvedValue(undefined)

    render(
      <PaymentDialog
        open={true}
        total={35000}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />,
    )

    // Click preset "50k" or "Uang pas"
    const uangPasBtn = screen.getByRole("button", { name: /Uang pas/i })
    await user.click(uangPasBtn)

    const submitBtn = screen.getByRole("button", { name: /Konfirmasi penjualan/i })
    expect(submitBtn).toBeEnabled()
    expect(screen.getByText("Kembalian").nextElementSibling?.textContent).toBe(formatCurrency(0))

    // Click preset 50k
    const fiftyKBtn = screen.getByRole("button", { name: "50k" })
    await user.click(fiftyKBtn)

    expect(screen.getByText("Kembalian").nextElementSibling?.textContent).toBe(formatCurrency(15000))

    // Submit sale
    await user.click(submitBtn)
    expect(onConfirm).toHaveBeenCalledWith("CASH", 50000, undefined)
  })

  it("handles QRIS payment with operator verification assertion", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn().mockResolvedValue(undefined)

    render(
      <PaymentDialog
        open={true}
        total={40000}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />,
    )

    // Switch to QRIS
    const qrisBtn = screen.getByRole("button", { name: /QRIS/i })
    await user.click(qrisBtn)

    const submitBtn = screen.getByRole("button", { name: /Konfirmasi penjualan/i })
    // Must be disabled until operator checks verification
    expect(submitBtn).toBeDisabled()

    // Click verification check button
    const verifyBtn = screen.getByRole("button", { name: /Saya sudah cek pembayaran/i })
    await user.click(verifyBtn)

    expect(screen.getByRole("button", { name: /Sudah diverifikasi/i })).toBeInTheDocument()
    expect(submitBtn).toBeEnabled()

    // Add optional reference
    const refInput = screen.getByPlaceholderText(/Referensi eksternal/i)
    await user.type(refInput, "QRIS-REF-9988")

    await user.click(submitBtn)
    expect(onConfirm).toHaveBeenCalledWith("STATIC_QRIS", undefined, "QRIS-REF-9988")
  })

  it("handles TRANSFER payment method requiring verification", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn().mockResolvedValue(undefined)

    render(
      <PaymentDialog
        open={true}
        total={100000}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />,
    )

    // Switch to Transfer
    const transferBtn = screen.getByRole("button", { name: /Transfer/i })
    await user.click(transferBtn)

    const submitBtn = screen.getByRole("button", { name: /Konfirmasi penjualan/i })
    expect(submitBtn).toBeDisabled()

    const verifyBtn = screen.getByRole("button", { name: /Saya sudah cek pembayaran/i })
    await user.click(verifyBtn)
    expect(submitBtn).toBeEnabled()

    await user.click(submitBtn)
    expect(onConfirm).toHaveBeenCalledWith("TRANSFER", undefined, undefined)
  })
})
