import { useEffect, useState } from "react"
import type { ReconciliationRecord } from "@/features/reconciliation/reconciliation-api"

import { Button } from "@/shared/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/components/dialog"

/**
 * Dialog untuk menyelesaikan kasus perselisihan (Reconciliation Dispute).
 */
export function ResolutionDialog(props: {
  record: ReconciliationRecord | null
  onClose: () => void
  onSubmit: (id: string, status: "RESOLVED_VALID" | "RESOLVED_INVALID", resolution: string) => Promise<void>
}) {
  const [resolution, setResolution] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setResolution("")
  }, [props.record])

  const submit = async (status: "RESOLVED_VALID" | "RESOLVED_INVALID") => {
    if (!props.record) return
    setSubmitting(true)
    try {
      await props.onSubmit(props.record.id_reconciliation, status, resolution)
      props.onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={Boolean(props.record)} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Selesaikan Dispute Pembayaran</DialogTitle>
          <DialogDescription>
            Pilih hasil dari investigasi kasus rekonsiliasi pembayaran ini.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Catatan Resolusi (Wajib)">
            <textarea
              value={resolution}
              onChange={(event) => setResolution(event.target.value)}
              className="min-h-20 rounded-md border bg-transparent p-2.5 text-sm outline-none focus:ring-[3px] focus:ring-ring/30"
              placeholder="Jelaskan alasan penyelesaian kasus ini..."
              disabled={submitting}
            />
          </Field>
          <div className="text-xs text-muted-foreground rounded-md bg-secondary p-3">
            <p className="mb-2"><strong>INVALID:</strong> Uang tidak masuk, transaksi akan di-VOID untuk dikeluarkan dari laporan, tapi stok TIDAK dikembalikan.</p>
            <p><strong>VALID:</strong> Uang akhirnya masuk atau kasus ditutup, transaksi tetap CONFIRMED.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={props.onClose} disabled={submitting}>
            Batal
          </Button>
          <Button variant="destructive" disabled={resolution.length < 8 || submitting} onClick={() => void submit("RESOLVED_INVALID")}>
            Tandai INVALID
          </Button>
          <Button disabled={resolution.length < 8 || submitting} onClick={() => void submit("RESOLVED_VALID")}>
            Tandai VALID
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

