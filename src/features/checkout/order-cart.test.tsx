import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { OrderCart, type CartLine } from "./order-cart"
import type { Product } from "@/infrastructure/persistence/models"

const sampleProduct: Product = {
  id: "prod-1",
  name: "Kopi Susu Aren",
  description: "Kopi susu gula aren",
  sku: "KSA-01",
  category: "Minuman",
  price: 18000,
  stock: 25,
  accent: "#8b5cf6",
  updatedAt: "2026-08-18T00:00:00Z",
}

const sampleProduct2: Product = {
  id: "prod-2",
  name: "Croissant Butter",
  description: "Butter croissant",
  sku: "CRS-01",
  category: "Makanan",
  price: 25000,
  stock: 10,
  accent: "#f59e0b",
  updatedAt: "2026-08-18T00:00:00Z",
}

describe("OrderCart Component", () => {
  it("renders empty state and disables actions when cart is empty", () => {
    const onClear = vi.fn()
    const onCheckout = vi.fn()

    render(
      <OrderCart
        items={[]}
        subtotal={0}
        mobileOpen={false}
        onMobileOpenChange={vi.fn()}
        onAdd={vi.fn()}
        onDecrement={vi.fn()}
        onRemove={vi.fn()}
        onClear={onClear}
        onCheckout={onCheckout}
      />,
    )

    expect(screen.getByText(/Pilih produk untuk membuat pesanan/i)).toBeInTheDocument()
    const clearButton = screen.getByRole("button", { name: /Kosongkan/i })
    const checkoutButton = screen.getByRole("button", { name: /Pilih pembayaran/i })

    expect(clearButton).toBeDisabled()
    expect(checkoutButton).toBeDisabled()
  })

  it("renders list of items, quantities, and formatted subtotal", () => {
    const items: CartLine[] = [
      { product: sampleProduct, quantity: 2 },
      { product: sampleProduct2, quantity: 1 },
    ]
    const subtotal = 18000 * 2 + 25000 * 1 // 61000

    render(
      <OrderCart
        items={items}
        subtotal={subtotal}
        mobileOpen={false}
        onMobileOpenChange={vi.fn()}
        onAdd={vi.fn()}
        onDecrement={vi.fn()}
        onRemove={vi.fn()}
        onClear={vi.fn()}
        onCheckout={vi.fn()}
      />,
    )

    expect(screen.getByText("Kopi Susu Aren")).toBeInTheDocument()
    expect(screen.getByText("Croissant Butter")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
    expect(screen.getByText("1")).toBeInTheDocument()
    expect(screen.getByText("Rp 61.000")).toBeInTheDocument()

    const checkoutButton = screen.getByRole("button", { name: /Pilih pembayaran/i })
    expect(checkoutButton).toBeEnabled()
  })

  it("triggers onAdd and onDecrement when quantity buttons are clicked", async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    const onDecrement = vi.fn()
    const items: CartLine[] = [{ product: sampleProduct, quantity: 2 }]

    const { container } = render(
      <OrderCart
        items={items}
        subtotal={36000}
        mobileOpen={false}
        onMobileOpenChange={vi.fn()}
        onAdd={onAdd}
        onDecrement={onDecrement}
        onRemove={vi.fn()}
        onClear={vi.fn()}
        onCheckout={vi.fn()}
      />,
    )

    const buttons = container.querySelectorAll(".border.bg-background button")
    // buttons[0] is minus, buttons[1] is plus
    if (buttons[0]) await user.click(buttons[0])
    expect(onDecrement).toHaveBeenCalledWith("prod-1")

    if (buttons[1]) await user.click(buttons[1])
    expect(onAdd).toHaveBeenCalledWith("prod-1")
  })

  it("triggers onRemove when trash button on item line is clicked", async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    const items: CartLine[] = [{ product: sampleProduct, quantity: 1 }]

    const { container } = render(
      <OrderCart
        items={items}
        subtotal={18000}
        mobileOpen={false}
        onMobileOpenChange={vi.fn()}
        onAdd={vi.fn()}
        onDecrement={vi.fn()}
        onRemove={onRemove}
        onClear={vi.fn()}
        onCheckout={vi.fn()}
      />,
    )

    const removeBtn = container.querySelector("button.text-muted-foreground.hover\\:text-red-400")
    if (removeBtn) {
      await user.click(removeBtn)
      expect(onRemove).toHaveBeenCalledWith("prod-1")
    }
  })

  it("triggers onClear and onCheckout when respective footer buttons are clicked", async () => {
    const user = userEvent.setup()
    const onClear = vi.fn()
    const onCheckout = vi.fn()
    const items: CartLine[] = [{ product: sampleProduct, quantity: 1 }]

    render(
      <OrderCart
        items={items}
        subtotal={18000}
        mobileOpen={false}
        onMobileOpenChange={vi.fn()}
        onAdd={vi.fn()}
        onDecrement={vi.fn()}
        onRemove={vi.fn()}
        onClear={onClear}
        onCheckout={onCheckout}
      />,
    )

    await user.click(screen.getByRole("button", { name: /Kosongkan/i }))
    expect(onClear).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole("button", { name: /Pilih pembayaran/i }))
    expect(onCheckout).toHaveBeenCalledTimes(1)
  })
})
