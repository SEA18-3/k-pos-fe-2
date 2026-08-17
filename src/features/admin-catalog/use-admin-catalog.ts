import { useCallback, useEffect, useState } from "react"
import type { Product, ProductInput, ProductPatch } from "@operator/contracts"
import { toast } from "sonner"

import {
  createAdminProduct,
  fetchAdminProducts,
  setAdminProductArchived,
  updateAdminProduct,
} from "@/features/admin-catalog/admin-catalog-api"
import { useCurrentSession } from "@/features/auth/session-queries"

export function useAdminCatalog() {
  const session = useCurrentSession()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [mutatingId, setMutatingId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!session) return
    setLoading(true)
    try {
      setProducts((await fetchAdminProducts(session)).products)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Katalog Admin gagal dimuat")
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => void refresh(), [refresh])

  async function run(id: string, action: () => Promise<{ product: Product }>, message: string) {
    setMutatingId(id)
    try {
      const { product } = await action()
      setProducts((current) => upsertProduct(current, product))
      toast.success(message)
      return product
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Produk gagal disimpan")
      return null
    } finally {
      setMutatingId(null)
    }
  }

  return {
    products,
    loading,
    mutatingId,
    refresh,
    create: (input: ProductInput) =>
      session
        ? run("create", () => createAdminProduct(session, input), "Produk dibuat")
        : Promise.resolve(null),
    update: (productId: string, patch: ProductPatch) =>
      session
        ? run(productId, () => updateAdminProduct(session, productId, patch), "Produk diperbarui")
        : Promise.resolve(null),
    setArchived: (product: Product, archived: boolean) =>
      session
        ? run(
            product.id,
            () => setAdminProductArchived(session, product.id, archived),
            archived ? "Produk diarsipkan" : "Produk dipulihkan",
          )
        : Promise.resolve(null),
  }
}

function upsertProduct(products: Product[], product: Product) {
  const next = products.filter((item) => item.id !== product.id)
  next.push(product)
  return next.sort((left, right) => left.name.localeCompare(right.name))
}
