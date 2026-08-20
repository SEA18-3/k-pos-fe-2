import { useState, useEffect } from "react"
import { IconPackage } from "@tabler/icons-react"
import type { BackendProduct as Product } from "@/features/admin-catalog/admin-catalog-api"

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

export interface StockAdjustmentDialogProps {
  product: Product | null
  onClose: () => void
  onSubmit: (productId: string, quantity: number, notes?: string) => Promise<unknown>
}

export function StockAdjustmentDialog({ product, onClose, onSubmit }: StockAdjustmentDialogProps) {
  const [quantity, setQuantity] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Reset state when a new product is selected
  useEffect(() => {
    if (product) {
      setQuantity("")
      setNotes("")
      setSubmitting(false)
    }
  }, [product])

  const open = product !== null
  const currentStock = product?.inventory?.current_stock ?? 0

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product || submitting) return

    const qtyNumber = parseInt(quantity, 10)
    if (isNaN(qtyNumber)) return

    setSubmitting(true)
    try {
      await onSubmit(product.id_product, qtyNumber, notes || undefined)
      onClose()
    } finally {
      if (open) setSubmitting(false) // Only if still open (if error)
    }
  }

  // Calculate projected stock
  const qtyNum = parseInt(quantity, 10)
  const projectedStock = currentStock + (isNaN(qtyNum) ? 0 : qtyNum)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconPackage className="size-5 text-amber-500" />
              Penyesuaian Stok
            </DialogTitle>
            <DialogDescription>
              Atur stok untuk <strong>{product?.name}</strong>. Kamu bisa mengisi angka positif untuk menambah stok, atau negatif untuk mengurangi stok.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">Stok Saat Ini</label>
              <div className="col-span-3 text-sm font-bold text-muted-foreground">
                {currentStock}
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="quantity" className="text-right text-sm font-medium">
                Perubahan
              </label>
              <Input
                id="quantity"
                type="number"
                placeholder="Contoh: 50 atau -10"
                className="col-span-3"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                autoFocus
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">Stok Akhir</label>
              <div className={`col-span-3 text-lg font-bold ${projectedStock < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                {projectedStock}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="notes" className="text-right text-sm font-medium">
                Catatan
              </label>
              <Input
                id="notes"
                placeholder="Opsional (misal: Barang datang dari supplier)"
                className="col-span-3"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Batal
            </Button>
            <Button type="submit" disabled={submitting || isNaN(qtyNum) || qtyNum === 0}>
              {submitting ? "Menyimpan..." : "Simpan Penyesuaian"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
