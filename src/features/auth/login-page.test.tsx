import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LoginPage } from "./login-page"
import * as authApi from "@/features/auth/auth-api"
import type { AuthSession, DeviceIdentity } from "@/infrastructure/persistence/models"

vi.mock("@/features/auth/auth-api", () => ({
  activateAndLogin: vi.fn(),
  bootstrapLocalData: vi.fn(),
}))

const mockDevice: DeviceIdentity = {
  id: "dev-test-1234",
  name: "POS Counter 1",
  createdAt: "2026-08-18T00:00:00Z",
}

const mockSession: AuthSession = {
  token: "jwt-token-123",
  refreshToken: "refresh-token-456",
  merchantId: "M-1",
  operator: { id: "u-1", name: "Merchant Owner", role: "OWNER" },
  expiresAt: "2026-08-19T00:00:00Z",
}

describe("LoginPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders email, password inputs, and device identifier", () => {
    render(<LoginPage device={mockDevice} onAuthenticated={vi.fn()} />)

    expect(screen.getByLabelText(/Email Pengguna/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Kata Sandi/i)).toBeInTheDocument()
    expect(screen.getByText("dev-test-1234")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Aktifkan & masuk/i })).toBeInTheDocument()
  })

  it("displays error message banner when authentication fails", async () => {
    const user = userEvent.setup()
    vi.mocked(authApi.activateAndLogin).mockRejectedValueOnce(
      new Error("Email atau kata sandi salah"),
    )

    render(<LoginPage device={mockDevice} onAuthenticated={vi.fn()} />)

    const submitBtn = screen.getByRole("button", { name: /Aktifkan & masuk/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText("Email atau kata sandi salah")).toBeInTheDocument()
    })
    expect(submitBtn).toBeEnabled()
  })

  it("invokes onAuthenticated when login and bootstrap succeed", async () => {
    const user = userEvent.setup()
    const onAuthenticated = vi.fn()

    vi.mocked(authApi.activateAndLogin).mockResolvedValueOnce(mockSession)
    vi.mocked(authApi.bootstrapLocalData).mockResolvedValueOnce(undefined as never)

    render(<LoginPage device={mockDevice} onAuthenticated={onAuthenticated} />)

    const emailInput = screen.getByLabelText(/Email Pengguna/i)
    const passwordInput = screen.getByLabelText(/Kata Sandi/i)

    await user.clear(emailInput)
    await user.type(emailInput, "owner@kpos.com")

    await user.clear(passwordInput)
    await user.type(passwordInput, "password123")

    const submitBtn = screen.getByRole("button", { name: /Aktifkan & masuk/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(authApi.activateAndLogin).toHaveBeenCalledWith({
        email: "owner@kpos.com",
        password: "password123",
        device: mockDevice,
      })
      expect(authApi.bootstrapLocalData).toHaveBeenCalledWith(mockSession, mockDevice)
      expect(onAuthenticated).toHaveBeenCalledWith(mockSession)
    })
  })
})
