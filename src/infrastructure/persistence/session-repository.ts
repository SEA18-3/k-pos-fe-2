import type { AuthSession } from "./models"
import { readSetting, removeSetting, writeSetting } from "./settings-repository"

const SESSION_KEY = "authSession"
const CACHED_CREDENTIALS_KEY = "cachedCredentials"

export type CachedCredential = {
  email: string
  passwordHash: string
  salt: string
  session: AuthSession
  lastLoginAt: string
}

export async function hashPasswordWithSalt(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + ":" + salt)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

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

export async function saveCachedCredential(email: string, password: string, session: AuthSession) {
  const normalizedEmail = email.trim().toLowerCase()
  const salt = session.merchantId || "k-pos-salt"
  const passwordHash = await hashPasswordWithSalt(password, salt)
  const stored = await readSetting(CACHED_CREDENTIALS_KEY)
  const creds: Record<string, CachedCredential> = stored ? JSON.parse(stored) : {}
  creds[normalizedEmail] = {
    email: normalizedEmail,
    passwordHash,
    salt,
    session,
    lastLoginAt: new Date().toISOString(),
  }
  await writeSetting(CACHED_CREDENTIALS_KEY, JSON.stringify(creds))
}

export async function verifyAndRestoreCachedSession(
  email: string,
  password: string,
): Promise<AuthSession | null> {
  const normalizedEmail = email.trim().toLowerCase()
  const stored = await readSetting(CACHED_CREDENTIALS_KEY)
  if (!stored) return null
  const creds: Record<string, CachedCredential> = JSON.parse(stored)
  const userCred = creds[normalizedEmail]
  if (!userCred) return null

  const inputHash = await hashPasswordWithSalt(password, userCred.salt)
  if (inputHash !== userCred.passwordHash) {
    return null
  }

  // Restore current active session
  await saveAuthSession(userCred.session)
  return userCred.session
}

export function isOnlineSessionValid(session: AuthSession, now = Date.now()) {
  return new Date(session.expiresAt).getTime() > now
}

/**
 * Offline checkout is always allowed as long as a valid local session exists (unlimited offline duration).
 */
export function isOfflineCheckoutAllowed(session: AuthSession | null | undefined): boolean {
  return Boolean(session && session.operator && session.merchantId)
}
