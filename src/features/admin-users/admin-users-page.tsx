import { IconRefresh } from "@tabler/icons-react"

import { DevicePanel } from "@/features/admin-users/device-panel"
import { OperatorPanel } from "@/features/admin-users/operator-panel"
import { useAdminUsers } from "@/features/admin-users/use-admin-users"
import { useDeviceIdentity } from "@/features/auth/session-queries"
import { Button } from "@/shared/ui/components/button"
import { PageHeader } from "@/shared/ui/page-header"

export function AdminUsersPage() {
  const admin = useAdminUsers()
  const currentDevice = useDeviceIdentity()
  return (
    <div>
      <PageHeader
        title="Akun & perangkat"
        description="Atur akun kasir, hak akses, dan perangkat yang terhubung ke toko Anda."
        actions={
          <Button variant="outline" disabled={admin.loading} onClick={() => void admin.refresh()}>
            <IconRefresh /> {admin.loading ? "Memuat…" : "Refresh"}
          </Button>
        }
      />
      <div className="grid gap-4 p-4 sm:p-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <OperatorPanel
          operators={admin.operators}
          currentOperatorId={admin.session?.operator.id}
          mutatingId={admin.mutatingId}
          onCreate={admin.create}
          onActiveChange={admin.setActive}
          onRoleChange={admin.setRole}
        />
        <DevicePanel
          devices={admin.devices}
          currentDeviceId={currentDevice?.id}
          mutatingId={admin.mutatingId}
          onRevoke={admin.revoke}
          onCreate={admin.addDevice}
        />
      </div>
    </div>
  )
}
