import { IconDeviceTablet, IconLogout, IconShieldLock } from "@tabler/icons-react"
import { useState } from "react"
import { toast } from "sonner"

import { useUiStore } from "@/app/ui-store"
import { logoutOnline } from "@/features/auth/auth-api"
import { useCurrentSession, useDeviceIdentity } from "@/features/auth/session-queries"
import { draftPersistence } from "@/infrastructure/persistence/draft-repository"
import { clearAuthSession } from "@/infrastructure/persistence/session-repository"
import { PageHeader } from "@/shared/ui/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/components/card"
import { Button } from "@/shared/ui/components/button"

export function SettingsPage() {
  const device = useDeviceIdentity()
  const session = useCurrentSession()
  const [loggingOut, setLoggingOut] = useState(false)
  async function logout() {
    if (
      !window.confirm(
        "Keluar dari operator aktif? Cart akan dikosongkan, tetapi transaksi dan antrean sync tetap tersimpan.",
      )
    )
      return
    setLoggingOut(true)
    if (session) {
      try {
        await logoutOnline(session)
      } catch {
        toast.message("Backend tidak terjangkau", {
          description: "Sesi lokal tetap ditutup; data antrean tidak dihapus.",
        })
      }
    }
    await draftPersistence.discardPending()
    useUiStore.getState().clearCart()
    await clearAuthSession()
    toast.success("Sesi lokal ditutup")
    window.location.reload()
  }
  return (
    <div>
      <PageHeader
        title="Pengaturan perangkat"
        description="Identitas instalasi ini disimpan secara lokal dan terikat ke merchant."
        actions={
          <Button variant="outline" disabled={loggingOut} onClick={logout}>
            <IconLogout /> {loggingOut ? "Keluar…" : "Ganti operator"}
          </Button>
        }
      />
      <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconDeviceTablet className="size-4 text-primary" /> Perangkat
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nama</span>
              <span>{device?.name ?? "Memuat…"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Device ID</span>
              <span className="break-all text-right font-mono text-[10px]">
                {device?.id ?? "Memuat…"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="text-emerald-400">Terdaftar</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconShieldLock className="size-4 text-primary" /> Offline policy
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs leading-5 text-muted-foreground">
            Checkout offline berlaku 72 jam sejak autentikasi online terakhir. Setelah lease
            berakhir data tetap tersedia, tetapi transaksi baru memerlukan login online.
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
