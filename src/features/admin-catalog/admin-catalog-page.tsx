import { useMemo, useState } from "react"
import type { Product, ProductInput } from "@operator/contracts"
import { IconRefresh, IconSearch } from "@tabler/icons-react"

import { ProductAdminList } from "@/features/admin-catalog/product-admin-list"
import { ProductEditor } from "@/features/admin-catalog/product-editor"
import { useAdminCatalog } from "@/features/admin-catalog/use-admin-catalog"
import { Button } from "@/shared/ui/components/button"
import { Input } from "@/shared/ui/components/input"
import { PageHeader } from "@/shared/ui/page-header"

export function AdminCatalogPage() {
  const catalog = useAdminCatalog()
  const [editing, setEditing] = useState<Product | null>(null)
  const [query, setQuery] = useState("")
  const products = useMemo(
    () =>
      catalog.products.filter((product) =>
        `${product.name} ${product.sku} ${product.category}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [catalog.products, query],
  )

  async function save(input: ProductInput) {
    if (editing) {
      const updated = await catalog.update(editing.id, input)
      if (updated) setEditing(null)
      return Boolean(updated)
    }
    return Boolean(await catalog.create(input))
  }

  return (
    <div>
      <PageHeader
        title="Katalog & harga"
        description="Perubahan berlaku pada refresh berikutnya; transaksi offline lama tetap membawa snapshot harga historis."
        actions={
          <Button
            variant="outline"
            disabled={catalog.loading}
            onClick={() => void catalog.refresh()}
          >
            <IconRefresh /> Refresh
          </Button>
        }
      />
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
      <div className="grid gap-4 p-4 sm:p-6 xl:grid-cols-[330px_minmax(0,1fr)]">
        <ProductEditor
          product={editing}
          busy={catalog.mutatingId === (editing?.id ?? "create")}
          onCancelEdit={() => setEditing(null)}
          onSave={save}
        />
        <ProductAdminList
          products={products}
          mutatingId={catalog.mutatingId}
          onEdit={setEditing}
          onArchivedChange={catalog.setArchived}
        />
      </div>
    </div>
  )
}
