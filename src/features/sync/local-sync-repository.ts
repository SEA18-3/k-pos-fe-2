import type { SyncResult } from "@/infrastructure/api/api-client"

import { database } from "@/infrastructure/persistence/database"
import type {
  LocalTransaction,
  OutboxEntry,
  SyncAttempt,
} from "@/infrastructure/persistence/models"

import {
  BATCH_SIZE,
  calculateBackoffMs,
  isOutboxEntryDue,
  transitionForResult,
} from "./sync-policy"

export type SyncBatch = {
  entries: OutboxEntry[]
  transactions: LocalTransaction[]
}

export class LocalSyncRepository {
  constructor(
    private readonly now: () => number,
    private readonly random: () => number,
  ) {}

  async loadDueBatch(includeFailed = false): Promise<SyncBatch> {
    const statuses: OutboxEntry["status"][] = includeFailed ? ["PENDING", "FAILED"] : ["PENDING"]
    const candidates = await database.outbox
      .where("status")
      .anyOf(statuses)
      .filter((entry) => isOutboxEntryDue(entry, this.now()))
      .sortBy("createdAt")
    const entries = candidates.slice(0, BATCH_SIZE)
    const loaded = await database.transactions.bulkGet(entries.map((entry) => entry.transactionId))
    const transactionById = new Map(
      loaded.flatMap((transaction) => (transaction ? [[transaction.id, transaction]] : [])),
    )
    const missing = entries.filter((entry) => !transactionById.has(entry.transactionId))
    if (missing.length > 0) {
      await database.outbox.bulkDelete(missing.map((entry) => entry.id))
    }
    const validEntries = entries.filter((entry) => transactionById.has(entry.transactionId))
    return {
      entries: validEntries,
      transactions: validEntries.map((entry) => transactionById.get(entry.transactionId)!),
    }
  }

  async markSyncing(batch: SyncBatch) {
    const attemptedAt = new Date(this.now()).toISOString()
    await database.transaction("rw", [database.transactions, database.outbox], async () => {
      await Promise.all(
        batch.entries.flatMap((entry) => [
          database.transactions.update(entry.transactionId, {
            syncStatus: "SYNCING",
            lastSyncError: undefined,
          }),
          database.outbox.update(entry.id, {
            status: "SYNCING",
            lastAttemptAt: attemptedAt,
            lastError: undefined,
          }),
        ]),
      )
    })
  }

  async applyResults(batch: SyncBatch, results: SyncResult[], startedAt: number) {
    const resultById = new Map(results.map((result) => [result.transactionId, result]))
    const transactionById = new Map(
      batch.transactions.map((transaction) => [transaction.id, transaction]),
    )
    let synced = 0
    await database.transaction(
      "rw",
      [database.transactions, database.outbox, database.syncAttempts, database.settings],
      async () => {
        for (const entry of batch.entries) {
          const transaction = transactionById.get(entry.transactionId)!
          const result = resultById.get(entry.transactionId)
          const transition = transitionForResult(result, entry.retryCount, this.now(), this.random)
          if (result) {
            const attempt: Omit<SyncAttempt, "id"> = {
              transactionId: transaction.id,
              invoiceNumber: transaction.invoiceNumber,
              result: result.status,
              createdAt: new Date(this.now()).toISOString(),
              durationMs: Math.round(this.now() - startedAt),
            }
            await database.syncAttempts.add(attempt)
          }
          await database.transactions.update(entry.transactionId, {
            syncStatus: transition.syncStatus,
            settlementStatus: transition.settlementStatus,
            receivedAtBackend: transition.receivedAtBackend,
            retryCount: transition.retryCount,
            lastSyncError: transition.error,
          })
          if (transition.outbox === "DELETE") {
            await database.outbox.delete(entry.id)
            synced += 1
          } else {
            await database.outbox.update(entry.id, {
              status: transition.outbox,
              retryCount: transition.retryCount,
              lastError: transition.error,
              nextRetryAt: transition.nextRetryAt,
            })
          }
        }
        if (synced > 0) {
          await database.settings.put({
            key: "lastSyncAt",
            value: new Date(this.now()).toISOString(),
          })
        }
      },
    )
    return synced
  }

  async applyTransportFailure(batch: SyncBatch, message: string, retryable: boolean) {
    await database.transaction("rw", [database.transactions, database.outbox], async () => {
      for (const entry of batch.entries) {
        const retryCount = retryable ? entry.retryCount + 1 : entry.retryCount
        await database.transactions.update(entry.transactionId, {
          syncStatus: "FAILED",
          retryCount,
          lastSyncError: message,
        })
        await database.outbox.update(entry.id, {
          status: retryable ? "PENDING" : "FAILED",
          retryCount,
          lastError: message,
          nextRetryAt: retryable
            ? new Date(this.now() + calculateBackoffMs(retryCount, this.random)).toISOString()
            : undefined,
        })
      }
    })
  }

  async requestRetry(transactionId: string) {
    const entry = await database.outbox.where("transactionId").equals(transactionId).first()
    if (!entry) return
    await database.outbox.update(entry.id, {
      status: "PENDING",
      lastError: undefined,
      nextRetryAt: undefined,
    })
  }
}
