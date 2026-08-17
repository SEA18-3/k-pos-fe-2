import { useLiveQuery } from "dexie-react-hooks"

import { database } from "@/infrastructure/persistence/database"

export function useLocalTransactions() {
  return useLiveQuery(() => database.transactions.orderBy("createdAt").reverse().toArray(), [], [])
}

export function useLocalTransaction(id?: string | null) {
  return useLiveQuery(() => (id ? database.transactions.get(id) : undefined), [id])
}
