import type { BackendTransaction } from "@/features/reconciliation/reconciliation-api"
import {
  IconArrowDownRight,
  IconCheck,
  IconClipboardCheck,
} from "@tabler/icons-react"

import { formatCurrency, formatTransactionDate, paymentLabels } from "@/shared/lib/format"
import { cn } from "@/shared/lib/utils"
import { Badge } from "@/shared/ui/components/badge"
import { Button } from "@/shared/ui/components/button"
import { Card } from "@/shared/ui/components/card"

export function ReconciliationMetrics(props: {
  transactions: number
  corrections: number
  open: number
}) {
  return (
    <div className="grid gap-px border-b bg-border sm:grid-cols-3">
      <Metric label="Operator-asserted" value={props.transactions} />
      <Metric label="Correction records" value={props.corrections} primary />
      <Metric label="Sync conflicts" value={props.open} warning={props.open > 0} />
    </div>
  )
}

export function PaymentRiskPanel(props: {
  transactions: BackendTransaction[]
  onCorrect: (transaction: BackendTransaction) => void
  onResolve: (transaction: BackendTransaction) => void
}) {
  if (props.transactions.length === 0)
    return (
      <EmptyState
        icon={IconClipboardCheck}
        title="Belum ada payment risk"
        copy="Transaksi QRIS/Transfer yang sudah masuk backend akan muncul di sini."
      />
    )
  return (
    <div className="grid gap-3">
      {props.transactions.map((transaction) => (
        <Card
          key={transaction.id_transaction}
          className="grid gap-3 p-3 sm:grid-cols-[1fr_auto] sm:items-center"
        >
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-md bg-amber-500/10 text-amber-300">
              <IconArrowDownRight className="size-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold">{transaction.id_transaction}</span>
                {transaction.sync_status === "SYNC_CONFLICT" && (
                  <Badge variant="warning">Sync conflict</Badge>
                )}
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                {transaction.payment
                  ? (paymentLabels as Record<string, string>)[transaction.payment.method] ??
                    transaction.payment.method
                  : "—"}{" "}
                · {formatTransactionDate(transaction.created_at_local ?? transaction.created_at)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <strong className="text-sm tabular-nums">
              {formatCurrency(Number(transaction.total))}
            </strong>
            {transaction.sync_status === "SYNC_CONFLICT" ? (
              <Button size="sm" variant="destructive" onClick={() => props.onResolve(transaction)}>
                Resolve
              </Button>
            ) : (
              <Button size="sm" onClick={() => props.onCorrect(transaction)}>
                Buat correction
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}

function Metric({
  label,
  value,
  primary,
  warning,
}: {
  label: string
  value: number
  primary?: boolean
  warning?: boolean
}) {
  return (
    <div className="bg-background px-4 py-3 sm:px-6">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 text-lg font-semibold",
          primary && "text-primary",
          warning && "text-amber-300",
        )}
      >
        {value}
      </div>
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  copy,
}: {
  icon: typeof IconCheck
  title: string
  copy: string
}) {
  return (
    <div className="grid min-h-72 place-items-center rounded-lg border border-dashed text-center">
      <div>
        <Icon className="mx-auto mb-3 size-7 text-muted-foreground" />
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{copy}</p>
      </div>
    </div>
  )
}
