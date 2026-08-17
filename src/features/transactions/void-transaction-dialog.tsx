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

export function VoidTransactionDialog(props: {
  open: boolean
  transaction: LocalTransaction
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void transaksi provisional?</DialogTitle>
          <DialogDescription>
            Item dikembalikan ke proyeksi stok lokal. Record void tetap disinkronkan agar audit
            history tidak hilang.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md bg-secondary p-3 text-xs">
          <div className="flex justify-between">
            <span>{props.transaction.invoiceNumber}</span>
            <strong>{formatCurrency(props.transaction.total)}</strong>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>
            Batal
          </Button>
          <Button variant="destructive" onClick={props.onConfirm}>
            Ya, void transaksi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
