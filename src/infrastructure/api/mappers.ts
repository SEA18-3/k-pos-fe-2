import type { Product } from "@/infrastructure/persistence/models"

export type BackendProduct = {
  id_product: string
  id_merchant: string
  name: string
  sku: string
  price: string
  image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export function decimalToNumber(value: string): number {
  return parseFloat(value)
}

export function snakeToCamel(value: string): string {
  return value.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase())
}

export function mapProduct(backend: BackendProduct): Product {
  return {
    id: backend.id_product,
    sku: backend.sku,
    name: backend.name,
    description: "",
    category: "",
    price: decimalToNumber(backend.price),
    stock: 0,
    accent: "#64748b",
    featured: false,
    active: backend.is_active,
    lowStockThreshold: 0,
    updatedAt: backend.updated_at,
    imageUrl: backend.image_url ?? undefined,
  }
}
