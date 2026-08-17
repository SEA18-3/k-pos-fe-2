import { useState } from "react"
import type { BackendTransaction, InventoryDiscrepancy } from "@operator/contracts"
import { IconRefresh } from "@tabler/icons-react"

import {
  CorrectionDialog,
  ResolutionDialog,
} from "@/features/reconciliation/reconciliation-dialogs"
import {
  AuditPanel,
  DeskTabs,
  InventoryPanel,
  PaymentRiskPanel,
  ReconciliationMetrics,
  type ReconciliationDesk,
} from "@/features/reconciliation/reconciliation-panels"
import { useReconciliationDesk } from "@/features/reconciliation/use-reconciliation-desk"
import { Button } from "@/shared/ui/components/button"
import { PageHeader } from "@/shared/ui/page-header"

export function ReconciliationPage() {
  const data = useReconciliationDesk()
  const [desk, setDesk] = useState<ReconciliationDesk>("PAYMENTS")
  const [transaction, setTransaction] = useState<BackendTransaction | null>(null)
  const [discrepancy, setDiscrepancy] = useState<InventoryDiscrepancy | null>(null)
  return (
    <div>
      <PageHeader
        title="Reconciliation desk"
        description="Koreksi pembayaran dan selesaikan proyeksi stok tanpa pernah mengubah histori transaksi asli."
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
      <DeskTabs value={desk} onChange={setDesk} />
      <div className="p-4 sm:p-6">
        {desk === "PAYMENTS" && (
          <PaymentRiskPanel transactions={data.transactions} onCorrect={setTransaction} />
        )}
        {desk === "INVENTORY" && (
          <InventoryPanel discrepancies={data.discrepancies} onResolve={setDiscrepancy} />
        )}
        {desk === "AUDIT" && <AuditPanel corrections={data.corrections} />}
      </div>
      <CorrectionDialog
        transaction={transaction}
        onClose={() => setTransaction(null)}
        onSubmit={data.correct}
      />
      <ResolutionDialog
        discrepancy={discrepancy}
        onClose={() => setDiscrepancy(null)}
        onSubmit={data.resolve}
      />
    </div>
  )
}
