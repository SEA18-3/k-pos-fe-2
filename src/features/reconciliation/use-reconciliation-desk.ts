import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { useCurrentSession } from "@/features/auth/session-queries"
import {
  fetchReconciliations,
  resolveReconciliation,
  type ReconciliationRecord,
} from "@/features/reconciliation/reconciliation-api"

export function useReconciliationDesk() {
  const session = useCurrentSession()
  const [reconciliations, setReconciliations] = useState<ReconciliationRecord[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!session) return
    setLoading(true)
    try {
      const res = await fetchReconciliations(session)
      setReconciliations(res.data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memuat reconciliation desk")
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function resolve(
    id_reconciliation: string,
    status: "RESOLVED_VALID" | "RESOLVED_INVALID",
    resolution: string,
  ) {
    if (!session) return
    try {
      await resolveReconciliation(session, id_reconciliation, { status, resolution })
      toast.success("Kasus berhasil diselesaikan")
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyelesaikan kasus")
      throw error
    }
  }

  return {
    reconciliations,
    loading,
    refresh,
    resolve,
  }
}
