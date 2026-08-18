import { useState } from "react"
import type { ReconciliationRecord } from "@/features/reconciliation/reconciliation-api"
import { IconRefresh } from "@tabler/icons-react"

import { ResolutionDialog } from "@/features/reconciliation/reconciliation-dialogs"
import {
  PaymentRiskPanel,
  ReconciliationMetrics,
} from "@/features/reconciliation/reconciliation-panels"
import { useReconciliationDesk } from "@/features/reconciliation/use-reconciliation-desk"
import { Button } from "@/shared/ui/components/button"
import { PageHeader } from "@/shared/ui/page-header"

export function ReconciliationPage() {
  const data = useReconciliationDesk()
  const [conflictTx, setConflictTx] = useState<ReconciliationRecord | null>(null)
  
  const openCases = data.reconciliations.filter(r => r.status === "OPEN").length
  const resolvedCases = data.reconciliations.filter(r => r.status !== "OPEN").length

  return (
    <div>
      <PageHeader
        title="Reconciliation Desk"
        description="Manajemen kasus perselisihan pembayaran (dispute) dari transaksi kasir."
        actions={
          <Button variant="outline" onClick={() => void data.refresh()} disabled={data.loading}>
            <IconRefresh className={data.loading ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      />
      <ReconciliationMetrics
        openCases={openCases}
        resolvedCases={resolvedCases}
        total={data.reconciliations.length}
      />
      <div className="p-4 sm:p-6">
        <PaymentRiskPanel
          reconciliations={data.reconciliations}
          onResolve={setConflictTx}
        />
      </div>
      <ResolutionDialog
        record={conflictTx}
        onClose={() => setConflictTx(null)}
        onSubmit={data.resolve}
      />
    </div>
  )
}

