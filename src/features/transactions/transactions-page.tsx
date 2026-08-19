import { useMemo, useState } from "react"
import { IconArrowRight, IconClock, IconCloudCheck, IconSearch } from "@tabler/icons-react"
import { Link } from "react-router-dom"

import { useLocalTransactions, useServerTransactions } from "@/features/transactions/transaction-queries"
import type { LocalTransaction } from "@/infrastructure/persistence/models"
import { formatCurrency, formatTransactionDate, paymentLabels } from "@/shared/lib/format"
import { Button } from "@/shared/ui/components/button"
import { Card } from "@/shared/ui/components/card"
import { Input } from "@/shared/ui/components/input"
import { PageHeader } from "@/shared/ui/page-header"
import { SyncBadge } from "@/shared/ui/status-badge"
import { useCurrentSession } from "@/features/auth/session-queries"

type Filter = "ALL" | "PENDING" | "SYNCED" | "FAILED" | "VOIDED"
const filters: Array<{ value: Filter; label: string }> = [
  { value: "ALL", label: "Semua" },
  { value: "PENDING", label: "Pending Sync" },
  { value: "SYNCED", label: "Synced" },
  { value: "FAILED", label: "Gagal" },
  { value: "VOIDED", label: "Voided" },
]

export function TransactionsPage() {
  const session = useCurrentSession()
  const isOwner = session?.operator?.role === "OWNER"
  const dataSource = isOwner ? "SERVER" : "LOCAL"

  const localTransactions = useLocalTransactions()
  const serverQuery = useServerTransactions(session ?? null, dataSource === "SERVER")

  const transactions = dataSource === "SERVER" ? (serverQuery.data || []) : localTransactions

  const [filter, setFilter] = useState<Filter>("ALL")
  const [query, setQuery] = useState("")
  const filtered = useMemo(
    () =>
      transactions.filter(
        (transaction) =>
          matchesFilter(transaction, filter) &&
          `${transaction.invoiceNumber} ${transaction.total} ${paymentLabels[transaction.paymentMethod]}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [transactions, filter, query],
  )
  const provisional = transactions.filter(
    (item) => item.syncStatus === "PENDING_SYNC" || item.syncStatus === "SYNCING",
  ).length

  const sourceToggle = undefined

  return (
    <div>
      <PageHeader
        title="Transaksi"
        description="Semua penjualan dari perangkat ini, termasuk status sinkronisasi saat offline."
        actions={sourceToggle}
      />

      {dataSource === "SERVER" && serverQuery.isLoading && (
        <div className="p-8 text-center text-muted-foreground">Mengambil transaksi dari server...</div>
      )}

      {dataSource === "SERVER" && serverQuery.error && (
        <div className="p-8 text-center text-red-500">
          <strong>Error:</strong> {serverQuery.error instanceof Error ? serverQuery.error.message : String(serverQuery.error)}
        </div>
      )}

      {!(dataSource === "SERVER" && serverQuery.isLoading) && (
        <>
          <TransactionMetrics transactions={transactions} provisional={provisional} />
          <TransactionToolbar
            transactions={transactions}
            filter={filter}
            query={query}
            onFilter={setFilter}
            onQuery={setQuery}
          />
          <TransactionTable transactions={filtered} />
          <MobileTransactionList transactions={filtered} />
          {filtered.length === 0 && (
            <div className="grid min-h-80 place-items-center text-center">
              <div>
                <p className="text-muted-foreground">Belum ada transaksi</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TransactionMetrics({
  transactions,
  provisional,
}: {
  transactions: LocalTransaction[]
  provisional: number
}) {
  const validTransactions = transactions.filter(t => t.transactionStatus !== "VOIDED")
  const total = validTransactions.reduce((sum, item) => sum + item.total, 0)
  return (
    <div className="grid gap-px border-b bg-border sm:grid-cols-3">
      <Metric label="Nilai transaksi" value={formatCurrency(total)} />
      <Metric
        label="Synced"
        value={String(transactions.length - provisional)}
        icon={<IconCloudCheck className="size-4 text-emerald-400" />}
      />
      <Metric
        label="Perlu perhatian"
        value={String(provisional)}
        icon={<IconClock className="size-4 text-amber-300" />}
      />
    </div>
  )
}

function TransactionToolbar(props: {
  transactions: LocalTransaction[]
  filter: Filter
  query: string
  onFilter: (filter: Filter) => void
  onQuery: (query: string) => void
}) {
  return (
    <div className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex gap-1 overflow-x-auto">
        {filters.map((item) => (
          <Button
            key={item.value}
            size="sm"
            variant={props.filter === item.value ? "secondary" : "ghost"}
            onClick={() => props.onFilter(item.value)}
          >
            {item.label}
            {item.value !== "ALL" && (
              <span className="ml-1 rounded bg-background px-1 text-[9px] text-muted-foreground">
                {
                  props.transactions.filter((transaction) => matchesFilter(transaction, item.value))
                    .length
                }
              </span>
            )}
          </Button>
        ))}
      </div>
      <div className="relative w-full sm:w-64">
        <IconSearch className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          value={props.query}
          onChange={(event) => props.onQuery(event.target.value)}
          placeholder="Cari invoice, metode, jumlah…"
        />
      </div>
    </div>
  )
}

function TransactionTable({ transactions }: { transactions: LocalTransaction[] }) {
  return (
    <div className="hidden overflow-x-auto p-4 sm:block sm:p-6">
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-left text-xs">
          <thead className="bg-secondary/60 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5">Invoice</th>
              <th>Waktu</th>
              <th>Pembayaran</th>
              <th>Status</th>
              <th className="text-right">Total</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y">
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="bg-card/40 hover:bg-accent/60">
                <td className="px-3 py-3">
                  <strong>{transaction.invoiceNumber}</strong>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {transaction.items.length > 0
                      ? `${transaction.items.length} jenis`
                      : "Lihat rincian"}
                  </div>
                </td>
                <td>{formatTransactionDate(transaction.createdAt)}</td>
                <td>{paymentLabels[transaction.paymentMethod]}</td>
                <td>
                  <div className="flex gap-1 flex-wrap">
                    {transaction.transactionStatus === "VOIDED" && (
                      <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-500">
                        Voided
                      </span>
                    )}
                    <SyncBadge status={transaction.syncStatus} />
                  </div>
                </td>
                <td className="text-right font-semibold">{formatCurrency(transaction.total)}</td>
                <td>
                  <Link
                    to={`/transactions/${transaction.id}`}
                    state={{ transaction }}
                    className="grid size-8 place-items-center"
                  >
                    <IconArrowRight className="size-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MobileTransactionList({ transactions }: { transactions: LocalTransaction[] }) {
  return (
    <div className="grid gap-2 p-4 sm:hidden">
      {transactions.map((transaction) => (
        <Link key={transaction.id} to={`/transactions/${transaction.id}`} state={{ transaction }}>
          <Card className="grid gap-3 p-3">
            <div className="flex justify-between">
              <div>
                <div className="text-xs font-semibold">{transaction.invoiceNumber}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {formatTransactionDate(transaction.createdAt)}
                </div>
              </div>
              <strong>{formatCurrency(transaction.total)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] text-muted-foreground">
                {paymentLabels[transaction.paymentMethod]}
              </span>
              <div className="flex gap-1 flex-wrap">
                {transaction.transactionStatus === "VOIDED" && (
                  <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-500">
                    Voided
                  </span>
                )}
                <SyncBadge status={transaction.syncStatus} />
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}

function matchesFilter(transaction: LocalTransaction, filter: Filter) {
  if (filter === "PENDING")
    return transaction.syncStatus === "PENDING_SYNC" || transaction.syncStatus === "SYNCING"
  if (filter === "SYNCED") return transaction.syncStatus === "SYNCED"
  if (filter === "FAILED") return transaction.syncStatus === "SYNC_FAILED"
  if (filter === "VOIDED") return transaction.transactionStatus === "VOIDED"
  return true
}

function Metric({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-background px-4 py-3 sm:px-6">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-2 text-lg font-semibold">
        {icon}
        {value}
      </div>
    </div>
  )
}
