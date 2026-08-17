import {
  bootstrapResponseSchema,
  loginResponseSchema,
  logoutResponseSchema,
  registerDeviceResponseSchema,
} from "@operator/contracts"

import { requestJson } from "@/infrastructure/api/http-client"
import { replaceCatalog } from "@/infrastructure/persistence/catalog-repository"
import { saveDeviceIdentity } from "@/infrastructure/persistence/device-repository"
import type { AuthSession, DeviceIdentity, Product } from "@/infrastructure/persistence/models"
import { saveAuthSession } from "@/infrastructure/persistence/session-repository"
import { writeSetting } from "@/infrastructure/persistence/settings-repository"

export async function activateAndLogin(input: {
  merchantCode: string
  operatorCode: string
  pin: string
  activationCode: string
  device: DeviceIdentity
}): Promise<AuthSession> {
  await requestJson("/v1/devices/register", registerDeviceResponseSchema, {
    method: "POST",
    body: JSON.stringify({
      merchantCode: input.merchantCode,
      activationCode: input.activationCode,
      deviceId: input.device.id,
      deviceName: input.device.name,
    }),
  })
  const result = await requestJson("/v1/auth/login", loginResponseSchema, {
    method: "POST",
    body: JSON.stringify({
      merchantCode: input.merchantCode,
      operatorCode: input.operatorCode,
      pin: input.pin,
      deviceId: input.device.id,
    }),
  })
  const session: AuthSession = {
    token: result.token,
    merchantId: result.merchantId,
    operator: result.operator,
    expiresAt: new Date(Date.now() + result.expiresInSeconds * 1_000).toISOString(),
    offlineLeaseExpiresAt: result.offlineLeaseExpiresAt,
  }
  await saveAuthSession(session)
  await saveDeviceIdentity({ ...input.device, registeredAt: new Date().toISOString() })
  return session
}

export async function bootstrapLocalData(session: AuthSession, device: DeviceIdentity) {
  const result = await requestJson(
    `/v1/bootstrap?deviceId=${encodeURIComponent(device.id)}`,
    bootstrapResponseSchema,
    {},
    session.token,
  )
  const products: Product[] = result.products
  await replaceCatalog(products)
  await writeSetting("merchantProfile", JSON.stringify(result.merchant))
  return products
}

export async function logoutOnline(session: AuthSession) {
  return requestJson("/v1/auth/logout", logoutResponseSchema, { method: "POST" }, session.token)
}
