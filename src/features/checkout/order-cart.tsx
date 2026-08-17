import { IconChevronRight, IconCoffee, IconMinus, IconPlus, IconTrash } from "@tabler/icons-react"

import type { Product } from "@/infrastructure/persistence/models"
import { formatCurrency } from "@/shared/lib/format"
import { Button } from "@/shared/ui/components/button"
import { Card } from "@/shared/ui/components/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/components/dialog"

export type CartLine = { product: Product; quantity: number }

type OrderCartProps = {
  items: CartLine[]
  subtotal: number
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
  onAdd: (productId: string) => void
  onDecrement: (productId: string) => void
  onRemove: (productId: string) => void
  onClear: () => void
  onCheckout: () => void
}

export function OrderCart(props: OrderCartProps) {
  return (
    <>
      <aside className="hidden min-h-0 border-l bg-card/35 xl:flex xl:flex-col">
        <CartHeader items={props.items} />
        <CartBody {...props} />
      </aside>
      <Dialog open={props.mobileOpen} onOpenChange={props.onMobileOpenChange}>
        <DialogContent className="bottom-0 left-0 top-auto max-h-[88svh] w-full max-w-none translate-x-0 translate-y-0 gap-0 rounded-b-none p-0 xl:hidden">
          <DialogHeader className="border-b p-4">
            <DialogTitle>Pesanan aktif</DialogTitle>
            <DialogDescription>Draft tersimpan berurutan di perangkat.</DialogDescription>
          </DialogHeader>
          <CartBody {...props} />
        </DialogContent>
      </Dialog>
    </>
  )
}

function CartHeader({ items }: { items: CartLine[] }) {
  return (
    <div className="border-b p-4">
      <div className="text-sm font-semibold">Pesanan aktif</div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        {items.reduce((sum, item) => sum + item.quantity, 0)} item · aman saat reload
      </div>
    </div>
  )
}

function CartBody(props: OrderCartProps) {
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {props.items.length === 0 ? (
          <div className="grid min-h-52 place-items-center text-center text-xs text-muted-foreground">
            Pilih produk untuk membuat pesanan.
          </div>
        ) : (
          <div className="grid gap-2">
            {props.items.map(({ product, quantity }) => (
              <Card key={product.id} className="flex items-center gap-2.5 p-2.5">
                <div
                  className="grid size-10 shrink-0 place-items-center rounded-md"
                  style={{ color: product.accent }}
                >
                  <IconCoffee className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium">{product.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {formatCurrency(product.price * quantity)}
                  </div>
                </div>
                <div className="flex items-center rounded-md border bg-background">
                  <button
                    className="grid size-8 place-items-center"
                    onClick={() => props.onDecrement(product.id)}
                  >
                    <IconMinus className="size-3" />
                  </button>
                  <span className="w-5 text-center text-xs">{quantity}</span>
                  <button
                    className="grid size-8 place-items-center"
                    onClick={() => props.onAdd(product.id)}
                  >
                    <IconPlus className="size-3" />
                  </button>
                </div>
                <button
                  onClick={() => props.onRemove(product.id)}
                  className="text-muted-foreground hover:text-red-400"
                >
                  <IconTrash className="size-3.5" />
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>
      <div className="border-t bg-card p-4">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <div className="text-[10px] text-muted-foreground">Total</div>
            <strong className="text-xl tabular-nums">{formatCurrency(props.subtotal)}</strong>
          </div>
          <Button variant="ghost" size="sm" disabled={!props.items.length} onClick={props.onClear}>
            <IconTrash /> Kosongkan
          </Button>
        </div>
        <Button
          className="w-full"
          size="lg"
          disabled={!props.items.length}
          onClick={props.onCheckout}
        >
          Pilih pembayaran <IconChevronRight />
        </Button>
      </div>
    </>
  )
}
