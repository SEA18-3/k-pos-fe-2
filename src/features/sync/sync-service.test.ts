import { beforeEach, describe, expect, it, vi } from "vitest"

import { LocalSyncRepository } from "./local-sync-repository"
import { SyncService, type SyncTransport } from "./sync-service"
import { ApiError } from "@/infrastructure/api/http-client"
import { database } from "@/infrastructure/persistence/database"
import type {
  AuthSession,
  DeviceIdentity,
  LocalTransaction,
} from "@/infrastructure/persistence/models"

const sampleSession: AuthSession = {
  token: "valid-token-123",
  refreshToken: "refresh-123",
  merchantId: "M-TEST",
  operator: { id: "u-1", name: "Operator Test", role: "OPERATOR" },
  expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
}

const sampleDevice: DeviceIdentity = {
  id: "device-test-99",
  name: "Device POS 99",
  createdAt: "2026-08-18T00:00:00Z",
}

const sampleTx: LocalTransaction = {
  id: "tx-sync-001",
  merchantId: "M-TEST",
  deviceId: "device-test-99",
  invoiceNumber: "INV-20260818-001",
  offlineUuid: "11111111-1111-4111-8111-111111111111",
  subtotal: 50000,
  discount: 0,
  total: 50000,
  paymentMethod: "CASH",
  paymentVerificationType: "SYSTEM_VERIFIABLE",
  transactionStatus: "CONFIRMED",
  syncStatus: "PENDING_SYNC",
  operatorId: "u-1",
  operatorName: "Operator Test",
  createdAt: new Date().toISOString(),
  retryCount: 0,
  items: [
    {
      productId: "prod-1",
      name: "Americano",
      quantity: 2,
      unitPrice: 25000,
      subtotal: 50000,
    },
  ],
}

describe("SyncService State Machine Integration", () => {
  let repository: LocalSyncRepository

  beforeEach(async () => {
    await database.delete()
    await database.open()

    repository = new LocalSyncRepository(
      () => Date.now(),
      () => 0.5,
    )
  })

  it("skips synchronization when offline (canConnect is false)", async () => {
    const transport = vi.fn()
    const onAuthRequired = vi.fn()

    const service = new SyncService({
      repository,
      transport,
      getSession: async () => sampleSession,
      getDevice: async () => sampleDevice,
      isOnlineSessionValid: () => true,
      createBatchId: () => "batch-1",
      now: () => Date.now(),
      canConnect: () => false, // OFFLINE
      onAuthenticationRequired: onAuthRequired,
    })

    const syncedCount = await service.run()
    expect(syncedCount).toBe(0)
    expect(transport).not.toHaveBeenCalled()
    expect(onAuthRequired).not.toHaveBeenCalled()
  })

  it("successfully syncs pending transactions and updates state upon server ACK", async () => {
    // 1. Seed database with 1 pending transaction and 1 outbox entry
    await database.transactions.add(sampleTx)
    await database.outbox.add({
      id: "outbox-tx-sync-001",
      transactionId: sampleTx.id,
      operation: "UPSERT_TRANSACTION",
      payloadVersion: 1,
      status: "PENDING",
      retryCount: 0,
      createdAt: sampleTx.createdAt,
    })

    const queuedAt = new Date().toISOString()
    const transport: SyncTransport = vi.fn().mockResolvedValue({
      accepted: 1,
      queued_at: queuedAt,
      queuedAt,
    })
    const onAuthRequired = vi.fn()

    const service = new SyncService({
      repository,
      transport,
      getSession: async () => sampleSession,
      getDevice: async () => sampleDevice,
      isOnlineSessionValid: () => true,
      createBatchId: () => "batch-001",
      now: () => Date.now(),
      canConnect: () => true,
      onAuthenticationRequired: onAuthRequired,
    })

    // 2. Run sync
    const syncedCount = await service.run()
    expect(syncedCount).toBe(1)
    expect(transport).toHaveBeenCalledTimes(1)

    // 3. Verify transaction status in IndexedDB
    const updatedTx = await database.transactions.get(sampleTx.id)
    expect(updatedTx?.syncStatus).toBe("SYNCING")
    expect(updatedTx?.receivedAtBackend).toBe(queuedAt)
  })

  it("handles network/server failure by marking outbox entry and updating sync error", async () => {
    // 1. Seed pending transaction
    await database.transactions.add(sampleTx)
    await database.outbox.add({
      id: "outbox-tx-sync-001",
      transactionId: sampleTx.id,
      operation: "UPSERT_TRANSACTION",
      payloadVersion: 1,
      status: "PENDING",
      retryCount: 0,
      createdAt: sampleTx.createdAt,
    })

    const transport: SyncTransport = vi.fn().mockRejectedValue(new Error("Network connection reset"))
    const onAuthRequired = vi.fn()

    const service = new SyncService({
      repository,
      transport,
      getSession: async () => sampleSession,
      getDevice: async () => sampleDevice,
      isOnlineSessionValid: () => true,
      createBatchId: () => "batch-001",
      now: () => 1000000,
      canConnect: () => true,
      onAuthenticationRequired: onAuthRequired,
    })

    // 2. Run sync
    const syncedCount = await service.run()
    expect(syncedCount).toBe(0)

    // 3. Verify outbox entry was updated with error and next retry timestamp
    const outboxEntry = await database.outbox.where("transactionId").equals(sampleTx.id).first()
    expect(outboxEntry?.status).toBe("PENDING") // retryable stays PENDING for scheduler
    expect(outboxEntry?.retryCount).toBe(1)
    expect(outboxEntry?.lastError).toContain("Network connection reset")
    expect(outboxEntry?.nextRetryAt).toBeDefined()

    // 4. Verify transaction status
    const updatedTx = await database.transactions.get(sampleTx.id)
    expect(updatedTx?.syncStatus).toBe("SYNC_FAILED")
    expect(updatedTx?.lastSyncError).toContain("Network connection reset")
  })

  it("triggers onAuthenticationRequired when transport returns 401 Unauthorized", async () => {
    await database.transactions.add(sampleTx)
    await database.outbox.add({
      id: "outbox-tx-sync-001",
      transactionId: sampleTx.id,
      operation: "UPSERT_TRANSACTION",
      payloadVersion: 1,
      status: "PENDING",
      retryCount: 0,
      createdAt: sampleTx.createdAt,
    })

    const transport: SyncTransport = vi.fn().mockRejectedValue(
      new ApiError("Token expired or revoked", 401, false, "UNAUTHORIZED", "req-123"),
    )
    const onAuthRequired = vi.fn()

    const service = new SyncService({
      repository,
      transport,
      getSession: async () => sampleSession,
      getDevice: async () => sampleDevice,
      isOnlineSessionValid: () => true,
      createBatchId: () => "batch-001",
      now: () => Date.now(),
      canConnect: () => true,
      onAuthenticationRequired: onAuthRequired,
    })

    const syncedCount = await service.run()
    expect(syncedCount).toBe(0)
    expect(onAuthRequired).toHaveBeenCalledTimes(1)
  })
})
