import { useCallback, useEffect, useMemo, useState } from "react"
import type {
  BackendTransaction,
  CorrectionRecord,
  CreateCorrectionRequest,
  InventoryDiscrepancy,
  ResolveConflictRequest,
} from "@/features/reconciliation/reconciliation-api"
import { toast } from "sonner"

import { useCurrentSession } from "@/features/auth/session-queries"
import {
  createCorrection,
  fetchBackendTransactions,
  resolveConflict,
} from "@/features/reconciliation/reconciliation-api"

export function useReconciliationDesk() {
  const session = useCurrentSession()
  const [transactions, setTransactions] = useState<BackendTransaction[]>([])
  const [corrections, setCorrections] = useState<CorrectionRecord[]>([])
  const [discrepancies, setDiscrepancies] = useState<InventoryDiscrepancy[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!session) return
    setLoading(true)
    try {
      // Ambil semua transaksi — frontend bisa filter di sisi client
      const transactionData = await fetchBackendTransactions(session, { limit: 100 })
      setTransactions(transactionData.data.data)
      // fetchCorrections & fetchInventoryDiscrepancies belum ada endpoint backend
      // TODO: Implementasikan saat endpoint tersedia
      setCorrections([])
      setDiscrepancies([])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memuat reconciliation desk")
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => void refresh(), [refresh])

  async function correct(transactionId: string, correction: CreateCorrectionRequest) {
    if (!session) return false
    try {
      await createCorrection(session, transactionId, correction)
      toast.success("Correction tercatat", { description: "Transaksi asli tidak diubah." })
      await refresh()
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Correction gagal")
      return false
    }
  }

  async function resolve(id: string, resolution: ResolveConflictRequest) {
    if (!session) return false
    try {
      await resolveConflict(session, id, resolution)
      toast.success("Konflik diselesaikan")
      await refresh()
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Resolution gagal")
      return false
    }
  }

  const conflictCount = useMemo(
    () => transactions.filter((t) => t.sync_status === "SYNC_CONFLICT").length,
    [transactions],
  )

  return {
    transactions,
    corrections,
    discrepancies,
    openDiscrepancyCount: conflictCount,
    loading,
    refresh,
    correct,
    resolve,
  }
}
