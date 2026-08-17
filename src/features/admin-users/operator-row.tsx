import type { AdminOperator } from "@operator/contracts"
import { IconKey, IconPower } from "@tabler/icons-react"

import { Button } from "@/shared/ui/components/button"
import { cn } from "@/shared/lib/utils"

export function OperatorRow(props: {
  operator: AdminOperator
  currentOperatorId?: string
  busy: boolean
  onActiveChange: (operator: AdminOperator, active: boolean) => Promise<unknown>
  onRoleChange: (operator: AdminOperator, role: AdminOperator["role"]) => Promise<unknown>
  onResetPin: (operator: AdminOperator, pin: string) => Promise<unknown>
}) {
  const operator = props.operator
  const isSelf = operator.id === props.currentOperatorId

  function resetPin() {
    const pin = window.prompt(`PIN baru untuk ${operator.name} (4–8 digit):`)
    if (!pin) return
    if (!/^\d{4,8}$/.test(pin)) {
      window.alert("PIN harus berisi 4–8 digit.")
      return
    }
    void props.onResetPin(operator, pin)
  }

  return (
    <div
      data-testid={`operator-${operator.code}`}
      className={cn(
        "grid gap-3 p-4 md:grid-cols-[1fr_auto_auto] md:items-center",
        !operator.active && "opacity-55",
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{operator.name}</span>
          {isSelf && (
            <span className="rounded bg-primary/10 px-1.5 text-[9px] text-primary">ANDA</span>
          )}
        </div>
        <div className="mt-1 font-mono text-[10px] text-muted-foreground">
          {operator.code} · {operator.active ? "AKTIF" : "NONAKTIF"}
        </div>
      </div>
      <select
        value={operator.role}
        disabled={props.busy || isSelf || !operator.active}
        onChange={(event) =>
          void props.onRoleChange(operator, event.target.value as AdminOperator["role"])
        }
        className="h-8 rounded-md border bg-background px-2 text-xs"
        aria-label={`Role ${operator.name}`}
      >
        <option value="OPERATOR">Kasir</option>
        <option value="ADMIN">Admin</option>
      </select>
      <div className="flex gap-1.5">
        <Button variant="outline" size="sm" disabled={props.busy} onClick={resetPin}>
          <IconKey /> Reset PIN
        </Button>
        <Button
          variant={operator.active ? "destructive" : "secondary"}
          size="sm"
          disabled={props.busy || isSelf}
          onClick={() => void props.onActiveChange(operator, !operator.active)}
        >
          <IconPower /> {operator.active ? "Nonaktifkan" : "Aktifkan"}
        </Button>
      </div>
    </div>
  )
}
