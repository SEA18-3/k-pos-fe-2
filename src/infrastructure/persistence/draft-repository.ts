import type { CartDraft } from "./models"
import { database } from "./database"

export class OrderedDraftPersistence {
  private tail = Promise.resolve()
  private generation = 0

  save(cart: Record<string, number>) {
    const snapshot = { ...cart }
    const generation = this.generation
    this.tail = this.tail.then(async () => {
      if (generation !== this.generation) return
      if (Object.keys(snapshot).length === 0) {
        await database.drafts.delete("active")
        return
      }
      const existing = await database.drafts.get("active")
      const now = new Date().toISOString()
      const draft: CartDraft = {
        id: "active",
        cart: snapshot,
        transactionStatus: "PENDING",
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }
      await database.drafts.put(draft)
    })
    return this.tail
  }

  async discardPending() {
    this.generation += 1
    await this.tail
    await database.drafts.delete("active")
  }

  flush() {
    return this.tail
  }
}

export const draftPersistence = new OrderedDraftPersistence()

export async function readActiveDraft() {
  return database.drafts.get("active")
}
