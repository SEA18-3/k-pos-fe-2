import { bootstrapLocalData } from "@/features/auth/auth-api"
import { getOrCreateDeviceIdentity } from "@/infrastructure/persistence/device-repository"
import {
  getAuthSession,
  isOnlineSessionValid,
} from "@/infrastructure/persistence/session-repository"

export async function refreshActiveCatalog() {
  const session = await getAuthSession()
  if (!session || !isOnlineSessionValid(session)) return false
  const device = await getOrCreateDeviceIdentity()
  await bootstrapLocalData(session, device)
  return true
}
