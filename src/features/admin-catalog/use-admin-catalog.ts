import { useCallback, useEffect, useState } from "react"
import type { BackendProduct as Product, ProductInput, ProductPatch } from "@/features/admin-catalog/admin-catalog-api"
import { toast } from "sonner"

import {
  adjustAdminProductStock,
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
      const response = await fetchAdminProducts(session)
      setProducts(response.data.items)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Katalog Admin gagal dimuat")
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => void refresh(), [refresh])

  async function run(id: string, action: () => Promise<{ data: Product } | { data: { id_product: string; is_active: boolean } }>, message: string) {
    setMutatingId(id)
    try {
      const result = await action()
      // Jika action adalah archive, result.data hanya berisi id_product & is_active
      if ("name" in result.data) {
        const product = result.data as Product
        setProducts((current) => upsertProduct(current, product))
        toast.success(message)
        return product
      } else {
        // Ini soft delete archive
        const partial = result.data as { id_product: string; is_active: boolean }
        setProducts((current) => current.map((p) => p.id_product === partial.id_product ? { ...p, is_active: partial.is_active } : p))
        toast.success(message)
        return null
      }
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
            product.id_product,
            () => setAdminProductArchived(session, product.id_product, archived) as any,
            archived ? "Produk diarsipkan" : "Produk dipulihkan",
          )
        : Promise.resolve(null),
    adjustStock: (id: string, quantity: number, notes?: string) =>
      session
        ? run(
            id,
            () => adjustAdminProductStock(session, id, quantity, notes) as any,
            "Stok berhasil disesuaikan",
          )
        : Promise.resolve(null),
  }
}

function upsertProduct(products: Product[], product: Product) {
  const next = products.filter((item) => item.id_product !== product.id_product)
  next.push(product)
  return next.sort((left, right) => left.name.localeCompare(right.name))
}
