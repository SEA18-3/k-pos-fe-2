import { useLiveQuery } from "dexie-react-hooks"

import { database } from "@/infrastructure/persistence/database"

export function useLocalTransactions() {
  return useLiveQuery(() => database.transactions.orderBy("createdAt").reverse().toArray(), [], [])
}

export function useLocalTransaction(id?: string | null) {
  return useLiveQuery(() => (id ? database.transactions.get(id) : undefined), [id])
}

import { useState, useEffect } from "react"
import { fetchServerTransactions, fetchTransactionHistory } from "./transaction-api"
import type { AuthSession } from "@/infrastructure/persistence/models"

export function useServerTransactions(session: AuthSession | null, enabled: boolean) {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchServerTransactions>> | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [tick, setTick] = useState(0)

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
  }, [enabled, session, tick])

  return { data, isLoading, error, refetch: () => setTick(t => t + 1) }
}

export function useTransactionHistory(session: AuthSession | null, id: string | null) {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchTransactionHistory>> | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!id || !session) return
    setIsLoading(true)
    setError(null)
    fetchTransactionHistory(session, id)
      .then(setData)
      .catch(setError)
      .finally(() => setIsLoading(false))
  }, [id, session])

  return { data, isLoading, error }
}

