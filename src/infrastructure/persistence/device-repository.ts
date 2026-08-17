import { v7 as uuidv7 } from "uuid"

import type { DeviceIdentity } from "./models"
import { readSetting, writeSetting } from "./settings-repository"

const DEVICE_KEY = "deviceIdentity"

export async function getOrCreateDeviceIdentity(): Promise<DeviceIdentity> {
  const stored = await readSetting(DEVICE_KEY)
  if (stored) return JSON.parse(stored) as DeviceIdentity

  const identity: DeviceIdentity = {
    id: `DVC-${uuidv7()}`,
    name: `Counter ${Math.floor(10 + Math.random() * 89)}`,
    createdAt: new Date().toISOString(),
  }
  await saveDeviceIdentity(identity)
  return identity
}

export async function saveDeviceIdentity(identity: DeviceIdentity) {
  await writeSetting(DEVICE_KEY, JSON.stringify(identity))
}
