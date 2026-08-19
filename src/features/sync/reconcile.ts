import type { AuthSession, DeviceIdentity, SyncStatus } from "@/infrastructure/persistence/models"

import { database } from "@/infrastructure/persistence/database"

import { fetchSyncStatus } from "@/infrastructure/api/api-client"

function mapServerStatus(server: string): SyncStatus | null {
  if (server === "SYNCED") return "SYNCED"
  if (server === "FAILED") return "SYNC_FAILED"
  if (server === "CONFLICT") return "SYNC_CONFLICT"
  return null
}

export async function reconcileSyncStatuses(
  session: AuthSession,
  _device: DeviceIdentity,
): Promise<number> {
  const localPending = await database.transactions
    .where("syncStatus")
    .anyOf(["PENDING_SYNC", "SYNCING"])
    .toArray()
  if (localPending.length === 0) return 0

  const byOfflineUuid = new Map(localPending.map((transaction) => [transaction.offlineUuid, transaction]))
  const offlineUuids = Array.from(byOfflineUuid.keys())
  
  // Chunk requests to avoid too long URLs (e.g. max 50 uuids per request)
  const chunkSize = 50
  const resolved = new Map<string, string>()
  
  for (let i = 0; i < offlineUuids.length; i += chunkSize) {
    const chunk = offlineUuids.slice(i, i + chunkSize)
    try {
      const statuses = await fetchSyncStatus({ token: session.token }, chunk)
      for (const item of statuses) {
        if (item.status !== "PENDING") {
          resolved.set(item.offline_uuid, item.status)
        }
      }
    } catch (error) {
      console.warn("Failed to fetch sync status chunk", error)
    }
  }

  let updated = 0
  await database.transaction("rw", [database.transactions, database.outbox], async () => {
    for (const [offlineUuid, serverStatus] of resolved) {
      const transaction = byOfflineUuid.get(offlineUuid)
      if (!transaction) continue
      const entry = await database.outbox.where("transactionId").equals(transaction.id).first()

      if (serverStatus === "UNKNOWN") {
        // Server never received this transaction (e.g. earlier network rejection).
        // Reset stuck SYNCING state back to PENDING so sync-service will re-dispatch it.
        if (transaction.syncStatus === "SYNCING") {
          await database.transactions.update(transaction.id, { syncStatus: "PENDING_SYNC" })
        }
        if (entry && entry.status === "SYNCING") {
          await database.outbox.update(entry.id, { status: "PENDING", nextRetryAt: undefined })
        }
        continue
      }

      const localStatus = mapServerStatus(serverStatus)
      if (!localStatus) continue
      await database.transactions.update(transaction.id, { syncStatus: localStatus })
      if (entry) {
        if (localStatus === "SYNCED") await database.outbox.delete(entry.id)
        else await database.outbox.update(entry.id, { status: "FAILED" })
      }
      updated += 1
    }
  })
  return updated
}
