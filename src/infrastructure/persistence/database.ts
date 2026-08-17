import Dexie, { type EntityTable } from "dexie"

import type {
  CartDraft,
  LocalTransaction,
  OutboxEntry,
  Product,
  Setting,
  SyncAttempt,
} from "./models"

export class OperatorDatabase extends Dexie {
  products!: EntityTable<Product, "id">
  transactions!: EntityTable<LocalTransaction, "id">
  outbox!: EntityTable<OutboxEntry, "id">
  syncAttempts!: EntityTable<SyncAttempt, "id">
  settings!: EntityTable<Setting, "key">
  drafts!: EntityTable<CartDraft, "id">

  constructor(name = "operator-pos-v3") {
    super(name)
    this.version(1).stores({
      products: "id, sku, name, category, stock, active",
      transactions: "id, invoiceNumber, createdAt, syncStatus, settlementStatus, paymentMethod",
      outbox: "id, transactionId, status, createdAt, nextRetryAt",
      syncAttempts: "++id, transactionId, createdAt, result",
      settings: "key",
      drafts: "id, updatedAt",
    })
  }
}

export const database = new OperatorDatabase()
