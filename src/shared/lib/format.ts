import { format, formatDistanceToNowStrict, isToday } from "date-fns"
import { id } from "date-fns/locale"

export function formatCurrency(value: number, compact = false) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
    ...(compact ? { notation: "compact" as const } : {}),
  }).format(value)
}

export function formatTransactionDate(value: string) {
  const date = new Date(value)
  return isToday(date)
    ? `Hari ini, ${format(date, "HH:mm")}`
    : format(date, "dd MMM, HH:mm", { locale: id })
}

export function formatDateTime(value: string) {
  return format(new Date(value), "dd MMM yyyy, HH:mm", { locale: id })
}

export function fromNow(value?: string) {
  if (!value) return "Belum pernah"
  return `${formatDistanceToNowStrict(new Date(value), { locale: id })} lalu`
}

export const paymentLabels = {
  CASH: "Tunai",
  STATIC_QRIS: "QRIS Statis",
  TRANSFER: "Transfer",
} as const

export function shortDeviceId(value: string) {
  return value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-5)}` : value
}
