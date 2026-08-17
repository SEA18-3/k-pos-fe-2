import { useEffect } from "react"

import { useUiStore } from "@/app/ui-store"
import { draftPersistence } from "@/infrastructure/persistence/draft-repository"

export function useCartDraftLifecycle(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    return useUiStore.subscribe((state, previousState) => {
      if (state.cart !== previousState.cart) void draftPersistence.save(state.cart)
    })
  }, [enabled])
}
