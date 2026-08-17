import { useState } from "react"
import { IconAlertTriangle, IconBox, IconSearch } from "@tabler/icons-react"
import { toast } from "sonner"

import { PageHeader } from "@/shared/ui/page-header"
import { Badge } from "@/shared/ui/components/badge"
import { Button } from "@/shared/ui/components/button"
import { Card } from "@/shared/ui/components/card"
import { Input } from "@/shared/ui/components/input"
import { useCatalogProducts } from "@/features/catalog/catalog-queries"
import { refreshActiveCatalog } from "@/features/catalog/catalog-refresh"
import { ProductThumbnail } from "@/features/catalog/product-thumbnail"
import { formatCurrency } from "@/shared/lib/format"
import { cn } from "@/shared/lib/utils"

export function ProductsPage() {
  const products = useCatalogProducts()
  const [query, setQuery] = useState("")
  const [refreshing, setRefreshing] = useState(false)
  const filtered = products.filter((product) =>
    `${product.name} ${product.sku} ${product.category}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  )
  const lowStock = products.filter((product) => product.stock <= 5).length

  async function refresh() {
    setRefreshing(true)
    try {
      const refreshed = await refreshActiveCatalog()
      if (refreshed) toast.success("Katalog lokal diperbarui")
      else toast.error("Login online diperlukan untuk refresh katalog")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Katalog gagal diperbarui")
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Produk & stok lokal"
        description="Katalog ini tersimpan di perangkat dan tetap dapat dibaca tanpa jaringan. Stok adalah proyeksi eventual, bukan reservasi real-time."
        actions={
          <Button variant="outline" disabled={refreshing} onClick={() => void refresh()}>
            {refreshing ? "Menarik katalog…" : "Tarik katalog terbaru"}
          </Button>
        }
      />
      <div className="grid gap-px border-b bg-border sm:grid-cols-3">
        <div className="bg-background px-4 py-3 sm:px-6">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Produk aktif
          </div>
          <div className="mt-1 text-lg font-semibold">{products.length}</div>
        </div>
        <div className="bg-background px-4 py-3 sm:px-6">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Stok menipis
          </div>
          <div
            className={cn(
              "mt-1 flex items-center gap-2 text-lg font-semibold",
              lowStock > 0 && "text-amber-300",
            )}
          >
            <IconAlertTriangle className="size-4" /> {lowStock}
          </div>
        </div>
        <div className="bg-background px-4 py-3 sm:px-6">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Snapshot tersimpan
          </div>
          <div className="mt-1 text-xs font-semibold text-emerald-400">Siap offline</div>
        </div>
      </div>
      <div className="border-b px-4 py-3 sm:px-6">
        <div className="relative max-w-sm">
          <IconSearch className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari produk, SKU, kategori…"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
        {filtered.map((product) => (
          <Card key={product.id} className="flex items-center gap-3 p-3">
            <ProductThumbnail product={product} className="size-12 shrink-0 rounded-md border" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="truncate text-xs font-semibold">{product.name}</div>
                {product.stock <= 5 && <Badge variant="warning">Low</Badge>}
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">
                {product.sku} · {product.category}
              </div>
              <div className="mt-2 text-xs font-semibold tabular-nums">
                {formatCurrency(product.price)}
              </div>
            </div>
            <div className="text-right">
              <div
                className={cn(
                  "text-lg font-semibold tabular-nums",
                  product.stock <= 5 && "text-amber-300",
                )}
              >
                {product.stock}
              </div>
              <div className="text-[9px] text-muted-foreground">stok lokal</div>
            </div>
          </Card>
        ))}
      </div>
      <div className="mx-4 mb-6 flex items-start gap-2 rounded-lg border border-dashed p-3 text-[10px] leading-4 text-muted-foreground sm:mx-6">
        <IconBox className="mt-0.5 size-4 shrink-0 text-primary" />
        <span>
          <strong className="text-foreground">Kenapa tidak diblokir saat stok nol?</strong> Beberapa
          kasir dapat menjual offline bersamaan. Penjualan historis tetap diterima; proyeksi negatif
          ditandai sebagai discrepancy untuk rekonsiliasi admin.
        </span>
      </div>
    </div>
  )
}
