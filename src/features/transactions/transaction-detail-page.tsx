import { useState } from "react"
import { Link, useLocation, useParams } from "react-router-dom"
import { toast } from "sonner"

import { useUiStore } from "@/app/ui-store"
import { syncService } from "@/features/sync/sync-runtime"
import { voidProvisionalSale } from "@/features/transactions/transaction-actions"
import { TransactionFinancialDetails } from "@/features/transactions/transaction-detail-content"
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
  const location = useLocation()
  // If navigated from server-mode list, the transaction is passed in router state
  const passedTransaction = location.state?.transaction as LocalTransaction | undefined
  const localTransaction = useLocalTransaction(passedTransaction ? undefined : id)
  const transaction = passedTransaction ?? localTransaction
  const connection = useUiStore((state) => state.connection)
  const [voidOpen, setVoidOpen] = useState(false)
  const [correctionOpen, setCorrectionOpen] = useState(false)
  const [disputeOpen, setDisputeOpen] = useState(false)

  if (transaction === undefined) return <LoadingTransaction />
  if (!transaction) return <MissingTransaction />
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
        <TransactionFinancialDetails transaction={transaction} />
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

function MissingTransaction() {
  return (
    <div className="grid min-h-96 place-items-center text-center">
      <div>
        <p className="text-sm font-medium">Transaksi tidak ditemukan</p>
        <Link to="/transactions">
          <Button variant="link">Kembali ke transaksi</Button>
        </Link>
      </div>
    </div>
  )
}
