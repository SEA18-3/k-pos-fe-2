import { IconAlertTriangle, IconCloudCheck, IconDatabase, IconRefresh, IconServerOff } from "@tabler/icons-react"
import { toast } from "sonner"
import { useState, useEffect } from "react"

import { useUiStore } from "@/app/ui-store"
import { useCurrentSession } from "@/features/auth/session-queries"
import { useSyncSnapshot } from "@/features/sync/sync-queries"
import { syncService } from "@/features/sync/sync-runtime"
import { fetchFailedSyncQueues } from "@/features/transactions/transaction-api"
import type { FailedSyncQueueItem } from "@/features/transactions/transaction-api"
import type { LocalTransaction, OutboxEntry } from "@/infrastructure/persistence/models"
import { formatCurrency, formatTransactionDate, fromNow } from "@/shared/lib/format"
import { Badge } from "@/shared/ui/components/badge"
import { Button } from "@/shared/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/components/card"
import { PageHeader } from "@/shared/ui/page-header"
import { ConnectionBadge, SyncBadge } from "@/shared/ui/status-badge"

export function SyncPage() {
  const connection = useUiStore((state) => state.connection)
  const session = useCurrentSession()
  const { attempts, device, lastSync, outbox, transactions } = useSyncSnapshot()
  const queued = outbox.flatMap((entry) => {
    const transaction = transactions.find((item) => item.id === entry.transactionId)
    return transaction ? [{ entry, transaction }] : []
  })
  const failed = outbox.filter((entry) => entry.status === "FAILED").length

  const [serverFailedQueues, setServerFailedQueues] = useState<FailedSyncQueueItem[]>([])
  const [loadingServerQueue, setLoadingServerQueue] = useState(false)

  useEffect(() => {
    if (!session) return
    setLoadingServerQueue(true)
    fetchFailedSyncQueues(session)
      .then(setServerFailedQueues)
      .catch(() => setServerFailedQueues([]))
      .finally(() => setLoadingServerQueue(false))
  }, [session])

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
        description="Pantau status sinkronisasi data transaksi antara perangkat ini dengan server utama."
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
        <div className="grid gap-4 content-start">
          <QueueCard
            queued={queued}
            online={connection === "ONLINE"}
            onRetry={(id) => void syncService.retry(id)}
          />
          <ServerFailedQueueCard items={serverFailedQueues} loading={loadingServerQueue} />
        </div>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Device diagnostics</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-xs">
            <Diagnostic label="Device" value={device?.id ?? "Memuat…"} mono />
            <Diagnostic label="Batch policy" value="25 transaksi / batch" />
            <Diagnostic label="Payload schema" value="v1" />
            <Diagnostic label="Aktivitas sesi" value={`${attempts.length} attempt`} />
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
      <CardHeader>
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

function ServerFailedQueueCard(props: {
  items: FailedSyncQueueItem[]
  loading: boolean
}) {
  if (props.loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Server Failed Sync Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground animate-pulse py-4 text-center">
            Memuat data dari server…
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Server Failed Sync Queue</CardTitle>
        <Badge variant={props.items.length ? "destructive" : "success"}>
          {props.items.length ? `${props.items.length} gagal` : "Bersih"}
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
        {props.items.length === 0 ? (
          <div className="grid min-h-40 place-items-center text-center">
            <div>
              <IconCloudCheck className="mx-auto mb-2 size-7 text-emerald-400" />
              <p className="text-xs font-medium">Tidak ada sinkronisasi yang gagal di server</p>
              <p className="mt-1 text-[10px] text-muted-foreground">Semua antrean kasir sudah berhasil masuk ke database.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {props.items.map((item) => (
              <div key={item.id} className="p-3 grid gap-1">
                <div className="flex items-center gap-2">
                  <IconServerOff className="size-3.5 text-red-400 shrink-0" />
                  <span className="text-xs font-mono font-semibold truncate">
                    {item.offline_uuid ?? item.id_transaction ?? item.id}
                  </span>
                  <Badge variant="destructive" className="text-[10px] shrink-0">{item.status}</Badge>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Device: <span className="font-medium">{item.device?.name ?? item.id_device}</span>
                  {" · "}Retry: {item.retry_count}/{item.max_retries}
                  {" · "}Operasi: {item.operation}
                </div>
                {item.last_error && (
                  <div className="mt-1 rounded bg-red-500/10 px-2 py-1 text-[10px] text-red-400 font-mono break-all">
                    {item.last_error}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
