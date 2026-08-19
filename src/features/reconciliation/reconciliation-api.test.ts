import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { AuthSession } from "@/infrastructure/persistence/models"
import {
  fetchReconciliations,
  resolvePaymentReconciliation,
  resolveConflict,
  createCorrection,
} from "./reconciliation-api"
import * as httpClient from "@/infrastructure/api/http-client"

describe("Reconciliation API Client", () => {
  const sampleSession: AuthSession = {
    token: "jwt-owner-token",
    refreshToken: "refresh-owner-token",
    merchantId: "M-OWNER-01",
    operator: { id: "u-owner", name: "Owner Toko", role: "OWNER" },
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("fetchReconciliations calls GET /api/v1/reconciliations and parses response", async () => {
    const mockResponse = {
      status: "success",
      message: "OK",
      data: [
        {
          id_reconciliation: "rec-001",
          id_payment: "pay-100",
          status: "OPEN" as const,
          reason: "Payment amount mismatch with bank statement",
          evidence_note: "Bank transfer ref TRX12345",
          opened_by: "u-owner",
          created_at: "2026-08-18T10:00:00Z",
          resolved_at: null,
          resolved_by: null,
          resolution_note: null,
          payment: {
            id_payment: "pay-100",
            amount: "50000",
            method: "STATIC_QRIS",
            transaction: {
              id_transaction: "tx-200",
              offline_uuid: "uuid-1234",
              total: "50000",
            },
          },
          openedByUser: { full_name: "Owner Toko" },
          resolvedByUser: null,
        },
      ],
    }

    const requestSpy = vi.spyOn(httpClient, "requestJson").mockResolvedValue(mockResponse)

    const result = await fetchReconciliations(sampleSession)

    expect(requestSpy).toHaveBeenCalledWith(
      "/api/v1/reconciliations",
      expect.anything(),
      {},
      sampleSession.token,
    )
    expect(result.data).toHaveLength(1)
    expect(result.data[0].id_reconciliation).toBe("rec-001")
    expect(result.data[0].status).toBe("OPEN")
  })

  it("resolvePaymentReconciliation calls POST /api/v1/reconciliations/:id/resolve with VALID or INVALID status", async () => {
    const mockResolveResponse = {
      status: "success",
      message: "Reconciliation resolved",
      data: {
        id_reconciliation: "rec-001",
        status: "RESOLVED_VALID",
        resolution_note: "Transfer confirmed by bank statement",
      },
    }

    const requestSpy = vi.spyOn(httpClient, "requestJson").mockResolvedValue(mockResolveResponse)

    const result = await resolvePaymentReconciliation(sampleSession, "rec-001", {
      resolution: "Transfer confirmed by bank statement",
      status: "RESOLVED_VALID",
    })

    expect(requestSpy).toHaveBeenCalledWith(
      "/api/v1/reconciliations/rec-001/resolve",
      expect.anything(),
      {
        method: "POST",
        body: JSON.stringify({
          resolution: "Transfer confirmed by bank statement",
          status: "RESOLVED_VALID",
        }),
      },
      sampleSession.token,
    )
    expect(result.status).toBe("success")
  })

  it("resolveConflict calls POST /api/v1/transactions/:id/resolve with CONFIRM or VOID action", async () => {
    const mockConflictResponse = {
      status: "success",
      message: "Conflict resolved: transaction CONFIRMED",
      data: {
        id_transaction: "tx-conflict-01",
        status: "CONFIRMED",
        sync_status: "SYNCED",
      },
    }

    const requestSpy = vi.spyOn(httpClient, "requestJson").mockResolvedValue(mockConflictResponse)

    const result = await resolveConflict(sampleSession, "tx-conflict-01", {
      action: "CONFIRM",
      notes: "Physical goods already taken by customer",
    })

    expect(requestSpy).toHaveBeenCalledWith(
      "/api/v1/transactions/tx-conflict-01/resolve",
      expect.anything(),
      {
        method: "POST",
        body: JSON.stringify({
          action: "CONFIRM",
          notes: "Physical goods already taken by customer",
        }),
      },
      sampleSession.token,
    )
    expect(result.status).toBe("success")
  })

  it("createCorrection calls POST /api/v1/transactions/:id/correct with correction payload", async () => {
    const mockCorrectionResponse = {
      status: "success",
      message: "Correction created",
      data: {
        id_correction: "cor-01",
        id_old_transaction: "tx-old-01",
        id_new_transaction: "tx-new-01",
        corrected_by: "u-owner",
        reason: "Wrong item quantity entered by cashier",
        created_at: new Date().toISOString(),
      },
    }

    const requestSpy = vi.spyOn(httpClient, "requestJson").mockResolvedValue(mockCorrectionResponse)

    const result = await createCorrection(sampleSession, "tx-old-01", {
      reason: "Wrong item quantity entered by cashier",
      items: [
        {
          id_product: "p-1",
          quantity: 1,
          unit_price: 25000,
          subtotal: 25000,
        },
      ],
      subtotal: 25000,
      total: 25000,
    })

    expect(requestSpy).toHaveBeenCalledWith(
      "/api/v1/transactions/tx-old-01/correct",
      expect.anything(),
      {
        method: "POST",
        body: expect.stringContaining("Wrong item quantity entered by cashier"),
      },
      sampleSession.token,
    )
    expect(result.status).toBe("success")
  })

  it("propagates ApiError on backend error response", async () => {
    vi.spyOn(httpClient, "requestJson").mockRejectedValue(
      new httpClient.ApiError("Unauthorized", 401, false, "UNAUTHORIZED"),
    )

    await expect(fetchReconciliations(sampleSession)).rejects.toThrow("Unauthorized")
  })
})
