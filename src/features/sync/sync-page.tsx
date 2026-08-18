import { IconAlertTriangle, IconCloudCheck, IconDatabase, IconRefresh } from "@tabler/icons-react"
import { toast } from "sonner"

import { useUiStore } from "@/app/ui-store"
import { useSyncSnapshot } from "@/features/sync/sync-queries"
import { syncService } from "@/features/sync/sync-runtime"
import type { LocalTransaction, OutboxEntry } from "@/infrastructure/persistence/models"
import { formatCurrency, formatTransactionDate, fromNow } from "@/shared/lib/format"
import { Badge } from "@/shared/ui/components/badge"
import { Button } from "@/shared/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/components/card"
import { PageHeader } from "@/shared/ui/page-header"
import { ConnectionBadge, SyncBadge } from "@/shared/ui/status-badge"

export function SyncPage() {
  const connection = useUiStore((state) => state.connection)
  const { attempts, device, lastSync, outbox, transactions } = useSyncSnapshot()
  const queued = outbox.flatMap((entry) => {
    const transaction = transactions.find((item) => item.id === entry.transactionId)
    return transaction ? [{ entry, transaction }] : []
  })
  const failed = outbox.filter((entry) => entry.status === "FAILED").length

  async function retryAll() {
    if (connection !== "ONLINE") {
      toast.error("Tidak ada koneksi", { description: "Data tetap aman di perangkat." })
      return
    }
    const count = await syncService.run({ includeFailed: true })
    toast.success(`${count} transaksi diantrekan ke server`)
  }

  return (
    <div>
      <PageHeader
        title="Sync & Data"
        description="Lihat local outbox, hasil acceptance backend, dan retry yang perlu perhatian."
        actions={
          <Button
            onClick={() => void retryAll()}
            disabled={!outbox.length || connection !== "ONLINE"}
          >
            <IconRefresh /> Retry semua ({outbox.length})
          </Button>
        }
      />
      <SyncMetrics
        connection={connection}
        pending={outbox.length}
        failed={failed}
        lastSync={lastSync?.value}
      />
      <div className="grid gap-4 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <QueueCard
          queued={queued}
          online={connection === "ONLINE"}
          onRetry={(id) => void syncService.retry(id)}
        />
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Device diagnostics</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-xs">
            <Diagnostic label="Device" value={device?.id ?? "Memuat…"} mono />
            <Diagnostic label="Batch policy" value="25 transaksi / batch" />
            <Diagnostic label="Payload schema" value="v1" />
            <Diagnostic label="Aktivitas sesi" value={`${attempts.length} attempt`} />
            <p className="rounded-md bg-secondary p-2 text-[10px] leading-4 text-muted-foreground">
              Transaksi dikirim sebagai antrean async; status final (`SYNCED`/`SYNC_CONFLICT`)
              didapat lewat poll rekonsiliasi, bukan langsung dari respons kirim.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SyncMetrics(props: {
  connection: "ONLINE" | "OFFLINE" | "RECONNECTING"
  pending: number
  failed: number
  lastSync?: string
}) {
  return (
    <div className="grid gap-px border-b bg-border sm:grid-cols-4">
      <Metric label="Koneksi" content={<ConnectionBadge state={props.connection} />} />
      <Metric
        label="Pending outbox"
        content={String(props.pending)}
        icon={<IconDatabase className="size-4 text-amber-300" />}
      />
      <Metric
        label="Terakhir berhasil"
        content={fromNow(props.lastSync)}
        icon={<IconCloudCheck className="size-4 text-emerald-400" />}
      />
      <Metric
        label="Perlu perhatian"
        content={String(props.failed)}
        icon={<IconAlertTriangle className="size-4 text-red-400" />}
      />
    </div>
  )
}

function QueueCard(props: {
  queued: Array<{ entry: OutboxEntry; transaction: LocalTransaction }>
  online: boolean
  onRetry: (id: string) => void
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Local outbox</CardTitle>
        <Badge variant={props.queued.length ? "warning" : "success"}>
          {props.queued.length ? `${props.queued.length} antre` : "Semua bersih"}
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
        {props.queued.length === 0 ? (
          <div className="grid min-h-56 place-items-center text-center">
              <div>
                <IconCloudCheck className="mx-auto mb-2 size-8 text-emerald-400" />
                <p className="text-xs font-medium">Semua data sudah tersinkron</p>
              </div>
          </div>
        ) : (
          <div className="divide-y">
            {props.queued.map(({ entry, transaction }) => (
              <div
                key={entry.id}
                className="grid gap-3 p-3 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">{transaction.invoiceNumber}</span>
                    <SyncBadge status={transaction.syncStatus} />
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {formatTransactionDate(transaction.createdAt)} ·{" "}
                    {formatCurrency(transaction.total)} · retry {entry.retryCount}×
                  </div>
                  {entry.lastError && (
                    <div className="mt-1 text-[10px] text-red-400">{entry.lastError}</div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={entry.status === "FAILED" ? "default" : "outline"}
                  disabled={!props.online}
                  onClick={() => props.onRetry(transaction.id)}
                >
                  <IconRefresh /> Retry
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Metric({
  label,
  content,
  icon,
}: {
  label: string
  content: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <div className="flex min-h-20 items-start justify-between bg-background px-4 py-3 sm:px-6">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-2 text-sm font-semibold">{content}</div>
      </div>
      {icon}
    </div>
  )
}

function Diagnostic({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-b pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "truncate font-mono text-[9px]" : "text-right"}>{value}</span>
    </div>
  )
}
