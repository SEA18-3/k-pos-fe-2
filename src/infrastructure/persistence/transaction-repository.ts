import type { LocalTransaction } from "./models"
import { database } from "./database"

export async function commitLocalSale(transaction: LocalTransaction) {
  await database.transaction(
    "rw",
    [database.transactions, database.outbox, database.products, database.drafts],
    async () => {
      const products = await database.products.bulkGet(
        transaction.items.map((item) => item.productId),
      )
      const productById = new Map(
        products.flatMap((product) => (product ? [[product.id, product]] : [])),
      )

      for (const item of transaction.items) {
        const product = productById.get(item.productId)
        if (!product) throw new Error(`Produk ${item.productId} tidak tersedia di katalog lokal`)
      }

      await database.transactions.add(transaction)
      await database.outbox.add({
        id: `outbox-${transaction.id}`,
        transactionId: transaction.id,
        operation: "UPSERT_TRANSACTION",
        payloadVersion: 1,
        status: "PENDING",
        retryCount: 0,
        createdAt: transaction.createdAt,
      })
      await Promise.all(
        transaction.items.map((item) => {
          const product = productById.get(item.productId)!
          return database.products.update(item.productId, {
            stock: product.stock - item.quantity,
          })
        }),
      )
      await database.drafts.delete("active")
    },
  )
  return transaction
}

export async function voidProvisionalTransaction(transactionId: string) {
  return database.transaction(
    "rw",
    [database.transactions, database.products, database.outbox],
    async () => {
      const transaction = await database.transactions.get(transactionId)
      if (!transaction) throw new Error("Transaksi tidak ditemukan")
      if (transaction.syncStatus === "SYNCED" || transaction.syncStatus === "SYNC_CONFLICT") {
        throw new Error("Transaksi yang sudah sinkron bersifat immutable")
      }
      if (transaction.transactionStatus === "VOIDED") return transaction

      const products = await database.products.bulkGet(
        transaction.items.map((item) => item.productId),
      )
      await Promise.all(
        transaction.items.map((item, index) => {
          const product = products[index]
          return product
            ? database.products.update(item.productId, { stock: product.stock + item.quantity })
            : Promise.resolve(0)
        }),
      )
      await database.transactions.update(transactionId, {
        transactionStatus: "VOIDED",
        syncStatus: "PENDING_SYNC",
        lastSyncError: undefined,
      })
      const entry = await database.outbox.where("transactionId").equals(transactionId).first()
      if (entry) {
        await database.outbox.update(entry.id, {
          status: "PENDING",
          nextRetryAt: undefined,
          lastError: undefined,
        })
      }
      return { ...transaction, transactionStatus: "VOIDED" as const }
    },
  )
}
