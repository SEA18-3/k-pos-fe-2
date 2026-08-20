import {
  IconAlertCircle,
  IconClock,
  IconCloudCheck,
  IconCloudOff,
  IconLoader2,
  IconPointFilled,
} from "@tabler/icons-react"

import type { ConnectionState, SyncStatus } from "@/infrastructure/persistence/models"
import { Badge } from "@/shared/ui/components/badge"

export function ConnectionBadge({ state }: { state: ConnectionState }) {
  if (state === "OFFLINE")
    return (
      <Badge variant="warning">
        <IconCloudOff /> Offline
      </Badge>
    )
  if (state === "RECONNECTING")
    return (
      <Badge variant="default">
        <IconLoader2 className="animate-spin" /> Menghubungkan
      </Badge>
    )
  return (
    <Badge variant="success">
      <IconPointFilled className="status-pulse" /> Online
    </Badge>
  )
}

export function SyncBadge({ status }: { status: SyncStatus }) {
  const config = {
    PENDING_SYNC: { label: "Pending Sync", variant: "warning" as const, icon: IconClock },
    SYNCING: { label: "Syncing", variant: "default" as const, icon: IconLoader2 },
    SYNCED: { label: "Synced", variant: "success" as const, icon: IconCloudCheck },
    SYNC_FAILED: { label: "Gagal", variant: "destructive" as const, icon: IconAlertCircle },
    SYNC_CONFLICT: { label: "Konflik", variant: "destructive" as const, icon: IconAlertCircle },
  }[status]
  const Icon = config.icon
  return (
    <Badge variant={config.variant}>
      <Icon className={status === "SYNCING" ? "animate-spin" : ""} />
      {config.label}
    </Badge>
  )
}
