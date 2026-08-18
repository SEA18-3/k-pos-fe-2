import { v7 as uuidv7 } from "uuid"

import { useUiStore } from "@/app/ui-store"
import { refreshActiveCatalog } from "@/features/catalog/catalog-refresh"
import { probeBackend, sendTransactionBatch } from "@/infrastructure/api/api-client"
import { getOrCreateDeviceIdentity } from "@/infrastructure/persistence/device-repository"
import {
  getAuthSession,
  isOnlineSessionValid,
} from "@/infrastructure/persistence/session-repository"
import { writeSetting } from "@/infrastructure/persistence/settings-repository"

import { reconcileSyncStatuses } from "./reconcile"
import { createBrowserSyncScheduler } from "./browser-scheduler"
import { LocalSyncRepository } from "./local-sync-repository"
import { SyncService } from "./sync-service"

const clock = () => Date.now()
const random = () => Math.random()
const repository = new LocalSyncRepository(clock, random)

export const syncService = new SyncService({
  repository,
  transport: sendTransactionBatch,
  getSession: getAuthSession,
  getDevice: getOrCreateDeviceIdentity,
  isOnlineSessionValid,
  createBatchId: uuidv7,
  now: clock,
  canConnect: () => !useUiStore.getState().forcedOffline && navigator.onLine,
  onAuthenticationRequired: () => {
    void writeSetting("syncAuthRequired", new Date().toISOString())
  },
})

const scheduler = createBrowserSyncScheduler({
  probe: probeBackend,
  sync: async () => {
    const count = await syncService.run()
    const [session, device] = await Promise.all([getAuthSession(), getOrCreateDeviceIdentity()])
    if (session && device) {
      await reconcileSyncStatuses(session, device).catch(() => undefined)
    }
    return count
  },
  refreshCatalog: refreshActiveCatalog,
  forcedOffline: () => useUiStore.getState().forcedOffline,
  setConnection: (connection) => useUiStore.getState().setConnection(connection),
  random,
})

export const refreshConnectivity = scheduler.refreshConnectivity
export const startSyncScheduler = scheduler.start
