import { useState } from "react"
import { IconCash, IconCheck, IconDeviceMobile, IconReceipt2 } from "@tabler/icons-react"
import { QRCodeSVG } from "qrcode.react"

import { validatePayment } from "@/features/checkout/payment-rules"
import type { PaymentMethod } from "@/infrastructure/persistence/models"
import { formatCurrency } from "@/shared/lib/format"
import { cn } from "@/shared/lib/utils"
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

type PaymentDialogProps = {
  open: boolean
  total: number
  onOpenChange: (open: boolean) => void
  onConfirm: (method: PaymentMethod, amountReceived?: number, reference?: string) => Promise<void>
}

export function PaymentDialog(props: PaymentDialogProps) {
  const [method, setMethod] = useState<PaymentMethod>("CASH")
  const [cashReceived, setCashReceived] = useState(0)
  const [reference, setReference] = useState("")
  const [verified, setVerified] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const valid = validatePayment(method, props.total, cashReceived, verified)

  async function submit() {
    if (!valid || submitting) return
    setSubmitting(true)
    try {
      await props.onConfirm(
        method,
        method === "CASH" ? cashReceived : undefined,
        reference || undefined,
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto p-0 sm:max-w-xl">
        <DialogHeader className="border-b p-4">
          <DialogTitle>Selesaikan pembayaran</DialogTitle>
          <DialogDescription>
            Transaksi disimpan ke perangkat sebelum jaringan dicoba.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 p-4">
          <div className="grid grid-cols-3 gap-2">
            {paymentOptions.map(([value, label, Icon]) => (
              <button
                key={value}
                onClick={() => {
                  setMethod(value)
                  setVerified(false)
                }}
                className={cn(
                  "grid min-h-16 place-items-center gap-1 rounded-md border bg-card p-2 text-xs text-muted-foreground",
                  method === value && "border-primary/45 bg-primary/8 text-primary",
                )}
              >
                <Icon className="size-5" /> {label}
              </button>
            ))}
          </div>
          {method === "CASH" ? (
            <CashPayment total={props.total} value={cashReceived} onChange={setCashReceived} />
          ) : (
            <AssertedPayment
              method={method}
              verified={verified}
              reference={reference}
              onReferenceChange={setReference}
              onVerifiedChange={setVerified}
            />
          )}
        </div>
        <DialogFooter className="border-t bg-secondary/25 p-4 sm:justify-between">
          <strong className="text-lg tabular-nums">{formatCurrency(props.total)}</strong>
          <Button disabled={!valid || submitting} onClick={submit}>
            {submitting ? "Menyimpan…" : "Konfirmasi penjualan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const paymentOptions = [
  ["CASH", "Tunai", IconCash],
  ["STATIC_QRIS", "QRIS", IconDeviceMobile],
  ["TRANSFER", "Transfer", IconReceipt2],
] as const

function CashPayment({
  total,
  value,
  onChange,
}: {
  total: number
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="grid gap-3 rounded-lg border bg-card p-3">
      <label className="grid gap-1.5 text-xs font-medium">
        Uang diterima
        <Input
          autoFocus
          inputMode="numeric"
          value={value || ""}
          onChange={(event) => onChange(Number(event.target.value.replace(/\D/g, "")))}
          placeholder="0"
        />
      </label>
      <div className="grid grid-cols-3 gap-2">
        {[total, Math.ceil(total / 50_000) * 50_000, 100_000].map((amount) => (
          <Button key={amount} variant="outline" size="sm" onClick={() => onChange(amount)}>
            {amount === total ? "Uang pas" : `${amount / 1_000}k`}
          </Button>
        ))}
      </div>
      <div className="flex justify-between rounded-md bg-secondary p-2.5 text-xs">
        <span className="text-muted-foreground">Kembalian</span>
        <strong>{formatCurrency(Math.max(0, value - total))}</strong>
      </div>
    </div>
  )
}

type AssertedPaymentProps = {
  method: Exclude<PaymentMethod, "CASH">
  verified: boolean
  reference: string
  onVerifiedChange: (value: boolean) => void
  onReferenceChange: (value: string) => void
}

function AssertedPayment(props: AssertedPaymentProps) {
  return (
    <div className="grid gap-3 rounded-lg border bg-card p-3">
      {props.method === "STATIC_QRIS" && (
        <div className="mx-auto rounded-lg bg-white p-3">
          <QRCodeSVG value="OPERATOR-POS-DEMO-STATIC-QRIS" size={124} fgColor="#09090b" />
        </div>
      )}
      <Input
        value={props.reference}
        onChange={(event) => props.onReferenceChange(event.target.value)}
        placeholder="Referensi eksternal (opsional)"
      />
      <Button
        variant={props.verified ? "default" : "outline"}
        onClick={() => props.onVerifiedChange(!props.verified)}
      >
        <IconCheck /> {props.verified ? "Sudah diverifikasi" : "Saya sudah cek pembayaran"}
      </Button>
      <p className="text-[10px] text-amber-300/80">
        Konfirmasi berasal dari operator, bukan payment gateway POS.
      </p>
    </div>
  )
}
