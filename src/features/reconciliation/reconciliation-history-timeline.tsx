import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useCurrentSession } from "@/features/auth/session-queries"
import { fetchReconciliations } from "@/features/reconciliation/reconciliation-api"
import type { ReconciliationRecord } from "@/features/reconciliation/reconciliation-api"
import { formatTransactionDate } from "@/shared/lib/format"
import { Card } from "@/shared/ui/components/card"
import { Badge } from "@/shared/ui/components/badge"
import { IconAlertCircle, IconCheck, IconX } from "@tabler/icons-react"

function usePaymentReconciliations(paymentId: string | null | undefined) {
  const session = useCurrentSession()
  const [data, setData] = useState<ReconciliationRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!paymentId || !session) return
    setIsLoading(true)
    fetchReconciliations(session)
      .then((res) => {
        // Filter by payment id
        const filtered = res.data.filter((r) => r.id_payment === paymentId)
        setData(filtered)
      })
      .catch(() => setData([]))
      .finally(() => setIsLoading(false))
  }, [paymentId, session])

  return { data, isLoading }
}

export function ReconciliationHistoryTimeline({ paymentId }: { paymentId?: string | null }) {
  const { data: reconciliations, isLoading } = usePaymentReconciliations(paymentId)

  if (!paymentId) return null
  if (isLoading) return (
    <Card className="p-4 mt-4">
      <div className="text-xs text-muted-foreground animate-pulse">Memuat riwayat rekonsiliasi...</div>
    </Card>
  )
  if (reconciliations.length === 0) return null

  return (
    <Card className="p-4 mt-4">
      <h3 className="font-semibold text-sm mb-4">Riwayat Rekonsiliasi Pembayaran</h3>
      <div className="relative border-l border-muted ml-3 space-y-5">
        {reconciliations.map((rec, index) => {
          const isOpen = rec.status === "OPEN"
          const isValid = rec.status === "RESOLVED_VALID"
          const txId = (rec as any).payment?.transaction?.id_transaction
          return (
            <div key={rec.id_reconciliation} className="relative pl-6">
              <span className={`absolute -left-2 top-1 flex size-4 items-center justify-center rounded-full bg-background border ${
                isOpen ? "border-amber-500 text-amber-500" : isValid ? "border-emerald-500 text-emerald-500" : "border-red-500 text-red-500"
              }`}>
                {isOpen
                  ? <IconAlertCircle className="size-2.5" />
                  : isValid
                    ? <IconCheck className="size-2.5" />
                    : <IconX className="size-2.5" />
                }
              </span>
              <Link
                to={txId ? `/transactions/${txId}` : "/reconciliation"}
                className="grid gap-1 rounded-md -mx-2 px-2 py-1 transition-colors hover:bg-secondary/60"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium">Kasus #{index + 1}</span>
                    <Badge variant={isOpen ? "warning" : isValid ? "default" : "destructive"} className="text-[10px]">
                      {rec.status}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-primary">Lihat →</span>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground/60">
                  {rec.id_reconciliation}
                </div>
                <div className="text-xs text-muted-foreground">
                  {rec.reason} · Dibuka oleh <span className="font-medium">{rec.openedByUser?.full_name ?? rec.opened_by}</span> pada {formatTransactionDate(rec.created_at)}
                </div>
                {rec.evidence_note && (
                  <div className="text-[10px] text-muted-foreground">Bukti: {rec.evidence_note}</div>
                )}
                {rec.resolved_at && rec.resolution_note && (
                  <div className="mt-1 rounded bg-secondary/50 p-2 text-xs">
                    <span className="font-medium">Resolusi: </span>{rec.resolution_note}
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Oleh: {rec.resolvedByUser?.full_name ?? rec.resolved_by} pada {formatTransactionDate(rec.resolved_at)}
                    </div>
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
