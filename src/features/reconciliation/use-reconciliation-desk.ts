import { useCallback, useEffect, useMemo, useState } from "react"
import type {
  BackendTransaction,
  CorrectionRecord,
  CreateCorrectionRequest,
  InventoryDiscrepancy,
  ResolveInventoryDiscrepancyRequest,
} from "@operator/contracts"
import { toast } from "sonner"

import { useCurrentSession } from "@/features/auth/session-queries"
import {
  createCorrection,
  fetchBackendTransactions,
  fetchCorrections,
  fetchInventoryDiscrepancies,
  resolveInventoryDiscrepancy,
} from "@/features/reconciliation/reconciliation-api"

export function useReconciliationDesk() {
  const session = useCurrentSession()
  const [transactions, setTransactions] = useState<BackendTransaction[]>([])
  const [corrections, setCorrections] = useState<CorrectionRecord[]>([])
  const [discrepancies, setDiscrepancies] = useState<InventoryDiscrepancy[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!session || session.operator.role !== "ADMIN") return
    setLoading(true)
    try {
      const [transactionData, correctionData, discrepancyData] = await Promise.all([
        fetchBackendTransactions(session, true),
        fetchCorrections(session),
        fetchInventoryDiscrepancies(session),
      ])
      setTransactions(transactionData.transactions)
      setCorrections(correctionData.corrections)
      setDiscrepancies(discrepancyData.discrepancies)
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

  async function resolve(id: string, resolution: ResolveInventoryDiscrepancyRequest) {
    if (!session) return false
    try {
      await resolveInventoryDiscrepancy(session, id, resolution)
      toast.success("Discrepancy diselesaikan")
      await refresh()
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Resolution gagal")
      return false
    }
  }

  return {
    transactions,
    corrections,
    discrepancies,
    openDiscrepancyCount: useMemo(
      () => discrepancies.filter((item) => item.status === "OPEN").length,
      [discrepancies],
    ),
    loading,
    refresh,
    correct,
    resolve,
  }
}
