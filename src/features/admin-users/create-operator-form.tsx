import { useState } from "react"
import type { CreateOperatorRequest } from "@/features/admin-users/admin-users-api"
import { IconPlus } from "@tabler/icons-react"

import { Button } from "@/shared/ui/components/button"
import { Input } from "@/shared/ui/components/input"

export function CreateOperatorForm(props: {
  busy: boolean
  onCreate: (input: CreateOperatorRequest) => Promise<boolean>
}) {
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<CreateOperatorRequest["role"]>("OPERATOR")

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const created = await props.onCreate({ email, full_name: fullName, password, role })
    if (!created) return
    setEmail("")
    setFullName("")
    setPassword("")
    setRole("OPERATOR")
  }

  return (
    <form onSubmit={submit} className="grid gap-2 border-b bg-muted/15 p-4 md:grid-cols-4">
      <Input
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Email operator"
        type="email"
        required
      />
      <Input
        value={fullName}
        onChange={(event) => setFullName(event.target.value)}
        placeholder="Nama lengkap"
        required
      />
      <Input
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Password"
        type="password"
        minLength={6}
        required
      />
      <div className="flex gap-2">
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as CreateOperatorRequest["role"])}
          className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-xs"
        >
          <option value="OPERATOR">Operator</option>
          <option value="ENTRY">Entry</option>
        </select>
        <Button type="submit" disabled={props.busy}>
          <IconPlus /> Tambah
        </Button>
      </div>
    </form>
  )
}
