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
  fetchReconciliations,
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
      const [transactionData, reconciliationData] = await Promise.all([
        fetchBackendTransactions(session, { limit: 100 }),
        fetchReconciliations(session).catch(() => ({ data: [] })),
      ])
      setTransactions(transactionData.data.data)
      const mappedCorrections: CorrectionRecord[] = (reconciliationData.data || []).map((rec) => ({
        id_correction: rec.id_reconciliation,
        id_old_transaction: rec.payment?.transaction?.id_transaction ?? rec.id_payment,
        id_new_transaction: rec.status,
        corrected_by: rec.resolvedByUser?.full_name ?? rec.openedByUser?.full_name ?? rec.opened_by,
        reason: `${rec.reason}${rec.resolution_note ? ` — Catatan: ${rec.resolution_note}` : ""}`,
        created_at: rec.created_at,
      }))
      setCorrections(mappedCorrections)
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
