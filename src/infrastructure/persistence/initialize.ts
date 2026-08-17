import { database } from "./database"
import { demoProducts } from "./demo-fixtures"
import { getOrCreateDeviceIdentity } from "./device-repository"

const demoMode = import.meta.env.VITE_DEMO_MODE === "true"

export async function initializeLocalPersistence() {
  await database.open()
  const device = await getOrCreateDeviceIdentity()
  if (demoMode && (await database.products.count()) === 0) {
    await database.products.bulkAdd(demoProducts)
  }
  await recoverAbandonedSyncRecords()
  return device
}

async function recoverAbandonedSyncRecords() {
  const abandoned = await database.outbox.where("status").equals("SYNCING").toArray()
  if (abandoned.length === 0) return
  await database.transaction("rw", [database.outbox, database.transactions], async () => {
    await Promise.all(
      abandoned.flatMap((entry) => [
        database.outbox.update(entry.id, { status: "PENDING" }),
        database.transactions.update(entry.transactionId, { syncStatus: "LOCAL_ONLY" }),
      ]),
    )
  })
}
