import { useEffect, useState } from "react"
import type { Product, ProductInput } from "@operator/contracts"
import { IconDeviceFloppy, IconPlus } from "@tabler/icons-react"

import { Button } from "@/shared/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/components/card"
import { Input } from "@/shared/ui/components/input"

const emptyProduct: ProductInput = {
  sku: "",
  name: "",
  description: "",
  category: "Kopi",
  price: 0,
  lowStockThreshold: 5,
  accent: "#06b6d4",
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
            description: props.product.description,
            category: props.product.category,
            price: props.product.price,
            lowStockThreshold: props.product.lowStockThreshold,
            accent: props.product.accent,
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
          <EditorField label="Deskripsi">
            <Input
              value={draft.description}
              onChange={(event) => field("description", event.target.value)}
            />
          </EditorField>
          <div className="grid grid-cols-2 gap-2">
            <EditorField label="Kategori">
              <Input
                value={draft.category}
                onChange={(event) => field("category", event.target.value)}
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
          </div>
          <div className="grid grid-cols-2 gap-2">
            <EditorField label="Batas stok rendah">
              <Input
                type="number"
                min={0}
                step={1}
                value={draft.lowStockThreshold}
                onChange={(event) => field("lowStockThreshold", Number(event.target.value))}
                required
              />
            </EditorField>
            <EditorField label="Warna aksen">
              <Input
                type="color"
                value={draft.accent}
                onChange={(event) => field("accent", event.target.value)}
              />
            </EditorField>
          </div>
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
