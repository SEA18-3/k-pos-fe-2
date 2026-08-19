import { useLiveQuery } from "dexie-react-hooks"

import { database } from "@/infrastructure/persistence/database"

export function useLocalTransactions() {
  return useLiveQuery(() => database.transactions.orderBy("createdAt").reverse().toArray(), [], [])
}

export function useLocalTransaction(id?: string | null) {
  return useLiveQuery(() => (id ? database.transactions.get(id) : undefined), [id])
}

import { useState, useEffect } from "react"
import { fetchServerTransactions } from "./transaction-api"
import type { AuthSession } from "@/infrastructure/persistence/models"

export function useServerTransactions(session: AuthSession | null, enabled: boolean) {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchServerTransactions>> | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!enabled || !session) {
      console.log("[useServerTransactions] skipped - enabled:", enabled, "session:", !!session)
      return
    }
    console.log("[useServerTransactions] fetching...")
    setIsLoading(true)
    setError(null)
    fetchServerTransactions(session)
      .then((result) => {
        console.log("[useServerTransactions] got", result.length, "transactions", result)
        setData(result)
      })
      .catch((err) => {
        console.error("[useServerTransactions] error:", err)
        setError(err)
      })
      .finally(() => setIsLoading(false))
  }, [enabled, session])

  return { data, isLoading, error }
}
