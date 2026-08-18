import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { CatalogGrid } from "./catalog-grid"
import type { Product } from "@/infrastructure/persistence/models"

const sampleProducts: Product[] = [
  {
    id: "p1",
    name: "Espresso Single",
    description: "Rich espresso",
    sku: "ESP-01",
    category: "Coffee",
    price: 15000,
    stock: 50,
    accent: "#6d28d9",
    updatedAt: "2026-08-18T00:00:00Z",
  },
  {
    id: "p2",
    name: "Matcha Latte",
    description: "Creamy matcha",
    sku: "MTC-02",
    category: "Non-Coffee",
    price: 22000,
    stock: 20,
    accent: "#059669",
    updatedAt: "2026-08-18T00:00:00Z",
  },
  {
    id: "p3",
    name: "Butter Croissant",
    description: "Flaky pastry",
    sku: "BCR-03",
    category: "Pastry",
    price: 18000,
    stock: 3, // Low stock <= 5
    accent: "#d97706",
    updatedAt: "2026-08-18T00:00:00Z",
  },
]

describe("CatalogGrid Component", () => {
  it("renders product cards, low stock warnings, and category list", () => {
    render(
      <CatalogGrid
        products={sampleProducts}
        cart={{ p1: 2 }}
        category="Semua"
        query=""
        onCategoryChange={vi.fn()}
        onQueryChange={vi.fn()}
        onAdd={vi.fn()}
      />,
    )

    expect(screen.getByText("Espresso Single")).toBeInTheDocument()
    expect(screen.getByText("Matcha Latte")).toBeInTheDocument()
    expect(screen.getByText("Butter Croissant")).toBeInTheDocument()

    // Categories
    expect(screen.getByRole("button", { name: "Semua" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Coffee" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Non-Coffee" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Pastry" })).toBeInTheDocument()

    // Low stock warning (stock 3)
    expect(screen.getByText("3 ready")).toBeInTheDocument()

    // Cart badge for p1 (qty: 2)
    expect(screen.getByText("2")).toBeInTheDocument()
  })

  it("filters displayed products by search query", () => {
    render(
      <CatalogGrid
        products={sampleProducts}
        cart={{}}
        category="Semua"
        query="matcha"
        onCategoryChange={vi.fn()}
        onQueryChange={vi.fn()}
        onAdd={vi.fn()}
      />,
    )

    expect(screen.getByText("Matcha Latte")).toBeInTheDocument()
    expect(screen.queryByText("Espresso Single")).not.toBeInTheDocument()
    expect(screen.queryByText("Butter Croissant")).not.toBeInTheDocument()
  })

  it("filters displayed products by category", () => {
    render(
      <CatalogGrid
        products={sampleProducts}
        cart={{}}
        category="Pastry"
        query=""
        onCategoryChange={vi.fn()}
        onQueryChange={vi.fn()}
        onAdd={vi.fn()}
      />,
    )

    expect(screen.getByText("Butter Croissant")).toBeInTheDocument()
    expect(screen.queryByText("Espresso Single")).not.toBeInTheDocument()
    expect(screen.queryByText("Matcha Latte")).not.toBeInTheDocument()
  })

  it("triggers onAdd when a product card is clicked", async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()

    render(
      <CatalogGrid
        products={sampleProducts}
        cart={{}}
        category="Semua"
        query=""
        onCategoryChange={vi.fn()}
        onQueryChange={vi.fn()}
        onAdd={onAdd}
      />,
    )

    const productCard = screen.getByText("Espresso Single").closest("button")
    if (productCard) {
      await user.click(productCard)
      expect(onAdd).toHaveBeenCalledWith("p1")
    }
  })
})
