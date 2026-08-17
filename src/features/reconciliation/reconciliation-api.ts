import {
  backendTransactionListResponseSchema,
  correctionListResponseSchema,
  createCorrectionResponseSchema,
  inventoryDiscrepancyListResponseSchema,
  resolveInventoryDiscrepancyResponseSchema,
  type BackendTransaction,
  type CorrectionRecord,
  type CreateCorrectionRequest,
  type InventoryDiscrepancy,
  type ResolveInventoryDiscrepancyRequest,
} from "@operator/contracts"

import { requestJson } from "@/infrastructure/api/http-client"
import type { AuthSession } from "@/infrastructure/persistence/models"

export function fetchBackendTransactions(session: AuthSession, paymentRiskOnly = false) {
  return requestJson(
    `/v1/transactions?limit=100&paymentRiskOnly=${paymentRiskOnly}`,
    backendTransactionListResponseSchema,
    {},
    session.token,
  )
}

export function createCorrection(
  session: AuthSession,
  transactionId: string,
  input: CreateCorrectionRequest,
) {
  return requestJson(
    `/v1/admin/transactions/${encodeURIComponent(transactionId)}/corrections`,
    createCorrectionResponseSchema,
    { method: "POST", body: JSON.stringify(input) },
    session.token,
  )
}

export function fetchCorrections(session: AuthSession) {
  return requestJson("/v1/admin/corrections", correctionListResponseSchema, {}, session.token)
}

export function fetchInventoryDiscrepancies(session: AuthSession) {
  return requestJson(
    "/v1/inventory/discrepancies",
    inventoryDiscrepancyListResponseSchema,
    {},
    session.token,
  )
}

export function resolveInventoryDiscrepancy(
  session: AuthSession,
  id: string,
  input: ResolveInventoryDiscrepancyRequest,
) {
  return requestJson(
    `/v1/inventory/discrepancies/${encodeURIComponent(id)}/resolve`,
    resolveInventoryDiscrepancyResponseSchema,
    { method: "POST", body: JSON.stringify(input) },
    session.token,
  )
}

export type { BackendTransaction, CorrectionRecord, InventoryDiscrepancy }
