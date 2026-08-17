import { IconDeviceTablet, IconHistory } from "@tabler/icons-react"

import type { LocalTransaction } from "@/infrastructure/persistence/models"
import { shortDeviceId } from "@/shared/lib/format"
import { cn } from "@/shared/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/components/card"
import { Separator } from "@/shared/ui/components/separator"

export type LifecycleEvent = { label: string; description: string; done: boolean; failed?: boolean }

export function TransactionLifecycle(props: {
  transaction: LocalTransaction
  events: LifecycleEvent[]
}) {
  return (
    <div className="grid content-start gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconHistory className="size-4 text-primary" /> Lifecycle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative grid gap-0">
            {props.events.map((event, index) => (
              <div
                key={event.label}
                className="relative grid grid-cols-[20px_1fr] gap-2 pb-5 last:pb-0"
              >
                {index < props.events.length - 1 && (
                  <div className="absolute left-[7px] top-3 h-full w-px bg-border" />
                )}
                <div
                  className={cn(
                    "relative z-10 mt-0.5 size-[15px] rounded-full border-2 border-card",
                    event.failed ? "bg-red-400" : event.done ? "bg-emerald-400" : "bg-zinc-600",
                  )}
                />
                <div>
                  <div
                    className={cn(
                      "text-xs font-medium",
                      !event.done && !event.failed && "text-muted-foreground",
                    )}
                  >
                    {event.label}
                  </div>
                  <div className="mt-0.5 text-[10px] leading-4 text-muted-foreground">
                    {event.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <AuditDeviceCard transaction={props.transaction} />
    </div>
  )
}

function AuditDeviceCard({ transaction }: { transaction: LocalTransaction }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Device & audit</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Operator</span>
          <span>
            {transaction.operatorName} · {transaction.operatorId}
          </span>
        </div>
        <Separator />
        <div className="flex justify-between">
          <span className="text-muted-foreground">Device ID</span>
          <span className="font-mono text-[10px]">{shortDeviceId(transaction.deviceId)}</span>
        </div>
        <Separator />
        <div className="flex justify-between">
          <span className="text-muted-foreground">Retry</span>
          <span>{transaction.retryCount}×</span>
        </div>
        <div className="mt-1 flex items-start gap-2 rounded-md bg-secondary p-2 text-[10px] leading-4 text-muted-foreground">
          <IconDeviceTablet className="mt-0.5 size-3.5 shrink-0" />
          ID transaksi dibuat di device dan tidak berubah pada setiap retry.
        </div>
      </CardContent>
    </Card>
  )
}
