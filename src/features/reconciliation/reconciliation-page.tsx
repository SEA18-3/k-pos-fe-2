import { useState } from "react"
import type { BackendTransaction, InventoryDiscrepancy } from "@/features/reconciliation/reconciliation-api"
import { IconRefresh } from "@tabler/icons-react"

import {
  CorrectionDialog,
  ResolutionDialog,
} from "@/features/reconciliation/reconciliation-dialogs"
import {
  PaymentRiskPanel,
  ReconciliationMetrics,
} from "@/features/reconciliation/reconciliation-panels"
import { useReconciliationDesk } from "@/features/reconciliation/use-reconciliation-desk"
import { Button } from "@/shared/ui/components/button"
import { PageHeader } from "@/shared/ui/page-header"

export function ReconciliationPage() {
  const data = useReconciliationDesk()
  const [transaction, setTransaction] = useState<BackendTransaction | null>(null)
  const [conflictTx, setConflictTx] = useState<BackendTransaction | null>(null)
  return (
    <div>
      <PageHeader
        title="Reconciliation desk"
        description="Koreksi pembayaran tanpa pernah mengubah histori transaksi asli."
        actions={
          <Button variant="outline" onClick={() => void data.refresh()} disabled={data.loading}>
            <IconRefresh className={data.loading ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      />
      <ReconciliationMetrics
        transactions={data.transactions.length}
        corrections={data.corrections.length}
        open={data.openDiscrepancyCount}
      />
      <div className="p-4 sm:p-6">
        <PaymentRiskPanel
          transactions={data.transactions}
          onCorrect={setTransaction}
          onResolve={setConflictTx}
        />
      </div>
      <CorrectionDialog
        transaction={transaction}
        onClose={() => setTransaction(null)}
        onSubmit={data.correct}
      />
      <ResolutionDialog
        transaction={conflictTx}
        onClose={() => setConflictTx(null)}
        onSubmit={data.resolve}
      />
    </div>
  )
}
