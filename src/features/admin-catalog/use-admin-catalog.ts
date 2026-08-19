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

  async function run(id: string, action: () => Promise<any>, message: string) {
    setMutatingId(id)
    try {
      const result = await action()
      if ("name" in result.data) {
        const product = result.data as Product
        setProducts((current) => upsertProduct(current, product))
        toast.success(message)
        return product
      } else if ("current_stock" in result.data) {
        const stockData = result.data as { id_product: string; current_stock: number }
        setProducts((current) =>
          current.map((p) =>
            p.id_product === stockData.id_product
              ? {
                  ...p,
                  inventory: p.inventory
                    ? { ...p.inventory, current_stock: stockData.current_stock }
                    : {
                        id_inventory: "",
                        id_product: p.id_product,
                        id_merchant: "",
                        current_stock: stockData.current_stock,
                        reserved: 0,
                        last_updated: new Date().toISOString(),
                      },
                }
              : p,
          ),
        )
        toast.success(message)
        return null
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
    create: (input: ProductInput, image?: File | null) =>
      session
        ? run("create", () => createAdminProduct(session, input, image), "Produk dibuat")
        : Promise.resolve(null),
    update: (productId: string, patch: ProductPatch, image?: File | null) =>
      session
        ? run(productId, () => updateAdminProduct(session, productId, patch, image), "Produk diperbarui")
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
