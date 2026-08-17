import type { Product } from "./models"
import { database } from "./database"
import { writeSetting } from "./settings-repository"

export async function replaceCatalog(products: Product[], refreshedAt = new Date().toISOString()) {
  await database.transaction("rw", [database.products, database.settings], async () => {
    await database.products.clear()
    await database.products.bulkPut(products)
    await writeSetting("lastBootstrapAt", refreshedAt)
  })
}

export async function listProducts() {
  return database.products.toArray()
}
