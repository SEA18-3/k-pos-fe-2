import type { OutboxEntry } from "@/infrastructure/persistence/models"

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
