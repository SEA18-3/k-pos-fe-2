import type { AdminDevice } from "@/features/admin-users/admin-users-api"
import { IconDeviceDesktop, IconUnlink } from "@tabler/icons-react"

import { formatDateTime } from "@/shared/lib/format"
import { CreateDeviceForm } from "@/features/admin-users/create-device-form"
import { Button } from "@/shared/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/components/card"

export function DevicePanel(props: {
  devices: AdminDevice[]
  currentDeviceId?: string
  mutatingId: string | null
  onRevoke: (device: AdminDevice) => Promise<unknown>
  onCreate: (name: string) => Promise<{ data?: { pairing_code: string } } | false>
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconDeviceDesktop className="size-4 text-primary" /> Device terdaftar
        </CardTitle>
      </CardHeader>
      <CreateDeviceForm busy={props.mutatingId === "create-device"} onCreate={props.onCreate} />
      <CardContent className="divide-y p-0">
        {props.devices.map((device) => {
          const current = device.id_device === props.currentDeviceId
          return (
            <div key={device.id_device} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className="truncate">{device.name}</span>
                  {current && (
                    <span className="rounded bg-primary/10 px-1.5 text-[9px] text-primary">
                      DEVICE INI
                    </span>
                  )}
                </div>
                <div className="mt-1 break-all font-mono text-[9px] text-muted-foreground">
                  {device.id_device}
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  Terdaftar {formatDateTime(device.created_at)} ·{" "}
                  {device.status === "REVOKED" ? "Dicabut" : "Aktif"}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={device.status === "REVOKED" || props.mutatingId === device.id_device}
                onClick={() => {
                  if (
                    window.confirm(
                      `Cabut akses ${device.name}? Sesi aktif di device akan dihentikan.`,
                    )
                  )
                    void props.onRevoke(device)
                }}
              >
                <IconUnlink /> Cabut
              </Button>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
