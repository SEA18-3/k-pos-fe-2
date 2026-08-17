import type { AuthSession } from "./models"
import { readSetting, removeSetting, writeSetting } from "./settings-repository"

const SESSION_KEY = "authSession"
export const OFFLINE_LEASE_MS = 72 * 60 * 60 * 1_000

export async function getAuthSession(): Promise<AuthSession | null> {
  const stored = await readSetting(SESSION_KEY)
  return stored ? (JSON.parse(stored) as AuthSession) : null
}

export async function saveAuthSession(session: AuthSession) {
  await writeSetting(SESSION_KEY, JSON.stringify(session))
}

export async function clearAuthSession() {
  await removeSetting(SESSION_KEY)
}

export function isOnlineSessionValid(session: AuthSession, now = Date.now()) {
  return new Date(session.expiresAt).getTime() > now
}

export function isOfflineCheckoutAllowed(session: AuthSession, now = Date.now()) {
  return new Date(session.offlineLeaseExpiresAt).getTime() > now
}

export function offlineLeaseExpiresAt(authenticatedAt = Date.now()) {
  return new Date(authenticatedAt + OFFLINE_LEASE_MS).toISOString()
}
