import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { BackendProduct as Product, ProductInput } from "./admin-catalog-api"
import { ProductEditor } from "./product-editor"

const product: Product = {
  id_product: "prod-1",
  id_merchant: "M-001",
  name: "Mie Goreng",
  sku: "MG-001",
  price: "15000",
  image_url: "https://abc.supabase.co/storage/v1/object/public/products/m1/p1.png",
  is_active: true,
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-01T00:00:00.000Z",
}

describe("ProductEditor", () => {
  beforeEach(() => {
    // jsdom does not implement the object URL API; provide minimal stubs.
    // Assigned (not spyOn) because the methods do not exist in jsdom at all.
    URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-preview") as unknown as typeof URL.createObjectURL
    URL.revokeObjectURL = vi.fn() as unknown as typeof URL.revokeObjectURL
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function validPngFile(name = "produk.png") {
    return new File(["data"], name, { type: "image/png" })
  }

  function renderEditor(overrides: Partial<Parameters<typeof ProductEditor>[0]> = {}) {
    const onSave = vi.fn().mockResolvedValue(true)
    const utils = render(
      <ProductEditor
        product={null}
        busy={false}
        onCancelEdit={vi.fn()}
        onSave={onSave}
        {...overrides}
      />,
    )
    return { onSave, ...utils }
  }

  async function fillTextFields(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText("SKU"), "MG-001")
    await user.type(screen.getByLabelText("Nama produk"), "Mie Goreng")
    await user.type(screen.getByLabelText("Harga (Rp)"), "15000")
  }

  it("previews the selected image before submit", async () => {
    const user = userEvent.setup()
    const { container } = renderEditor()

    await user.upload(screen.getByLabelText("Pilih gambar produk"), validPngFile())

    const preview = container.querySelector("img")
    expect(preview).toBeInTheDocument()
    expect(preview).toHaveAttribute("src", "blob:mock-preview")
  })

  it("rejects a non-image file with a client-side error", () => {
    renderEditor()

    // user-event filters files against the input's accept attribute, so fire the
    // change event directly to exercise the pickImage validation path.
    fireEvent.change(screen.getByLabelText("Pilih gambar produk"), {
      target: { files: [new File(["x"], "a.pdf", { type: "application/pdf" })] },
    })

    expect(screen.getByText(/Format gambar tidak didukung/)).toBeInTheDocument()
  })

  it("rejects an image over 5MB", async () => {
    const user = userEvent.setup()
    renderEditor()

    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.png", { type: "image/png" })
    await user.upload(screen.getByLabelText("Pilih gambar produk"), big)

    expect(screen.getByText(/Ukuran gambar maksimal/)).toBeInTheDocument()
  })

  it("submits without an image (image stays optional)", async () => {
    const user = userEvent.setup()
    const { onSave } = renderEditor()

    await fillTextFields(user)
    await user.click(screen.getByRole("button", { name: /Simpan/ }))

    expect(onSave).toHaveBeenCalledTimes(1)
    const [input, image] = onSave.mock.calls[0]
    expect(image).toBeNull()
    expect(input).toMatchObject<Partial<ProductInput>>({ sku: "MG-001", name: "Mie Goreng", price: 15000 })
  })

  it("submits the selected file alongside the text fields", async () => {
    const user = userEvent.setup()
    const { onSave } = renderEditor()

    const file = validPngFile()
    await user.upload(screen.getByLabelText("Pilih gambar produk"), file)
    await fillTextFields(user)
    await user.click(screen.getByRole("button", { name: /Simpan/ }))

    expect(onSave.mock.calls[0][1]).toBe(file)
  })

  it("shows the existing image when editing a product that has one", () => {
    const { container } = renderEditor({ product })

    expect(container.querySelector("img")).toHaveAttribute("src", product.image_url)
  })

  it("does not leak image_url into the submitted payload", async () => {
    const user = userEvent.setup()
    const { onSave } = renderEditor({ product })

    await user.click(screen.getByRole("button", { name: /Simpan/ }))

    const [input] = onSave.mock.calls[0]
    expect("image_url" in (input as Record<string, unknown>)).toBe(false)
  })
})