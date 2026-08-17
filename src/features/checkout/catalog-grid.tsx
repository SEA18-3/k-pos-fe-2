import { IconSearch } from "@tabler/icons-react"

import { ProductThumbnail } from "@/features/catalog/product-thumbnail"
import type { CatalogCategory } from "@/features/checkout/catalog-filter"
import type { Product } from "@/infrastructure/persistence/models"
import { formatCurrency } from "@/shared/lib/format"
import { cn } from "@/shared/lib/utils"
import { Input } from "@/shared/ui/components/input"

type CatalogGridProps = {
  products: Product[]
  cart: Record<string, number>
  category: CatalogCategory
  query: string
  onCategoryChange: (category: CatalogCategory) => void
  onQueryChange: (query: string) => void
  onAdd: (productId: string) => void
}

export function CatalogGrid(props: CatalogGridProps) {
  const catalogCategories = ["Semua", ...new Set(props.products.map((product) => product.category))]
  const filtered = props.products.filter(
    (product) =>
      (props.category === "Semua" || product.category === props.category) &&
      `${product.name} ${product.sku}`.toLowerCase().includes(props.query.toLowerCase()),
  )
  return (
    <>
      <div className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:px-6">
        <div className="flex flex-1 gap-1 overflow-x-auto">
          {catalogCategories.map((category) => (
            <button
              key={category}
              onClick={() => props.onCategoryChange(category)}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                props.category === category && "bg-secondary text-foreground",
              )}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <IconSearch className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={props.query}
            onChange={(event) => props.onQueryChange(event.target.value)}
            className="pl-8"
            placeholder="Cari produk atau SKU…"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 sm:p-6 lg:grid-cols-4 2xl:grid-cols-5">
        {filtered.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            quantity={props.cart[product.id] ?? 0}
            onAdd={() => props.onAdd(product.id)}
          />
        ))}
      </div>
    </>
  )
}

function ProductCard({
  product,
  quantity,
  onAdd,
}: {
  product: Product
  quantity: number
  onAdd: () => void
}) {
  return (
    <button
      onClick={onAdd}
      className="group grid min-w-0 gap-2 rounded-lg border bg-card p-2 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent/55"
    >
      <div className="relative h-28 overflow-hidden rounded-md border bg-secondary">
        <ProductThumbnail product={product} className="size-full" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/75 to-transparent" />
        <span className="absolute bottom-2 left-2 text-[9px] font-bold tracking-[0.18em] text-white/70">
          {product.sku}
        </span>
        {quantity > 0 && (
          <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {quantity}
          </span>
        )}
      </div>
      <div className="min-w-0 px-1 pb-1">
        <div className="truncate text-xs font-semibold">{product.name}</div>
        <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
          {product.description}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs font-semibold tabular-nums">
            {formatCurrency(product.price)}
          </span>
          <span className={cn("text-[9px]", product.stock <= 5 && "text-amber-300")}>
            {product.stock} ready
          </span>
        </div>
      </div>
    </button>
  )
}
