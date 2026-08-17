import { useLiveQuery } from "dexie-react-hooks"

import { getOrCreateDeviceIdentity } from "@/infrastructure/persistence/device-repository"
import { database } from "@/infrastructure/persistence/database"
import { getAuthSession } from "@/infrastructure/persistence/session-repository"

export function useCurrentSession() {
  return useLiveQuery(async () => {
    await database.settings.get("authSession")
    return getAuthSession()
  }, [])
}

export function useDeviceIdentity() {
  return useLiveQuery(() => getOrCreateDeviceIdentity(), [])
}

export function useMerchantProfile() {
  return useLiveQuery(async () => {
    const stored = await database.settings.get("merchantProfile")
    return stored ? (JSON.parse(stored.value) as { id: string; name: string }) : null
  }, [])
}
