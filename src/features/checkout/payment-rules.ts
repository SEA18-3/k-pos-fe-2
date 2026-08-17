import type { PaymentMethod, PaymentVerificationType } from "@/infrastructure/persistence/models"

export function verificationTypeFor(method: PaymentMethod): PaymentVerificationType {
  return method === "CASH" ? "SYSTEM_VERIFIABLE" : "OPERATOR_ASSERTED"
}

export function validatePayment(
  method: PaymentMethod,
  total: number,
  amountReceived?: number,
  operatorVerified = false,
) {
  if (method === "CASH") return (amountReceived ?? 0) >= total
  return operatorVerified
}
