import { IconArrowLeft, IconBan, IconDownload, IconPrinter, IconRefresh } from "@tabler/icons-react"
import { Link } from "react-router-dom"

import type { LocalTransaction } from "@/infrastructure/persistence/models"
import { formatTransactionDate } from "@/shared/lib/format"
import { Button } from "@/shared/ui/components/button"
import { SettlementBadge, SyncBadge } from "@/shared/ui/status-badge"

export function TransactionDetailHeader(props: {
  transaction: LocalTransaction
  onVoid: () => void
  onRetry: () => void
}) {
  const transaction = props.transaction
  return (
    <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex items-center gap-3">
        <Link to="/transactions">
          <Button variant="outline" size="icon">
            <IconArrowLeft />
          </Button>
        </Link>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold tracking-[-0.03em]">
              {transaction.invoiceNumber}
            </h1>
            <SettlementBadge status={transaction.settlementStatus} />
            <SyncBadge status={transaction.syncStatus} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {formatTransactionDate(transaction.createdAt)} · Local merchant workspace
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline">
          <IconPrinter /> Cetak
        </Button>
        <Button variant="outline">
          <IconDownload /> Unduh
        </Button>
        {transaction.settlementStatus === "PROVISIONAL" &&
          transaction.transactionStatus !== "VOIDED" && (
            <Button variant="destructive" onClick={props.onVoid}>
              <IconBan /> Void
            </Button>
          )}
        {transaction.syncStatus === "FAILED" && (
          <Button onClick={props.onRetry}>
            <IconRefresh /> Retry sync
          </Button>
        )}
      </div>
    </div>
  )
}
