import type { OutboxEntry, SyncStatus } from "@/infrastructure/persistence/models"
import type { SyncResult } from "@operator/contracts"

export const BATCH_SIZE = 25
const BASE_RETRY_MS = 1_000
const MAX_RETRY_MS = 5 * 60_000

export function calculateBackoffMs(retryCount: number, random = Math.random) {
  const exponential = Math.min(MAX_RETRY_MS, BASE_RETRY_MS * 2 ** Math.max(0, retryCount))
  return Math.round(exponential * (0.5 + random() * 0.5))
}

export function isOutboxEntryDue(entry: OutboxEntry, now: number) {
  return !entry.nextRetryAt || new Date(entry.nextRetryAt).getTime() <= now
}

export type ResultTransition = {
  outbox: "DELETE" | "PENDING" | "FAILED"
  syncStatus: SyncStatus
  settlementStatus?: "SETTLED"
  retryCount: number
  error?: string
  nextRetryAt?: string
  receivedAtBackend?: string
}

export function transitionForResult(
  result: SyncResult | undefined,
  currentRetryCount: number,
  now: number,
  random = Math.random,
): ResultTransition {
  if (result?.status === "ACCEPTED" || result?.status === "ALREADY_PROCESSED") {
    return {
      outbox: "DELETE",
      syncStatus: "SYNCED",
      settlementStatus: "SETTLED",
      retryCount: currentRetryCount,
      receivedAtBackend: result.receivedAtBackend ?? new Date(now).toISOString(),
    }
  }

  const retryCount = currentRetryCount + 1
  const error = result?.reason ?? (result ? "RETRYABLE_ERROR" : "MISSING_BATCH_RESULT")
  if (result?.status === "REJECTED_PERMANENT") {
    return { outbox: "FAILED", syncStatus: "FAILED", retryCount, error }
  }
  return {
    outbox: "PENDING",
    syncStatus: "FAILED",
    retryCount,
    error,
    nextRetryAt: new Date(now + calculateBackoffMs(retryCount, random)).toISOString(),
  }
}
