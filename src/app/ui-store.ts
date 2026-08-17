import { create } from "zustand"

import type { ConnectionState } from "@/infrastructure/persistence/models"

type UiState = {
  connection: ConnectionState
  cart: Record<string, number>
  forcedOffline: boolean
  setConnection: (connection: ConnectionState) => void
  setForcedOffline: (forcedOffline: boolean) => void
  hydrateCart: (cart: Record<string, number>) => void
  addItem: (productId: string) => void
  decrementItem: (productId: string) => void
  removeItem: (productId: string) => void
  clearCart: () => void
}

export const useUiStore = create<UiState>((set) => ({
  connection: navigator.onLine ? "ONLINE" : "OFFLINE",
  cart: {},
  forcedOffline: false,
  setConnection: (connection) => set({ connection }),
  setForcedOffline: (forcedOffline) => set({ forcedOffline }),
  hydrateCart: (cart) => set({ cart }),
  addItem: (productId) =>
    set((state) => ({
      cart: { ...state.cart, [productId]: (state.cart[productId] ?? 0) + 1 },
    })),
  decrementItem: (productId) =>
    set((state) => {
      const cart = { ...state.cart }
      const quantity = (cart[productId] ?? 0) - 1
      if (quantity <= 0) delete cart[productId]
      else cart[productId] = quantity
      return { cart }
    }),
  removeItem: (productId) =>
    set((state) => {
      const cart = { ...state.cart }
      delete cart[productId]
      return { cart }
    }),
  clearCart: () => set({ cart: {} }),
}))
