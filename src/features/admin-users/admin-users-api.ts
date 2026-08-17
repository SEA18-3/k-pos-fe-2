import {
  deviceListResponseSchema,
  operatorListResponseSchema,
  operatorMutationResponseSchema,
  resetPinResponseSchema,
  revokeDeviceResponseSchema,
  type CreateOperatorRequest,
  type UpdateOperatorRequest,
} from "@operator/contracts"

import { requestJson } from "@/infrastructure/api/http-client"
import type { AuthSession } from "@/infrastructure/persistence/models"

export function fetchOperators(session: AuthSession) {
  return requestJson("/v1/admin/operators", operatorListResponseSchema, {}, session.token)
}

export function createOperator(session: AuthSession, input: CreateOperatorRequest) {
  return requestJson(
    "/v1/admin/operators",
    operatorMutationResponseSchema,
    { method: "POST", body: JSON.stringify(input) },
    session.token,
  )
}

export function updateOperator(
  session: AuthSession,
  operatorId: string,
  input: UpdateOperatorRequest,
) {
  return requestJson(
    `/v1/admin/operators/${encodeURIComponent(operatorId)}`,
    operatorMutationResponseSchema,
    { method: "PATCH", body: JSON.stringify(input) },
    session.token,
  )
}

export function resetOperatorPin(session: AuthSession, operatorId: string, pin: string) {
  return requestJson(
    `/v1/admin/operators/${encodeURIComponent(operatorId)}/reset-pin`,
    resetPinResponseSchema,
    { method: "POST", body: JSON.stringify({ pin }) },
    session.token,
  )
}

export function fetchDevices(session: AuthSession) {
  return requestJson("/v1/admin/devices", deviceListResponseSchema, {}, session.token)
}

export function revokeDevice(session: AuthSession, deviceId: string) {
  return requestJson(
    `/v1/devices/${encodeURIComponent(deviceId)}/revoke`,
    revokeDeviceResponseSchema,
    { method: "POST" },
    session.token,
  )
}
