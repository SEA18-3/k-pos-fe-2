import { useLiveQuery } from "dexie-react-hooks"

import { database } from "@/infrastructure/persistence/database"
import { getOrCreateDeviceIdentity } from "@/infrastructure/persistence/device-repository"

export function useSyncSnapshot() {
  const outbox = useLiveQuery(() => database.outbox.orderBy("createdAt").toArray(), [], [])
  const transactions = useLiveQuery(() => database.transactions.toArray(), [], [])
  const attempts = useLiveQuery(
    () => database.syncAttempts.orderBy("createdAt").reverse().limit(8).toArray(),
    [],
    [],
  )
  const lastSync = useLiveQuery(() => database.settings.get("lastSyncAt"), [])
  const device = useLiveQuery(() => getOrCreateDeviceIdentity(), [])
  return { attempts, device, lastSync, outbox, transactions }
}

export function useSyncOverview() {
  const pendingCount = useLiveQuery(() => database.outbox.count(), [], 0)
  const lastSyncAt = useLiveQuery(() => database.settings.get("lastSyncAt"), [])
  return { lastSyncAt, pendingCount }
}
