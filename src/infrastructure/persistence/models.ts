export type ProductCategory = string

export type Product = {
  id: string
  sku: string
  name: string
  description: string
  category: ProductCategory
  price: number
  stock: number
  accent: string
  featured?: boolean
  imageUrl?: string
  active?: boolean
  lowStockThreshold?: number
  updatedAt?: string
}

export type PaymentMethod = "CASH" | "STATIC_QRIS" | "TRANSFER"
export type PaymentVerificationType = "SYSTEM_VERIFIABLE" | "OPERATOR_ASSERTED"
export type SyncStatus = "PENDING_SYNC" | "SYNCING" | "SYNCED" | "SYNC_FAILED" | "SYNC_CONFLICT"

export type TransactionItem = {
  productId: string
  name: string
  quantity: number
  unitPrice: number
  subtotal: number
  sku?: string
  catalogVersion?: string
}

export type LocalTransaction = {
  id: string
  invoiceNumber: string
  merchantId: string
  deviceId: string
  operatorId: string
  operatorName: string
  items: TransactionItem[]
  subtotal: number
  discount: number
  total: number
  paymentMethod: PaymentMethod
  paymentVerificationType: PaymentVerificationType
  paymentReference?: string
  amountReceived?: number
  change?: number
  transactionStatus: "CONFIRMED" | "VOIDED"
  syncStatus: SyncStatus
  offlineUuid: string
  backendId?: string
  createdAt: string
  receivedAtBackend?: string
  retryCount: number
  lastSyncError?: string
}

export type OutboxEntry = {
  id: string
  transactionId: string
  operation: "UPSERT_TRANSACTION"
  payloadVersion: 1
  status: "PENDING" | "SYNCING" | "FAILED"
  retryCount: number
  createdAt: string
  lastAttemptAt?: string
  lastError?: string
  nextRetryAt?: string
}

export type SyncAttempt = {
  id?: number
  transactionId: string
  invoiceNumber: string
  result: "ACCEPTED" | "ALREADY_PROCESSED" | "REJECTED_PERMANENT" | "RETRYABLE_ERROR"
  createdAt: string
  durationMs: number
}

export type Setting = {
  key: string
  value: string
}

export type ConnectionState = "ONLINE" | "OFFLINE" | "RECONNECTING"

export type DeviceIdentity = {
  id: string
  name: string
  createdAt: string
  registeredAt?: string
}

export type AuthSession = {
  token: string
  refreshToken: string
  merchantId: string
  operator: {
    id: string
    name: string
    role: "OWNER" | "OPERATOR" | "ENTRY"
  }
  expiresAt: string
}

export type CartDraft = {
  id: "active"
  cart: Record<string, number>
  transactionStatus: "PENDING"
  createdAt: string
  updatedAt: string
}
