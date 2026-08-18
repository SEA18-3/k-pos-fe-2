import type { BackendProduct as Product } from "@/features/admin-catalog/admin-catalog-api"
import { IconArchive, IconEdit, IconRestore } from "@tabler/icons-react"

import { ProductThumbnail } from "@/features/catalog/product-thumbnail"
import { formatCurrency } from "@/shared/lib/format"
import { Badge } from "@/shared/ui/components/badge"
import { Button } from "@/shared/ui/components/button"
import { Card } from "@/shared/ui/components/card"

export function ProductAdminList(props: {
  products: Product[]
  mutatingId: string | null
  onEdit: (product: Product) => void
  onArchivedChange: (product: Product, archived: boolean) => Promise<unknown>
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {props.products.map((product) => (
        <Card
          key={product.id_product}
          data-testid={`product-${product.sku}`}
          className={!product.is_active ? "opacity-55" : undefined}
        >
          <div className="flex gap-3 p-3">
            <ProductThumbnail
              product={
                {
                  id: product.id_product,
                  sku: product.sku,
                  name: product.name,
                  price: Number(product.price),
                  stock: product.inventory?.current_stock ?? 0,
                  accent: "#06b6d4",
                  category: "Umum",
                  active: product.is_active,
                } as any
              }
              className="size-10 shrink-0 rounded-md border"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-xs font-semibold">{product.name}</span>
                {!product.is_active && <Badge>Archived</Badge>}
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                {product.sku}
              </div>
              <div className="mt-2 text-sm font-semibold">{formatCurrency(Number(product.price))}</div>
              <div className="mt-1 text-[9px] text-muted-foreground">
                Stok proyeksi {product.inventory?.current_stock ?? 0}
              </div>
            </div>
          </div>
          <div className="flex gap-1.5 border-t p-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={props.mutatingId === product.id_product}
              onClick={() => props.onEdit(product)}
            >
              <IconEdit /> Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              disabled={props.mutatingId === product.id_product}
              onClick={() => void props.onArchivedChange(product, product.is_active)}
            >
              {product.is_active ? <IconArchive /> : <IconRestore />}{" "}
              {product.is_active ? "Arsipkan" : "Pulihkan"}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
