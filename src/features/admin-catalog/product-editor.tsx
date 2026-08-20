import { useEffect, useState } from "react"
import type { BackendProduct as Product, ProductInput } from "@/features/admin-catalog/admin-catalog-api"
import { validateProductImage } from "@/features/admin-catalog/admin-catalog-api"
import { IconDeviceFloppy, IconPhoto, IconPlus, IconTrash } from "@tabler/icons-react"

import { Button } from "@/shared/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/components/card"
import { Input } from "@/shared/ui/components/input"

const emptyProduct: ProductInput = {
  sku: "",
  name: "",
  price: 0,
}

export function ProductEditor(props: {
  product: Product | null
  busy: boolean
  onCancelEdit: () => void
  onSave: (input: ProductInput, image?: File | null) => Promise<boolean>
}) {
  const [draft, setDraft] = useState<ProductInput>(emptyProduct)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    setDraft(
      props.product
        ? {
            sku: props.product.sku,
            name: props.product.name,
            price: Number(props.product.price),
          }
        : emptyProduct,
    )
    setImageFile(null)
    setImageError(null)
  }, [props.product])

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(imageFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  function field<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function pickImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    if (!file) {
      setImageFile(null)
      setImageError(null)
      return
    }
    const error = validateProductImage(file)
    if (error) {
      setImageFile(null)
      setImageError(error)
      return
    }
    setImageFile(file)
    setImageError(null)
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const saved = await props.onSave(draft, imageFile)
    if (saved && !props.product) {
      setDraft(emptyProduct)
      setImageFile(null)
      setImageError(null)
    }
  }

  return (
    <Card className="h-fit xl:sticky xl:top-[78px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {props.product ? (
            <IconDeviceFloppy className="size-4 text-primary" />
          ) : (
            <IconPlus className="size-4 text-primary" />
          )}
          {props.product ? "Edit produk" : "Produk baru"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3">
          <EditorField label="Gambar produk">
            <div className="flex items-center gap-3">
              <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-md border bg-secondary">
                {previewUrl ? (
                  <img src={previewUrl} alt="Pratinjau" className="size-full object-cover" />
                ) : props.product?.image_url ? (
                  <img
                    src={props.product.image_url}
                    alt=""
                    className="size-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <IconPhoto className="size-6 text-muted-foreground" stroke={1.5} />
                )}
              </div>
              <div className="grid gap-1.5">
                <label className="relative cursor-pointer">
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent">
                    {imageFile ? "Ganti gambar" : "Pilih gambar"}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={pickImage}
                    aria-label="Pilih gambar produk"
                  />
                </label>
                {imageFile && (
                  <button
                    type="button"
                    onClick={() => setImageFile(null)}
                    className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    <IconTrash className="size-3" /> Hapus pilihan
                  </button>
                )}
              </div>
            </div>
            {imageError && <p className="text-[10px] text-red-400">{imageError}</p>}
            <p className="text-[10px] text-muted-foreground">
              JPG, PNG, atau WebP — maksimal 5MB.
            </p>
          </EditorField>
          <EditorField label="SKU">
            <Input
              value={draft.sku}
              onChange={(event) => field("sku", event.target.value.toUpperCase())}
              required
            />
          </EditorField>
          <EditorField label="Nama produk">
            <Input
              value={draft.name}
              onChange={(event) => field("name", event.target.value)}
              required
            />
          </EditorField>
          <EditorField label="Harga (Rp)">
            <Input
              type="number"
              min={0}
              step={1}
              value={draft.price}
              onChange={(event) => field("price", Number(event.target.value))}
              required
            />
          </EditorField>
          <p className="text-[10px] leading-4 text-muted-foreground">
            Stok tidak dapat diubah di sini. Gunakan inventory reconciliation agar koreksi tercatat
            di audit trail.
          </p>
          <div className="flex gap-2">
            {props.product && (
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={props.onCancelEdit}
              >
                Batal
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={props.busy}>
              <IconDeviceFloppy /> {props.busy ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function EditorField(props: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium">{props.label}</span>
      {props.children}
    </label>
  )
}