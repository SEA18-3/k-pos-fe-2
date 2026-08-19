import { useState, useEffect } from "react"
import { useCurrentSession } from "@/features/auth/session-queries"
import { fetchReconciliationHistory } from "@/features/reconciliation/reconciliation-api"
import type { ReconciliationHistoryData } from "@/features/reconciliation/reconciliation-api"
import { formatTransactionDate } from "@/shared/lib/format"
import { Card } from "@/shared/ui/components/card"
import { Badge } from "@/shared/ui/components/badge"
import { IconAlertCircle, IconCheck, IconX } from "@tabler/icons-react"

function useReconciliationHistory(paymentId: string | null | undefined) {
  const session = useCurrentSession()
  const [data, setData] = useState<ReconciliationHistoryData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!paymentId || !session) return
    setIsLoading(true)
    setError(null)
    fetchReconciliationHistory(session, paymentId)
      .then(setData)
      .catch(setError)
      .finally(() => setIsLoading(false))
  }, [paymentId, session])

  return { data, isLoading, error }
}

export function ReconciliationHistoryTimeline({ paymentId }: { paymentId?: string | null }) {
  const { data, isLoading } = useReconciliationHistory(paymentId)

  if (!paymentId) return null
  if (isLoading) return (
    <Card className="p-4 mt-4">
      <div className="text-xs text-muted-foreground animate-pulse">Memuat riwayat rekonsiliasi...</div>
    </Card>
  )
  if (!data || !data.history || data.history.length === 0) return null

  return (
    <Card className="p-4 mt-4">
      <h3 className="font-semibold text-sm mb-4">Riwayat Rekonsiliasi Pembayaran</h3>
      <div className="relative border-l border-muted ml-3 space-y-5">
        {data.history.map((rec, index) => {
          const isOpen = rec.status === "OPEN"
          const isValid = rec.status === "RESOLVED_VALID"
          return (
            <div key={rec.id_reconciliation} className="relative pl-6">
              <span className="absolute -left-2 top-1 flex size-4 items-center justify-center rounded-full bg-background border border-amber-500 text-amber-500">
                {isOpen
                  ? <IconAlertCircle className="size-2.5" />
                  : isValid
                    ? <IconCheck className="size-2.5 text-emerald-500 border-emerald-500" style={{ borderColor: "rgb(16 185 129)" }} />
                    : <IconX className="size-2.5 text-red-500" />
                }
              </span>
              <div className="grid gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium">
                    Kasus #{index + 1}
                  </span>
                  <Badge variant={isOpen ? "warning" : isValid ? "default" : "destructive"} className="text-[10px]">
                    {rec.status}
                  </Badge>
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
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
