import { useEffect, useState } from "react"
import type {
  BackendTransaction,
  CreateCorrectionRequest,
  InventoryDiscrepancy,
  ResolveConflictRequest,
} from "@/features/reconciliation/reconciliation-api"

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
import { Input } from "@/shared/ui/components/input"

/**
 * Dialog untuk membuat koreksi transaksi CONFIRMED.
 * Sesuai CreateCorrectionRequest: { reason, items, subtotal, total }
 */
export function CorrectionDialog(props: {
  transaction: BackendTransaction | null
  onClose: () => void
  onSubmit: (id: string, input: CreateCorrectionRequest) => Promise<boolean>
}) {
  const [reason, setReason] = useState("")

  useEffect(() => {
    if (!props.transaction) {
      setReason("")
    }
  }, [props.transaction])

  const submit = async () => {
    if (!props.transaction) return
    // Untuk correction, kita re-submit item yang sama dengan alasan koreksi
    // (UI sederhana: hanya ubah reason, items & total mengikuti data lama)
    const tx = props.transaction
    const saved = await props.onSubmit(tx.id_transaction, {
      reason,
      // Kirim items kosong agar server tahu hanya reason yang berubah
      // Developer dapat memperluas UI ini untuk memilih item koreksi
      items: [],
      subtotal: Number(tx.subtotal),
      total: Number(tx.total),
    })
    if (saved) props.onClose()
  }

  return (
    <Dialog open={Boolean(props.transaction)} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Append payment correction</DialogTitle>
          <DialogDescription>
            Original transaction tetap settled dan immutable. Adjustment ini menjadi record audit
            baru.
          </DialogDescription>
        </DialogHeader>
        {props.transaction && (
          <div className="grid gap-3">
            <div className="flex justify-between rounded-md bg-secondary p-3 text-xs">
              <span className="font-mono text-muted-foreground">
                {props.transaction.id_transaction}
              </span>
              <strong>{formatCurrency(Number(props.transaction.total))}</strong>
            </div>
            <Field label="Reason">
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="min-h-20 rounded-md border bg-transparent p-2.5 text-sm outline-none focus:ring-[3px] focus:ring-ring/30"
                placeholder="Contoh: pembayaran QRIS ternyata tidak masuk"
              />
            </Field>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={props.onClose}>
            Batal
          </Button>
          <Button
            disabled={reason.length < 8}
            onClick={() => void submit()}
          >
            Simpan correction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Dialog untuk resolve konflik inventory (placeholder — endpoint belum ada di backend).
 */
export function ResolutionDialog(props: {
  discrepancy: InventoryDiscrepancy | null
  onClose: () => void
  onSubmit: (id: string, input: ResolveConflictRequest) => Promise<boolean>
}) {
  const [notes, setNotes] = useState("")

  useEffect(() => {
    setNotes("")
  }, [props.discrepancy])

  const submit = async () => {
    if (!props.discrepancy) return
    const saved = await props.onSubmit(props.discrepancy.id, {
      action: "CONFIRM",
      notes,
    })
    if (saved) props.onClose()
  }

  return (
    <Dialog open={Boolean(props.discrepancy)} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve inventory discrepancy</DialogTitle>
          <DialogDescription>Catat hasil stock opname atau penyesuaian admin.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Resolution note">
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-20 rounded-md border bg-transparent p-2.5 text-sm outline-none focus:ring-[3px] focus:ring-ring/30"
            />
          </Field>
          <Field label="Adjusted stock">
            <Input type="number" placeholder="0" disabled />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={props.onClose}>
            Batal
          </Button>
          <Button disabled={notes.length < 8} onClick={() => void submit()}>
            Resolve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium">{label}</span>
      {children}
    </label>
  )
}
