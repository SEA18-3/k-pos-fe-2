import { useLiveQuery } from "dexie-react-hooks"

import { database } from "@/infrastructure/persistence/database"

export function useCatalogProducts() {
  return useLiveQuery(() => database.products.toArray(), [], [])
}
