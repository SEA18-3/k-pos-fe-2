import { useState } from "react"
import { toast } from "sonner"

import { useCurrentSession } from "@/features/auth/session-queries"
import {
  createCorrection,
  openReconciliation,
} from "@/features/reconciliation/reconciliation-api"
import type { LocalTransaction } from "@/infrastructure/persistence/models"
import { formatCurrency } from "@/shared/lib/format"
import { Button } from "@/shared/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/components/dialog"

export function TransactionCorrectionDialog({
  open,
  transaction,
  onOpenChange,
}: {
  open: boolean
  transaction: LocalTransaction
  onOpenChange: (open: boolean) => void
}) {
  const session = useCurrentSession()
  const [reason, setReason] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (!session || !reason.trim()) return
    setSubmitting(true)
    try {
      await createCorrection(session, transaction.id, {
        reason: reason.trim(),
        notes: notes.trim() || undefined,
        items: transaction.items.map((item) => ({
          id_product: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          subtotal: item.subtotal,
        })),
        subtotal: transaction.subtotal,
        total: transaction.total,
      })
      toast.success("Transaksi berhasil dikoreksi")
      onOpenChange(false)
      setReason("")
      setNotes("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengoreksi transaksi")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Koreksi Transaksi</DialogTitle>
          <DialogDescription>
            Koreksi transaksi yang sudah dikonfirmasi menggunakan pola Immutable Bridge. Transaksi lama akan di-VOID dan transaksi baru akan dibuat.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="flex justify-between rounded-md bg-secondary p-3 text-xs">
            <span className="font-mono">{transaction.invoiceNumber}</span>
            <strong>{formatCurrency(transaction.total)}</strong>
          </div>
          <label className="grid gap-1.5">
            <span className="text-xs font-medium">Alasan Koreksi (Wajib)</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-20 rounded-md border bg-transparent p-2.5 text-sm outline-none focus:ring-[3px] focus:ring-ring/30"
              placeholder="Contoh: Kesalahan input item kasir..."
              disabled={submitting}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-medium">Catatan Tambahan (Opsional)</span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-[3px] focus:ring-ring/30"
              placeholder="Catatan verifikasi atau referensi..."
              disabled={submitting}
            />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Batal
          </Button>
          <Button onClick={() => void submit()} disabled={reason.trim().length < 5 || submitting}>
            {submitting ? "Menyimpan…" : "Koreksi Transaksi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function OpenDisputeDialog({
  open,
  transaction,
  onOpenChange,
}: {
  open: boolean
  transaction: LocalTransaction
  onOpenChange: (open: boolean) => void
}) {
  const session = useCurrentSession()
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (!session || !reason.trim()) return
    setSubmitting(true)
    try {
      await openReconciliation(session, {
        id_transaction: transaction.id,
        reason: reason.trim(),
      })
      toast.success("Kasus dispute pembayaran berhasil dibuka")
      onOpenChange(false)
      setReason("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membuka kasus dispute")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buka Kasus Dispute Pembayaran</DialogTitle>
          <DialogDescription>
            Laporkan ketidaksesuaian pembayaran ke Reconciliation Desk untuk diinvestigasi.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="flex justify-between rounded-md bg-secondary p-3 text-xs">
            <span className="font-mono">{transaction.invoiceNumber}</span>
            <strong>{formatCurrency(transaction.total)}</strong>
          </div>
          <label className="grid gap-1.5">
            <span className="text-xs font-medium">Alasan Dispute (Wajib)</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-20 rounded-md border bg-transparent p-2.5 text-sm outline-none focus:ring-[3px] focus:ring-ring/30"
              placeholder="Contoh: Bukti transfer bank tidak ditemukan di mutasi rekening..."
              disabled={submitting}
            />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Batal
          </Button>
          <Button variant="destructive" onClick={() => void submit()} disabled={reason.trim().length < 5 || submitting}>
            {submitting ? "Membuka Kasus…" : "Buka Kasus Dispute"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
