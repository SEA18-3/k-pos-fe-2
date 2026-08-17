import { useState } from "react"
import type { CreateOperatorRequest } from "@operator/contracts"
import { IconPlus } from "@tabler/icons-react"

import { Button } from "@/shared/ui/components/button"
import { Input } from "@/shared/ui/components/input"

export function CreateOperatorForm(props: {
  busy: boolean
  onCreate: (input: CreateOperatorRequest) => Promise<boolean>
}) {
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [pin, setPin] = useState("")
  const [role, setRole] = useState<CreateOperatorRequest["role"]>("OPERATOR")

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const created = await props.onCreate({ code, name, pin, role })
    if (!created) return
    setCode("")
    setName("")
    setPin("")
    setRole("OPERATOR")
  }

  return (
    <form onSubmit={submit} className="grid gap-2 border-b bg-muted/15 p-4 md:grid-cols-4">
      <Input
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
        placeholder="Kode operator"
        minLength={2}
        maxLength={32}
        required
      />
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Nama lengkap"
        required
      />
      <Input
        value={pin}
        onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
        placeholder="PIN 4–8 digit"
        type="password"
        inputMode="numeric"
        minLength={4}
        maxLength={8}
        required
      />
      <div className="flex gap-2">
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as CreateOperatorRequest["role"])}
          className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-xs"
        >
          <option value="OPERATOR">Kasir</option>
          <option value="ADMIN">Admin</option>
        </select>
        <Button type="submit" disabled={props.busy}>
          <IconPlus /> Tambah
        </Button>
      </div>
    </form>
  )
}
