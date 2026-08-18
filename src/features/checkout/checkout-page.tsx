import { useMemo, useState } from "react"
import { IconShoppingBag } from "@tabler/icons-react"
import { toast } from "sonner"

import { useUiStore } from "@/app/ui-store"
import { useCurrentSession } from "@/features/auth/session-queries"
import { useCatalogProducts } from "@/features/catalog/catalog-queries"
import type { CatalogCategory } from "@/features/checkout/catalog-filter"
import { CatalogGrid } from "@/features/checkout/catalog-grid"
import { confirmSale } from "@/features/checkout/confirm-sale"
import { OrderCart } from "@/features/checkout/order-cart"
import { PaymentDialog } from "@/features/checkout/payment-dialog"
import { ReceiptDialog } from "@/features/checkout/receipt-dialog"
import { syncService } from "@/features/sync/sync-runtime"
import { useLocalTransactions } from "@/features/transactions/transaction-queries"
import type { LocalTransaction, PaymentMethod } from "@/infrastructure/persistence/models"
import { formatCurrency } from "@/shared/lib/format"
import { Button } from "@/shared/ui/components/button"

export function CheckoutPage() {
  const products = useCatalogProducts()
  const transactions = useLocalTransactions()
  const session = useCurrentSession()
  const { cart, addItem, decrementItem, removeItem, clearCart, connection } = useUiStore()
  const [category, setCategory] = useState<CatalogCategory>("Semua")
  const [query, setQuery] = useState("")
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [mobileCartOpen, setMobileCartOpen] = useState(false)
  const [receipt, setReceipt] = useState<LocalTransaction | null>(null)

  const cartItems = useMemo(
    () =>
      products
        .filter((product) => cart[product.id])
        .map((product) => ({ product, quantity: cart[product.id]! })),
    [products, cart],
  )
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const today = new Date().toDateString()
  const todayTransactions = transactions.filter(
    (transaction) => new Date(transaction.createdAt).toDateString() === today,
  )
  const todaySales = todayTransactions.reduce((sum, transaction) => sum + transaction.total, 0)
  const provisional = transactions.filter(
    (transaction) => transaction.syncStatus === "PENDING_SYNC",
  ).length

  async function handleConfirm(
    paymentMethod: PaymentMethod,
    amountReceived?: number,
    paymentReference?: string,
  ) {
    try {
      const transaction = await confirmSale({
        items: cartItems,
        paymentMethod,
        amountReceived,
        paymentReference,
      })
      setPaymentOpen(false)
      setMobileCartOpen(false)
      setReceipt(transaction)
      clearCart()
      toast.success("Tersimpan di perangkat", {
        description:
          connection === "ONLINE"
            ? "Dikirim ke server di background."
            : "Akan sync otomatis saat koneksi kembali.",
      })
      if (connection === "ONLINE") void syncService.run()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Transaksi gagal disimpan")
    }
  }

  return (
    <div className="grid min-h-[calc(100svh-62px)] xl:grid-cols-[minmax(0,1fr)_370px]">
      <section className="min-w-0">
        <header className="border-b px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-[-0.04em] sm:text-2xl">
                Selamat bekerja, {session?.operator.name ?? "Operator"}.
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Harga dan item dikunci sebagai snapshot saat transaksi dikonfirmasi.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md border bg-border text-right">
              <Metric label="Transaksi" value={String(todayTransactions.length)} />
              <Metric label="Penjualan" value={formatCurrency(todaySales)} />
              <Metric label="Pending sync" value={String(provisional)} warning={provisional > 0} />
            </div>
          </div>
        </header>
        <CatalogGrid
          products={products}
          cart={cart}
          category={category}
          query={query}
          onCategoryChange={setCategory}
          onQueryChange={setQuery}
          onAdd={addItem}
        />
      </section>
      <OrderCart
        items={cartItems}
        subtotal={subtotal}
        mobileOpen={mobileCartOpen}
        onMobileOpenChange={setMobileCartOpen}
        onAdd={addItem}
        onDecrement={decrementItem}
        onRemove={removeItem}
        onClear={clearCart}
        onCheckout={() => setPaymentOpen(true)}
      />
      {cartItems.length > 0 && (
        <div className="fixed inset-x-3 bottom-20 z-20 xl:hidden">
          <Button className="w-full shadow-2xl" size="lg" onClick={() => setMobileCartOpen(true)}>
            <IconShoppingBag /> {cartItems.reduce((sum, item) => sum + item.quantity, 0)} item ·{" "}
            {formatCurrency(subtotal)}
          </Button>
        </div>
      )}
      <PaymentDialog
        open={paymentOpen}
        total={subtotal}
        onOpenChange={setPaymentOpen}
        onConfirm={handleConfirm}
      />
      <ReceiptDialog transaction={receipt} onClose={() => setReceipt(null)} />
    </div>
  )
}

function Metric({
  label,
  value,
  warning = false,
}: {
  label: string
  value: string
  warning?: boolean
}) {
  return (
    <div className="bg-background px-3 py-2">
      <div className="text-[8px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={warning ? "text-xs font-semibold text-amber-300" : "text-xs font-semibold"}>
        {value}
      </div>
    </div>
  )
}
