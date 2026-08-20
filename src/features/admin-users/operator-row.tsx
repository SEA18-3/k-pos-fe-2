import type { AdminOperator } from "@/features/admin-users/admin-users-api"
import { IconKey, IconPower } from "@tabler/icons-react"

import { Button } from "@/shared/ui/components/button"
import { cn } from "@/shared/lib/utils"

export function OperatorRow(props: {
  operator: AdminOperator
  currentOperatorId?: string
  busy: boolean
  onActiveChange: (operator: AdminOperator, active: boolean) => Promise<unknown>
  onRoleChange: (operator: AdminOperator, role: AdminOperator["role"]) => Promise<unknown>
}) {
  const operator = props.operator
  const isSelf = operator.id_user === props.currentOperatorId

  return (
    <div
      data-testid={`operator-${operator.id_user}`}
      className={cn(
        "grid gap-3 p-4 md:grid-cols-[1fr_auto_auto] md:items-center",
        !operator.is_active && "opacity-55",
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{operator.full_name}</span>
          {isSelf && (
            <span className="rounded bg-primary/10 px-1.5 text-[9px] text-primary">ANDA</span>
          )}
        </div>
        <div className="mt-1 font-mono text-[10px] text-muted-foreground">
          {operator.email} · {operator.is_active ? "AKTIF" : "NONAKTIF"}
        </div>
      </div>
      <select
        value={operator.role}
        disabled={props.busy || isSelf || !operator.is_active}
        onChange={(event) =>
          void props.onRoleChange(operator, event.target.value as AdminOperator["role"])
        }
        className="h-8 rounded-md border bg-background px-2 text-xs"
        aria-label={`Role ${operator.full_name}`}
      >
        <option value="OWNER">Owner</option>
        <option value="OPERATOR">Operator</option>
        <option value="ENTRY">Entry</option>
      </select>
      <div className="flex gap-1.5">
        <Button
          variant={operator.is_active ? "destructive" : "secondary"}
          size="sm"
          disabled={props.busy || isSelf}
          onClick={() => void props.onActiveChange(operator, !operator.is_active)}
        >
          <IconPower /> {operator.is_active ? "Nonaktifkan" : "Aktifkan"}
        </Button>
      </div>
    </div>
  )
}
