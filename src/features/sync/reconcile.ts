import type { AuthSession, DeviceIdentity, SyncStatus } from "@/infrastructure/persistence/models"

import { database } from "@/infrastructure/persistence/database"

import { fetchTransactions } from "./transaction-api"

const RESOLVED_STATUSES = "SYNCED,SYNC_FAILED,SYNC_CONFLICT"
const PAGE_LIMIT = 100

function mapServerStatus(server: string): SyncStatus | null {
  if (server === "SYNCED") return "SYNCED"
  if (server === "SYNC_FAILED") return "SYNC_FAILED"
  if (server === "SYNC_CONFLICT") return "SYNC_CONFLICT"
  return null
}

export async function reconcileSyncStatuses(
  session: AuthSession,
  device: DeviceIdentity,
): Promise<number> {
  const localPending = await database.transactions
    .where("syncStatus")
    .anyOf(["PENDING_SYNC", "SYNCING"])
    .toArray()
  if (localPending.length === 0) return 0

  const byOfflineUuid = new Map(localPending.map((transaction) => [transaction.offlineUuid, transaction]))
  const resolved = new Map<string, string>()
  let cursor: string | null = null
  for (;;) {
    const page = await fetchTransactions(session.token, {
      id_device: device.id,
      sync_status: RESOLVED_STATUSES,
      cursor,
      limit: PAGE_LIMIT,
    })
    for (const item of page.items) {
      if (byOfflineUuid.has(item.offline_uuid)) resolved.set(item.offline_uuid, item.sync_status)
    }
    if (!page.nextCursor) break
    cursor = page.nextCursor
  }

  let updated = 0
  await database.transaction("rw", [database.transactions, database.outbox], async () => {
    for (const [offlineUuid, serverStatus] of resolved) {
      const localStatus = mapServerStatus(serverStatus)
      if (!localStatus) continue
      const transaction = byOfflineUuid.get(offlineUuid)!
      await database.transactions.update(transaction.id, { syncStatus: localStatus })
      const entry = await database.outbox.where("transactionId").equals(transaction.id).first()
      if (entry) {
        if (localStatus === "SYNCED") await database.outbox.delete(entry.id)
        else await database.outbox.update(entry.id, { status: "FAILED" })
      }
      updated += 1
    }
  })
  return updated
}
