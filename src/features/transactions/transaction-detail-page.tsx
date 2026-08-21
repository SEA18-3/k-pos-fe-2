import { useEffect, useState } from "react"
import { Link, useLocation, useParams } from "react-router-dom"
import { toast } from "sonner"

import { useUiStore } from "@/app/ui-store"
import { useCurrentSession } from "@/features/auth/session-queries"
import { syncService } from "@/features/sync/sync-runtime"
import { voidProvisionalSale } from "@/features/transactions/transaction-actions"
import { fetchServerTransaction } from "@/features/transactions/transaction-api"
import { TransactionFinancialDetails } from "@/features/transactions/transaction-detail-content"
import { TransactionHistoryTimeline } from "@/features/transactions/transaction-history-timeline"
import { ReconciliationHistoryTimeline } from "@/features/reconciliation/reconciliation-history-timeline"
import { TransactionDetailHeader } from "@/features/transactions/transaction-detail-header"
import {
  TransactionLifecycle,
  type LifecycleEvent,
} from "@/features/transactions/transaction-lifecycle"
import { useLocalTransaction } from "@/features/transactions/transaction-queries"
import { VoidTransactionDialog } from "@/features/transactions/void-transaction-dialog"
import { TransactionCorrectionDialog, OpenDisputeDialog } from "@/features/transactions/transaction-dialogs"
import type { LocalTransaction } from "@/infrastructure/persistence/models"
import { formatTransactionDate, paymentLabels } from "@/shared/lib/format"
import { Button } from "@/shared/ui/components/button"

export function TransactionDetailPage() {
  const { id } = useParams()
  const session = useCurrentSession()
  const location = useLocation()
  // If navigated from server-mode list, the transaction is passed in router state
  const passedTransaction = location.state?.transaction as LocalTransaction | undefined
  const localTransaction = useLocalTransaction(id)
  const [serverTransaction, setServerTransaction] = useState<LocalTransaction | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [loadingServer, setLoadingServer] = useState(false)

  useEffect(() => {
    const needsFetch =
      (!localTransaction && !passedTransaction) ||
      (passedTransaction && passedTransaction.items.length === 0) ||
      (localTransaction && localTransaction.items.length === 0)

    if (needsFetch && id && session) {
      setLoadingServer(true)
      setServerError(null)
      fetchServerTransaction(session, id)
        .then((res) => setServerTransaction(res))
        .catch((err: any) => {
          setServerTransaction(null)
          setServerError(err?.status === 403 ? "Akses ditolak. Anda tidak memiliki izin untuk melihat transaksi ini dari server." : "Transaksi tidak ditemukan di server.")
        })
        .finally(() => setLoadingServer(false))
    }
  }, [localTransaction, passedTransaction, id, session])

  const transaction =
    serverTransaction && serverTransaction.items.length > 0
      ? serverTransaction
      : (passedTransaction ?? localTransaction ?? serverTransaction)
  const connection = useUiStore((state) => state.connection)
  const [voidOpen, setVoidOpen] = useState(false)
  const [correctionOpen, setCorrectionOpen] = useState(false)
  const [disputeOpen, setDisputeOpen] = useState(false)

  if (loadingServer && !transaction) return <LoadingTransaction />
  if (transaction === undefined && loadingServer) return <LoadingTransaction />
  if (transaction === undefined) return <LoadingTransaction />
  if (!transaction) return <MissingTransaction error={serverError} />
  const sale = transaction

  async function retry() {
    if (connection !== "ONLINE") {
      toast.error("Perangkat masih offline", {
        description: "Hubungkan jaringan sebelum mencoba kembali.",
      })
      return
    }
    await syncService.retry(sale.id)
    toast.success("Transaksi berhasil disinkronkan", {
      description: "Backend menerima ID yang sama tanpa duplikasi.",
    })
  }

  async function voidSale() {
    try {
      await voidProvisionalSale(sale.id)
      setVoidOpen(false)
      toast.success("Transaksi di-void", {
        description: "Void disinkronkan sebagai histori; stok lokal dikembalikan.",
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Void gagal")
    }
  }

  return (
    <div>
      <TransactionDetailHeader
        transaction={transaction}
        onVoid={() => setVoidOpen(true)}
        onRetry={() => void retry()}
        onEdit={() => setCorrectionOpen(true)}
        onDispute={() => setDisputeOpen(true)}
      />
      <div className="grid gap-4 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-4 content-start">
          <TransactionFinancialDetails transaction={transaction} />
          <TransactionHistoryTimeline transactionId={transaction.id} />
          <ReconciliationHistoryTimeline paymentId={transaction.paymentId} />
        </div>
        <TransactionLifecycle transaction={transaction} events={lifecycleEvents(transaction)} />
      </div>
      <VoidTransactionDialog
        open={voidOpen}
        transaction={transaction}
        onOpenChange={setVoidOpen}
        onConfirm={() => void voidSale()}
      />
      <TransactionCorrectionDialog
        open={correctionOpen}
        transaction={transaction}
        onOpenChange={setCorrectionOpen}
      />
      <OpenDisputeDialog
        open={disputeOpen}
        transaction={transaction}
        onOpenChange={setDisputeOpen}
      />
    </div>
  )
}

function lifecycleEvents(transaction: LocalTransaction): LifecycleEvent[] {
  const synced = transaction.syncStatus === "SYNCED"
  return [
    {
      label: "Dibuat di perangkat",
      description: `${formatTransactionDate(transaction.createdAt)} · ${transaction.operatorName}`,
      done: true,
    },
    {
      label: "Dikonfirmasi kasir",
      description: `${paymentLabels[transaction.paymentMethod]} · ${transaction.paymentVerificationType === "OPERATOR_ASSERTED" ? "verifikasi operator" : "verifikasi sistem"}`,
      done: true,
    },
    { label: "Disimpan ke local outbox", description: "Aman dari browser restart", done: true },
    {
      label: "Diterima backend",
      description: transaction.receivedAtBackend
        ? formatTransactionDate(transaction.receivedAtBackend)
        : (transaction.lastSyncError ?? "Menunggu koneksi"),
      done: synced,
      failed: transaction.syncStatus === "SYNC_FAILED",
    },
    {
      label: "Synced & immutable",
      description: synced ? "Histori terkunci; koreksi membuat record baru" : "Menunggu backend",
      done: synced,
    },
  ]
}

function LoadingTransaction() {
  return (
    <div className="grid min-h-96 place-items-center text-xs text-muted-foreground">
      Membuka transaksi lokal…
    </div>
  )
}

function MissingTransaction({ error }: { error?: string | null }) {
  return (
    <div className="grid min-h-96 place-items-center text-center">
      <div>
        <p className="text-sm font-medium">{error || "Transaksi tidak ditemukan"}</p>
        <Link to="/transactions">
          <Button variant="link">Kembali ke transaksi</Button>
        </Link>
      </div>
    </div>
  )
}
