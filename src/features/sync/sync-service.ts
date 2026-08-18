import type {
  AuthSession,
  DeviceIdentity,
  LocalTransaction,
} from "@/infrastructure/persistence/models"

import { ApiError, type BackendSyncAck } from "@/infrastructure/api/api-client"

import type { LocalSyncRepository } from "./local-sync-repository"
import { BATCH_SIZE } from "./sync-policy"

export type SyncTransport = (
  session: AuthSession,
  device: DeviceIdentity,
  batchId: string,
  transactions: LocalTransaction[],
) => Promise<BackendSyncAck>

type SyncDependencies = {
  repository: LocalSyncRepository
  transport: SyncTransport
  getSession: () => Promise<AuthSession | null>
  getDevice: () => Promise<DeviceIdentity>
  isOnlineSessionValid: (session: AuthSession) => boolean
  createBatchId: () => string
  now: () => number
  canConnect: () => boolean
  onAuthenticationRequired: () => void
}

export class SyncService {
  private active: Promise<number> | null = null

  constructor(private readonly dependencies: SyncDependencies) {}

  run(options: { includeFailed?: boolean } = {}) {
    if (this.active) return this.active
    this.active = this.process(options).finally(() => {
      this.active = null
    })
    return this.active
  }

  async retry(transactionId: string) {
    await this.dependencies.repository.requestRetry(transactionId)
    return this.run({ includeFailed: true })
  }

  private async process({ includeFailed = false }: { includeFailed?: boolean }) {
    if (!this.dependencies.canConnect()) return 0
    const [session, device] = await Promise.all([
      this.dependencies.getSession(),
      this.dependencies.getDevice(),
    ])
    if (!session || !this.dependencies.isOnlineSessionValid(session)) {
      this.dependencies.onAuthenticationRequired()
      return 0
    }

    let totalSynced = 0
    let includeManualFailures = includeFailed
    for (;;) {
      const batch = await this.dependencies.repository.loadDueBatch(includeManualFailures)
      includeManualFailures = false
      if (batch.entries.length === 0) break
      await this.dependencies.repository.markSyncing(batch)
      const startedAt = this.dependencies.now()
      try {
        const ack = await this.dependencies.transport(
          session,
          device,
          this.dependencies.createBatchId(),
          batch.transactions,
        )
        totalSynced += await this.dependencies.repository.applyAck(batch, ack, startedAt)
      } catch (error) {
        const apiError = error instanceof ApiError ? error : null
        const authenticationError = apiError?.status === 401 || apiError?.status === 403
        await this.dependencies.repository.applyTransportFailure(
          batch,
          error instanceof Error ? error.message : "Unknown sync error",
          !authenticationError && (!apiError || apiError.retryable),
        )
        if (authenticationError) this.dependencies.onAuthenticationRequired()
        break
      }
      if (batch.entries.length < BATCH_SIZE) break
    }
    return totalSynced
  }
}
