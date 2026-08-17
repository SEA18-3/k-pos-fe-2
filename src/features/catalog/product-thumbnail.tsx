import { IconCoffee, IconGlass, IconShoppingBag } from "@tabler/icons-react"

import { cn } from "@/shared/lib/utils"

type ProductThumbnailData = {
  sku: string
  name: string
  category: string
  accent: string
}

const imageBySku: Readonly<Record<string, string>> = {
  "DRK-001": "/products/kopi-susu-aren.png",
  "DRK-002": "/products/iced-americano.png",
  "DRK-003": "/products/caramel-latte.png",
  "DRK-004": "/products/matcha-cloud.png",
  "DRK-005": "/products/choco-sea-salt.png",
  "DRK-006": "/products/yuzu-sparkling.png",
  "FOD-001": "/products/nasi-ayam-matah.png",
  "FOD-002": "/products/aren-croffle.png",
}

export function ProductThumbnail({
  product,
  className,
}: {
  product: ProductThumbnailData
  className?: string
}) {
  const image = imageBySku[product.sku]
  const Icon =
    product.category === "Kopi"
      ? IconCoffee
      : product.category === "Makanan"
        ? IconShoppingBag
        : IconGlass

  return (
    <div
      className={cn("grid place-items-center overflow-hidden bg-secondary", className)}
      style={{
        background: `linear-gradient(145deg, color-mix(in srgb, ${product.accent} 16%, #18181b), #151517)`,
      }}
    >
      {image ? (
        <img
          src={image}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.025]"
        />
      ) : (
        <Icon className="size-1/3" style={{ color: product.accent }} stroke={1.5} />
      )}
    </div>
  )
}
