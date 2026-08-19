import { v7 as uuidv7 } from "uuid"

import { draftPersistence } from "@/infrastructure/persistence/draft-repository"
import { getOrCreateDeviceIdentity } from "@/infrastructure/persistence/device-repository"
import type { LocalTransaction } from "@/infrastructure/persistence/models"
import {
  getAuthSession,
  isOfflineCheckoutAllowed,
} from "@/infrastructure/persistence/session-repository"
import { readSetting } from "@/infrastructure/persistence/settings-repository"
import { commitLocalSale } from "@/infrastructure/persistence/transaction-repository"

import { buildLocalTransaction, type ConfirmSaleInput } from "./transaction-builder"

export type { ConfirmSaleInput } from "./transaction-builder"

export async function confirmSale(input: ConfirmSaleInput): Promise<LocalTransaction> {
  const [session, device, lastBootstrapAt] = await Promise.all([
    getAuthSession(),
    getOrCreateDeviceIdentity(),
    readSetting("lastBootstrapAt"),
  ])
  if (!session) throw new Error("Session operator tidak tersedia")
  if (!isOfflineCheckoutAllowed(session)) {
    throw new Error("Lease checkout offline sudah berakhir. Hubungkan internet dan login kembali.")
  }
  if (input.items.length === 0) throw new Error("Keranjang masih kosong")

  const createdAt = new Date().toISOString()
  const transaction: LocalTransaction = buildLocalTransaction(input, {
    transactionId: uuidv7(),
    createdAt,
    merchantId: session.merchantId,
    deviceId: device.id,
    operatorId: session.operator.id,
    operatorName: session.operator.name,
    lastBootstrapAt: lastBootstrapAt ?? undefined,
  })

  await draftPersistence.flush()
  return commitLocalSale(transaction)
}
