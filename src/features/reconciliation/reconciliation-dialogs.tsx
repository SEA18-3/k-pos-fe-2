import { useEffect, useState } from "react"
import type {
  BackendTransaction,
  CreateCorrectionRequest,
  InventoryDiscrepancy,
  ResolveInventoryDiscrepancyRequest,
} from "@operator/contracts"

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

export function CorrectionDialog(props: {
  transaction: BackendTransaction | null
  onClose: () => void
  onSubmit: (id: string, input: CreateCorrectionRequest) => Promise<boolean>
}) {
  const [reason, setReason] = useState("")
  const [adjustmentAmount, setAdjustmentAmount] = useState(0)
  const [evidenceReference, setEvidenceReference] = useState("")
  useEffect(() => {
    if (!props.transaction) {
      setReason("")
      setAdjustmentAmount(0)
      setEvidenceReference("")
    }
  }, [props.transaction])
  const submit = async () => {
    if (!props.transaction) return
    const saved = await props.onSubmit(props.transaction.id, {
      reason,
      adjustmentAmount,
      evidenceReference: evidenceReference || undefined,
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
              <span>{props.transaction.invoiceNumber}</span>
              <strong>{formatCurrency(props.transaction.total)}</strong>
            </div>
            <Field label="Reason">
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="min-h-20 rounded-md border bg-transparent p-2.5 text-sm outline-none focus:ring-[3px] focus:ring-ring/30"
                placeholder="Contoh: pembayaran QRIS ternyata tidak masuk"
              />
            </Field>
            <Field label="Adjustment amount">
              <Input
                type="number"
                value={adjustmentAmount || ""}
                onChange={(event) => setAdjustmentAmount(Number(event.target.value))}
                placeholder="-22000"
              />
            </Field>
            <Field label="Evidence reference">
              <Input
                value={evidenceReference}
                onChange={(event) => setEvidenceReference(event.target.value)}
                placeholder="Bank statement / ticket ID"
              />
            </Field>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={props.onClose}>
            Batal
          </Button>
          <Button
            disabled={reason.length < 8 || adjustmentAmount === 0}
            onClick={() => void submit()}
          >
            Simpan correction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ResolutionDialog(props: {
  discrepancy: InventoryDiscrepancy | null
  onClose: () => void
  onSubmit: (id: string, input: ResolveInventoryDiscrepancyRequest) => Promise<boolean>
}) {
  const [resolution, setResolution] = useState("")
  const [adjustedStock, setAdjustedStock] = useState<number | undefined>()
  useEffect(() => {
    setResolution("")
    setAdjustedStock(props.discrepancy ? Math.max(0, props.discrepancy.projectedStock) : undefined)
  }, [props.discrepancy])
  const submit = async () => {
    if (!props.discrepancy) return
    const saved = await props.onSubmit(props.discrepancy.id, { resolution, adjustedStock })
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
              value={resolution}
              onChange={(event) => setResolution(event.target.value)}
              className="min-h-20 rounded-md border bg-transparent p-2.5 text-sm outline-none focus:ring-[3px] focus:ring-ring/30"
            />
          </Field>
          <Field label="Adjusted stock">
            <Input
              type="number"
              value={adjustedStock ?? ""}
              onChange={(event) =>
                setAdjustedStock(event.target.value === "" ? undefined : Number(event.target.value))
              }
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={props.onClose}>
            Batal
          </Button>
          <Button disabled={resolution.length < 8} onClick={() => void submit()}>
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
