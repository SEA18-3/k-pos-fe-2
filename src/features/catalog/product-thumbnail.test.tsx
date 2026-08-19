import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ProductThumbnail } from "./product-thumbnail"

describe("ProductThumbnail", () => {
  it("renders imageUrl when present", () => {
    const { container } = render(
      <ProductThumbnail
        product={{
          sku: "CST-99",
          name: "Custom",
          category: "Kopi",
          accent: "#06b6d4",
          imageUrl: "https://abc.supabase.co/storage/v1/object/public/products/m1/p1.png",
        }}
      />,
    )

    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "https://abc.supabase.co/storage/v1/object/public/products/m1/p1.png",
    )
  })

  it("falls back to the static SKU image when imageUrl is empty", () => {
    const { container } = render(
      <ProductThumbnail
        product={{ sku: "DRK-001", name: "Kopi Susu Aren", category: "Kopi", accent: "#06b6d4" }}
      />,
    )

    expect(container.querySelector("img")).toHaveAttribute("src", "/products/kopi-susu-aren.png")
  })

  it("falls back to an icon when neither imageUrl nor a static image exists", () => {
    const { container } = render(
      <ProductThumbnail
        product={{ sku: "NOPE-1", name: "Tanpa gambar", category: "Lainnya", accent: "#64748b" }}
      />,
    )

    expect(container.querySelector("img")).not.toBeInTheDocument()
    expect(container.querySelector("svg")).toBeInTheDocument()
  })
})