import type { AdminOperator, CreateOperatorRequest } from "@/features/admin-users/admin-users-api"
import { IconUsers } from "@tabler/icons-react"

import { CreateOperatorForm } from "@/features/admin-users/create-operator-form"
import { OperatorRow } from "@/features/admin-users/operator-row"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/components/card"

export function OperatorPanel(props: {
  operators: AdminOperator[]
  currentOperatorId?: string
  mutatingId: string | null
  onCreate: (input: CreateOperatorRequest) => Promise<boolean>
  onActiveChange: (operator: AdminOperator, active: boolean) => Promise<unknown>
  onRoleChange: (operator: AdminOperator, role: AdminOperator["role"]) => Promise<unknown>
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconUsers className="size-4 text-primary" /> Operator merchant
        </CardTitle>
      </CardHeader>
      <CreateOperatorForm busy={props.mutatingId === "create"} onCreate={props.onCreate} />
      <CardContent className="divide-y p-0">
        {props.operators.map((operator) => (
          <OperatorRow
            key={operator.id_user}
            operator={operator}
            currentOperatorId={props.currentOperatorId}
            busy={props.mutatingId === operator.id_user}
            onActiveChange={props.onActiveChange}
            onRoleChange={props.onRoleChange}
          />
        ))}
      </CardContent>
    </Card>
  )
}
