import { useEffect, useState } from "react"
import type { BackendProduct as Product, ProductInput } from "@/features/admin-catalog/admin-catalog-api"
import { IconDeviceFloppy, IconPlus } from "@tabler/icons-react"

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
  onSave: (input: ProductInput) => Promise<boolean>
}) {
  const [draft, setDraft] = useState<ProductInput>(emptyProduct)

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
  }, [props.product])

  function field<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const saved = await props.onSave(draft)
    if (saved && !props.product) setDraft(emptyProduct)
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
          <EditorField label="Gambar Produk">
            <Input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0]
                field("image", file ?? null)
              }}
            />
            {props.product?.image_url && !draft.image && (
              <div className="text-[10px] text-muted-foreground mt-1">
                Gambar saat ini sudah tersimpan. Unggah baru untuk mengganti.
              </div>
            )}
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
