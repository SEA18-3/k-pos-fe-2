import { useCallback, useEffect, useState } from "react"
import type { AdminDevice, AdminOperator, CreateOperatorRequest } from "@operator/contracts"
import { toast } from "sonner"

import {
  createOperator,
  fetchDevices,
  fetchOperators,
  resetOperatorPin,
  revokeDevice,
  updateOperator,
} from "@/features/admin-users/admin-users-api"
import { useCurrentSession } from "@/features/auth/session-queries"

export function useAdminUsers() {
  const session = useCurrentSession()
  const [operators, setOperators] = useState<AdminOperator[]>([])
  const [devices, setDevices] = useState<AdminDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [mutatingId, setMutatingId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!session) return
    setLoading(true)
    try {
      const [operatorResult, deviceResult] = await Promise.all([
        fetchOperators(session),
        fetchDevices(session),
      ])
      setOperators(operatorResult.operators)
      setDevices(deviceResult.devices)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Data admin gagal dimuat")
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => void refresh(), [refresh])

  async function run(id: string, action: () => Promise<unknown>, success: string) {
    setMutatingId(id)
    try {
      await action()
      toast.success(success)
      await refresh()
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Perubahan gagal disimpan")
      return false
    } finally {
      setMutatingId(null)
    }
  }

  return {
    session,
    operators,
    devices,
    loading,
    mutatingId,
    refresh,
    create: (input: CreateOperatorRequest) =>
      session
        ? run("create", () => createOperator(session, input), "Akun operator dibuat")
        : Promise.resolve(false),
    setActive: (operator: AdminOperator, active: boolean) =>
      session
        ? run(
            operator.id,
            () => updateOperator(session, operator.id, { active }),
            active ? "Akun diaktifkan" : "Akun dinonaktifkan",
          )
        : Promise.resolve(false),
    setRole: (operator: AdminOperator, role: AdminOperator["role"]) =>
      session
        ? run(operator.id, () => updateOperator(session, operator.id, { role }), "Role diperbarui")
        : Promise.resolve(false),
    resetPin: (operator: AdminOperator, pin: string) =>
      session
        ? run(operator.id, () => resetOperatorPin(session, operator.id, pin), "PIN direset")
        : Promise.resolve(false),
    revoke: (device: AdminDevice) =>
      session
        ? run(device.id, () => revokeDevice(session, device.id), "Perangkat dicabut")
        : Promise.resolve(false),
  }
}
