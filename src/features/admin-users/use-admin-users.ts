import { useCallback, useEffect, useState } from "react"
import type { AdminDevice, AdminOperator, CreateOperatorRequest } from "@/features/admin-users/admin-users-api"
import { toast } from "sonner"

import {
  createDevice,
  createOperator,
  fetchDevices,
  fetchOperators,
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
      setOperators(operatorResult.data.items)
      setDevices(deviceResult.data.items)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Data admin gagal dimuat")
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => void refresh(), [refresh])

  async function run<T>(id: string, action: () => Promise<T>, success: string): Promise<T | false> {
    setMutatingId(id)
    try {
      const res = await action()
      toast.success(success)
      await refresh()
      return res
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
    create: async (input: CreateOperatorRequest): Promise<boolean> => {
      if (!session) return false
      const result = await run("create", () => createOperator(session, input), "Akun operator dibuat")
      return Boolean(result)
    },
    setActive: (operator: AdminOperator, active: boolean) =>
      session
        ? run(
            operator.id_user,
            () => updateOperator(session, operator.id_user, { is_active: active }),
            active ? "Akun diaktifkan" : "Akun dinonaktifkan",
          )
        : Promise.resolve(false),
    setRole: (operator: AdminOperator, role: AdminOperator["role"]) => {
      toast.warning("Mengubah role pengguna tidak didukung oleh sistem.")
      return Promise.resolve(false)
    },
    revoke: (device: AdminDevice) =>
      session
        ? run(device.id_device, () => revokeDevice(session, device.id_device), "Perangkat dicabut")
        : Promise.resolve(false),
    addDevice: (name: string) =>
      session
        ? run("create-device", () => createDevice(session, name), "Perangkat berhasil ditambahkan")
        : Promise.resolve(false as const),
  }
}
