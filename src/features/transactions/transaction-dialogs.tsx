import { useEffect, useState, useMemo } from "react"
import { toast } from "sonner"

import { useCurrentSession } from "@/features/auth/session-queries"
import { correctTransaction, openReconciliation } from "@/features/reconciliation/reconciliation-api"
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

import { IconMinus, IconPlus, IconTrash, IconSearch } from "@tabler/icons-react"
import { useCatalogProducts } from "@/features/catalog/catalog-queries"
import { applyRemoteCorrection } from "@/infrastructure/persistence/transaction-repository"

export function TransactionCorrectionDialog(props: {
  transaction: LocalTransaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const session = useCurrentSession()
  const [reason, setReason] = useState("")
  const [notes, setNotes] = useState("")
  const [search, setSearch] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [items, setItems] = useState<Array<{
    id_product: string
    name: string
    quantity: number
    unit_price: number
    subtotal: number
  }>>([])

  const catalogProducts = useCatalogProducts()

  useEffect(() => {
    if (props.open && props.transaction) {
      setReason("")
      setNotes("")
      setSearch("")
      setItems(
        props.transaction.items.map((item) => ({
          id_product: item.productId || (item as any).id_product || "",
          name: item.name || (item as any).product_name || "Unknown Product",
          quantity: item.quantity,
          unit_price: item.unitPrice || (item as any).unit_price || 0,
          subtotal: item.subtotal,
        }))
      )
    }
  }, [props.open, props.transaction])

  const searchResults = useMemo(() => {
    if (!catalogProducts || search.length < 2) return []
    const lowerSearch = search.toLowerCase()
    return catalogProducts
      .filter((p) => p.name.toLowerCase().includes(lowerSearch) || p.sku?.toLowerCase().includes(lowerSearch))
      .slice(0, 5)
  }, [catalogProducts, search])

  const currentSubtotal = items.reduce((acc, item) => acc + item.subtotal, 0)
  // Biarkan perhitungan pajak/diskon sesederhana mungkin untuk sekarang (sama dengan subtotal)
  const currentTotal = currentSubtotal

  const updateQuantity = (id_product: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id_product === id_product) {
          const newQuantity = Math.max(0, item.quantity + delta)
          return {
            ...item,
            quantity: newQuantity,
            subtotal: newQuantity * item.unit_price,
          }
        }
        return item
      }).filter((item) => item.quantity > 0)
    )
  }

  const addProduct = (product: NonNullable<typeof catalogProducts>[0]) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.id_product === product.id)
      if (existing) {
        return prev.map((item) =>
          item.id_product === product.id
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.unit_price }
            : item
        )
      }
      return [
        {
          id_product: product.id,
          name: product.name,
          quantity: 1,
          unit_price: product.price,
          subtotal: product.price,
        },
        ...prev,
      ]
    })
    setSearch("")
  }

  const submit = async () => {
    if (!props.transaction || !session) return
    if (items.length === 0) {
      toast.error("Keranjang kosong", { description: "Gunakan Void jika ingin membatalkan transaksi sepenuhnya." })
      return
    }
    setSubmitting(true)
    try {
      const response = await correctTransaction(session, props.transaction.offlineUuid || props.transaction.id, {
        reason,
        notes: notes.trim() ? notes.trim() : undefined,
        items: items.map(item => ({
          id_product: item.id_product,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal
        })),
        subtotal: currentSubtotal,
        total: currentTotal,
      })
      
      const newOfflineUuid = response.data?.data?.id_new_transaction || crypto.randomUUID()
      const newLocalTransaction: LocalTransaction = {
        ...props.transaction,
        id: crypto.randomUUID(),
        offlineUuid: newOfflineUuid,
        items: items.map(item => ({
          productId: item.id_product,
          name: item.name || item.id_product,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          subtotal: item.subtotal,
        })),
        subtotal: currentSubtotal,
        total: currentTotal,
        createdAt: new Date().toISOString(),
        syncStatus: "SYNCED",
        receivedAtBackend: new Date().toISOString(),
      }

      await applyRemoteCorrection(props.transaction.id, newLocalTransaction)

      toast.success("Koreksi berhasil disimpan", {
        description: "Transaksi asli di-VOID dan transaksi baru dibuat."
      })
      props.onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan koreksi")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Koreksi Transaksi</DialogTitle>
          <DialogDescription>
            Ubah rincian barang atau tambah barang baru ke dalam keranjang.
          </DialogDescription>
        </DialogHeader>
        {props.transaction && (
          <div className="grid gap-4">
            <div className="flex justify-between rounded-md bg-secondary p-3 text-xs">
              <span className="font-mono text-muted-foreground">
                {props.transaction.id}
              </span>
              <strong>{formatCurrency(currentTotal)}</strong>
            </div>

            <div className="relative">
              <IconSearch className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <input
                className="w-full rounded-md border bg-transparent py-2 pl-9 pr-4 text-sm outline-none focus:ring-[3px] focus:ring-ring/30"
                placeholder="Cari produk untuk ditambahkan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full z-10 mt-1 w-full rounded-md border bg-background p-1 shadow-md">
                  {searchResults.map((product) => (
                    <button
                      key={product.id}
                      className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-secondary"
                      onClick={() => addProduct(product)}
                    >
                      <span>{product.name}</span>
                      <span className="text-xs text-muted-foreground">{formatCurrency(product.price)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-2 max-h-48 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.id_product} className="flex items-center justify-between gap-3 text-sm border p-2 rounded-md">
                  <div className="grid flex-1">
                    <span className="font-medium line-clamp-1">{item.name}</span>
                    <span className="text-xs text-muted-foreground">{formatCurrency(item.unit_price)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-7"
                      onClick={() => updateQuantity(item.id_product, -1)}
                    >
                      {item.quantity === 1 ? <IconTrash className="size-3 text-destructive" /> : <IconMinus className="size-3" />}
                    </Button>
                    <span className="w-6 text-center tabular-nums">{item.quantity}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-7"
                      onClick={() => updateQuantity(item.id_product, 1)}
                    >
                      <IconPlus className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="text-center text-xs text-muted-foreground py-4">
                  Keranjang kosong.
                </div>
              )}
            </div>

            <label className="grid gap-1.5">
              <span className="text-xs font-medium">Alasan Koreksi (Wajib)</span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="min-h-12 rounded-md border bg-transparent p-2.5 text-sm outline-none focus:ring-[3px] focus:ring-ring/30"
                placeholder="Contoh: Salah input jumlah barang"
                disabled={submitting}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-medium">Catatan Tambahan (Opsional)</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="min-h-12 rounded-md border bg-transparent p-2.5 text-sm outline-none focus:ring-[3px] focus:ring-ring/30"
                placeholder="Contoh: Pembeli tukar barang ke produk A"
                disabled={submitting}
              />
            </label>
          </div>
        )}
        <DialogFooter className="flex flex-col sm:flex-row items-center gap-2 justify-end">
          {reason.length > 0 && reason.length < 10 && (
            <span className="text-[10px] text-destructive mr-auto flex-1">
              * Alasan wajib diisi minimal 10 karakter. (Saat ini: {reason.length} karakter)
            </span>
          )}
          <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)} disabled={submitting}>
            Batal
          </Button>
          <Button type="button" disabled={reason.length < 10 || items.length === 0 || submitting} onClick={() => void submit()}>
            Kirim Koreksi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function OpenDisputeDialog(props: {
  transaction: LocalTransaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const session = useCurrentSession()
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (props.open) setReason("")
  }, [props.open])

  const submit = async () => {
    if (!props.transaction || !session) return
    setSubmitting(true)
    try {
      await openReconciliation(session, {
        id_transaction: props.transaction.offlineUuid || props.transaction.id,
        reason,
      })
      toast.success("Kasus berhasil dibuka", {
        description: "Kasus rekonsiliasi pembayaran diteruskan ke Owner."
      })
      props.onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membuka kasus")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buka Kasus Pembayaran (Dispute)</DialogTitle>
          <DialogDescription>
            Buka kasus jika uang dari transaksi QRIS/Transfer belum masuk ke rekening.
          </DialogDescription>
        </DialogHeader>
        {props.transaction && (
          <div className="grid gap-3">
            <div className="flex justify-between rounded-md bg-secondary p-3 text-xs">
              <span className="font-mono text-muted-foreground">
                {props.transaction.id}
              </span>
              <strong>{formatCurrency(Number(props.transaction.total))}</strong>
            </div>
            <label className="grid gap-1.5">
              <span className="text-xs font-medium">Alasan Dispute (Wajib)</span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="min-h-20 rounded-md border bg-transparent p-2.5 text-sm outline-none focus:ring-[3px] focus:ring-ring/30"
                placeholder="Contoh: Pelanggan sudah bayar QRIS tapi dana belum masuk ke mutasi"
                disabled={submitting}
              />
            </label>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)} disabled={submitting}>
            Batal
          </Button>
          <Button variant="destructive" disabled={reason.length < 8 || submitting} onClick={() => void submit()}>
            Buka Kasus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

