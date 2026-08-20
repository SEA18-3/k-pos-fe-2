import { useCurrentSession } from "@/features/auth/session-queries"
import { useTransactionHistory } from "./transaction-queries"
import { formatTransactionDate } from "@/shared/lib/format"
import { IconEdit } from "@tabler/icons-react"
import { Card } from "@/shared/ui/components/card"
import { Link } from "react-router-dom"

export function TransactionHistoryTimeline({ transactionId }: { transactionId: string }) {
  const session = useCurrentSession()
  const { data: history, isLoading, error } = useTransactionHistory(session ?? null, transactionId)

  if (isLoading) return <div className="text-xs text-muted-foreground p-4 animate-pulse">Memuat riwayat koreksi...</div>
  
  if (error) {
    return <div className="text-xs text-destructive p-4">Error memuat riwayat: {error.message}</div>
  }

  if (!history) return null

  if (history.length <= 1) {
    return (
      <Card className="p-4 mt-4">
        <h3 className="font-semibold text-sm mb-2">Riwayat Koreksi (Editan)</h3>
        <p className="text-xs text-muted-foreground">
          Transaksi ini belum pernah dikoreksi (masih versi asli).
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-4 mt-4">
      <h3 className="font-semibold text-sm mb-4">Riwayat Koreksi (Editan)</h3>
      <div className="relative border-l border-muted ml-3 space-y-6">
        {history.map((node, index) => {
          const isLast = index === history.length - 1
          const isCurrent = node.transaction.id === transactionId
          return (
            <div key={node.transaction.id} className="relative pl-6">
              <span className="absolute -left-2 top-1 flex size-4 items-center justify-center rounded-full bg-background border border-primary text-primary">
                <IconEdit className="size-2.5" />
              </span>
              <Link
                to={`/transactions/${node.transaction.id}`}
                state={{ transaction: node.transaction }}
                className="grid gap-1 rounded-md -mx-2 px-2 py-1 transition-colors hover:bg-secondary/60"
                onClick={(e) => isCurrent && e.preventDefault()}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-medium">
                      {index === 0 ? "Transaksi Awal (Dibuat)" : `Koreksi #${index}`}
                      {isCurrent && <span className="ml-2 text-[10px] text-muted-foreground">(halaman ini)</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTransactionDate(node.transaction.createdAt)}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">
                      {node.transaction.id}
                    </div>
                  </div>
                  {!isCurrent && (
                    <span className="text-[10px] text-primary mt-0.5">Lihat →</span>
                  )}
                </div>
                {node.correction_metadata && (
                  <div className="mt-1 rounded bg-secondary/50 p-2 text-xs">
                    <span className="font-medium">Alasan Koreksi: </span>
                    {node.correction_metadata.reason}
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Oleh: {node.correction_metadata.corrected_by} pada {formatTransactionDate(node.correction_metadata.corrected_at)}
                    </div>
                  </div>
                )}
                {isLast && (
                  <div className="text-[10px] text-emerald-500 font-medium mt-1">
                    Versi Paling Baru (Final)
                  </div>
                )}
              </Link>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
