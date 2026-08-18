import {
  IconBuildingBank,
  IconCash,
  IconCheck,
  IconDeviceMobile,
  IconLock,
} from "@tabler/icons-react"

import type { LocalTransaction } from "@/infrastructure/persistence/models"
import { formatCurrency, paymentLabels } from "@/shared/lib/format"
import { cn } from "@/shared/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/components/card"
import { Separator } from "@/shared/ui/components/separator"

export function TransactionFinancialDetails({ transaction }: { transaction: LocalTransaction }) {
  const PaymentIcon =
    transaction.paymentMethod === "CASH"
      ? IconCash
      : transaction.paymentMethod === "STATIC_QRIS"
        ? IconDeviceMobile
        : IconBuildingBank
  return (
    <div className="grid content-start gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Rincian pembelian</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {transaction.items.map((item) => (
            <div key={item.productId} className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-md bg-secondary text-muted-foreground">
                <IconCheck className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium">{item.name}</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  {item.quantity} × {formatCurrency(item.unitPrice)}
                </div>
              </div>
              <div className="text-xs font-semibold tabular-nums">
                {formatCurrency(item.subtotal)}
              </div>
            </div>
          ))}
          <Separator />
          <div className="grid gap-2 text-xs">
            <SummaryRow label="Subtotal" value={formatCurrency(transaction.subtotal)} />
            <SummaryRow
              label="Diskon"
              value={transaction.discount ? `-${formatCurrency(transaction.discount)}` : "—"}
            />
            <div className="flex items-end justify-between pt-1">
              <strong>Total</strong>
              <strong className="text-xl tabular-nums">{formatCurrency(transaction.total)}</strong>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Pembayaran</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
              <PaymentIcon className="size-4" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-medium">{paymentLabels[transaction.paymentMethod]}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">
                {transaction.paymentVerificationType === "OPERATOR_ASSERTED"
                  ? "Dikonfirmasi operator dari sinyal eksternal"
                  : "Tidak memerlukan provider eksternal"}
              </div>
            </div>
          </div>
          {transaction.paymentReference && (
            <div className="flex justify-between rounded-md bg-secondary p-2.5 text-xs">
              <span className="text-muted-foreground">Referensi</span>
              <span>{transaction.paymentReference}</span>
            </div>
          )}
          {transaction.amountReceived && (
            <div className="grid grid-cols-2 gap-2">
              <MoneyBox label="Diterima" value={transaction.amountReceived} />
              <MoneyBox label="Kembalian" value={transaction.change ?? 0} success />
            </div>
          )}
        </CardContent>
      </Card>
      <IntegrityNotice transaction={transaction} />
    </div>
  )
}

function IntegrityNotice({ transaction }: { transaction: LocalTransaction }) {
  const synced = transaction.syncStatus === "SYNCED"
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3",
        synced ? "border-emerald-500/15 bg-emerald-500/5" : "border-amber-500/15 bg-amber-500/5",
      )}
    >
      <IconLock
        className={cn("mt-0.5 size-4 shrink-0", synced ? "text-emerald-400" : "text-amber-300")}
      />
      <div>
        <div className="text-xs font-semibold">
          {synced ? "Transaksi immutable" : "Belum tersinkron"}
        </div>
        <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
          {synced
            ? "Operator tidak dapat mengubah transaksi yang sudah sinkron. Koreksi dibuat Admin sebagai audit record baru."
            : "Transaksi aman di perangkat, tetapi belum final sampai backend menerimanya."}
        </p>
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function MoneyBox({ label, value, success }: { label: string; value: number; success?: boolean }) {
  return (
    <div className="rounded-md bg-secondary p-2.5">
      <div className="text-[9px] text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-xs font-semibold", success && "text-emerald-400")}>
        {formatCurrency(value)}
      </div>
    </div>
  )
}
