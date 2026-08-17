import { IconCheck, IconWifiOff } from "@tabler/icons-react"

import { useLocalTransaction } from "@/features/transactions/transaction-queries"
import type { LocalTransaction } from "@/infrastructure/persistence/models"
import { formatCurrency, paymentLabels } from "@/shared/lib/format"
import { cn } from "@/shared/lib/utils"
import { SettlementBadge, SyncBadge } from "@/shared/ui/status-badge"
import { Button } from "@/shared/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/shared/ui/components/dialog"
import { Separator } from "@/shared/ui/components/separator"

export function ReceiptDialog({
  transaction,
  onClose,
}: {
  transaction: LocalTransaction | null
  onClose: () => void
}) {
  const persisted = useLocalTransaction(transaction?.id)
  const current = persisted ?? transaction
  if (!current) return null
  const settled = current.settlementStatus === "SETTLED"
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="p-0 sm:max-w-md">
        <div className="border-b bg-emerald-500/6 p-5 text-center">
          <div className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
            <IconCheck className="size-5" />
          </div>
          <DialogTitle>{settled ? "Penjualan settled" : "Provisional tersimpan"}</DialogTitle>
          <DialogDescription className="mt-1">
            {settled ? "Backend menerima transaksi tepat satu kali." : "Aman di perangkat ini."}
          </DialogDescription>
        </div>
        <div className="grid gap-3 p-4">
          <div className="flex items-center justify-between">
            <strong>{current.invoiceNumber}</strong>
            <div className="flex gap-1">
              <SettlementBadge status={current.settlementStatus} />
              <SyncBadge status={current.syncStatus} />
            </div>
          </div>
          <Separator />
          {current.items.map((item) => (
            <div key={item.productId} className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {item.quantity}× {item.name}
              </span>
              <span>{formatCurrency(item.subtotal)}</span>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between">
            <span className="text-xs text-muted-foreground">
              {paymentLabels[current.paymentMethod]}
            </span>
            <strong className="text-xl">{formatCurrency(current.total)}</strong>
          </div>
          <div
            className={cn(
              "flex gap-2 rounded-md border p-2.5 text-[10px]",
              settled ? "text-emerald-200" : "text-amber-200",
            )}
          >
            <IconWifiOff className="size-3.5 shrink-0" />
            {settled
              ? "Immutable; koreksi dibuat sebagai record baru."
              : "ID yang sama dipakai pada setiap retry."}
          </div>
        </div>
        <DialogFooter className="border-t p-4">
          <Button variant="outline" onClick={() => window.print()}>
            Cetak
          </Button>
          <Button onClick={onClose}>Transaksi baru</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
