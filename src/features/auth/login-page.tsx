import { useState, type ComponentType, type FormEvent, type ReactNode } from "react"
import {
  IconArrowRight,
  IconBuildingStore,
  IconCloudCheck,
  IconCopy,
  IconDatabase,
  IconDeviceMobileCode,
  IconKey,
  IconLock,
  IconRefresh,
  IconUser,
} from "@tabler/icons-react"
import { Link } from "react-router-dom"

import { activateAndLogin, bootstrapLocalData } from "@/features/auth/auth-api"
import type { AuthSession, DeviceIdentity } from "@/infrastructure/persistence/models"
import { Button } from "@/shared/ui/components/button"
import { Input } from "@/shared/ui/components/input"

export function LoginPage({
  device,
  onAuthenticated,
  isAdminMode,
}: {
  device: DeviceIdentity
  onAuthenticated: (session: AuthSession) => void
  isAdminMode?: boolean
}) {
  return (
    <main className="grain relative grid min-h-svh overflow-hidden bg-background lg:grid-cols-[minmax(0,1.45fr)_minmax(440px,0.75fr)]">
      <div className="app-grid pointer-events-none absolute inset-0 opacity-35" />
      <LoginHero />
      <LoginForm device={device} onAuthenticated={onAuthenticated} isAdminMode={isAdminMode} />
    </main>
  )
}

function LoginForm({
  device,
  onAuthenticated,
  isAdminMode,
}: {
  device: DeviceIdentity
  onAuthenticated: (session: AuthSession) => void
  isAdminMode?: boolean
}) {
  const [email, setEmail] = useState("owner@kpos.com")
  const [password, setPassword] = useState("password123")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError("")
    try {
      const session = await activateAndLogin({ email, password, device })
      await bootstrapLocalData(session, device)
      onAuthenticated(session)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Aktivasi gagal")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="relative grid place-items-center border-l border-border/70 p-4 sm:p-8 lg:p-6 xl:p-10">
      <form
        onSubmit={submit}
        className="w-full max-w-[500px] rounded-2xl border bg-card/72 p-5 shadow-2xl shadow-black/35 backdrop-blur-xl sm:p-8"
      >
        <MobileBrand />
        <h2 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
          {isAdminMode ? "Login Admin" : "Login Kasir"}
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          {isAdminMode 
            ? "Masuk ke Dashboard Web untuk mengelola katalog, kasir, dan rekonsiliasi."
            : "Masukkan email dan kata sandi operator Anda untuk mulai menggunakan aplikasi kasir."}
        </p>

        <div className="mt-7 grid gap-4">
          <LoginField label="Email Pengguna" icon={<IconUser />}>
            <Input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 bg-background/60 pr-10"
              type="email"
              autoComplete="username"
            />
          </LoginField>
          <LoginField label="Kata Sandi" icon={<IconLock />}>
            <Input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 bg-background/60 pr-10"
              type="password"
              autoComplete="current-password"
            />
          </LoginField>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/8 p-3 text-xs text-red-300">
            {error}
          </div>
        )}
        <Button type="submit" size="lg" className="mt-6 h-12 w-full" disabled={loading}>
          {loading ? "Memproses…" : "Masuk"}
          <IconArrowRight />
        </Button>
        {!isAdminMode && <DeviceIdentityCard deviceId={device.id} />}
        <p className="mt-6 text-center text-[10px] leading-5 text-muted-foreground">
          Demo: owner@kpos.com · password123
        </p>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Belum punya akun?{" "}
          <Link to="/register" className="text-primary hover:underline font-semibold">
            Daftar Toko Baru
          </Link>
        </p>
      </form>
    </section>
  )
}

function DeviceIdentityCard({ deviceId }: { deviceId: string }) {
  const [copied, setCopied] = useState(false)

  async function copyDeviceId() {
    try {
      await navigator.clipboard.writeText(deviceId)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1_500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="mt-4 flex items-center gap-3 rounded-lg border bg-background/45 p-3">
      <IconDeviceMobileCode className="size-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-primary">Identitas perangkat</div>
        <code className="mt-1 block truncate text-[10px] text-muted-foreground">{deviceId}</code>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0"
        aria-label="Salin Device ID"
        title={copied ? "Tersalin" : "Salin Device ID"}
        onClick={() => void copyDeviceId()}
      >
        <IconCopy />
      </Button>
    </div>
  )
}

function LoginField({
  label,
  icon,
  children,
}: {
  label: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium">{label}</span>
      <span className="relative">
        {children}
        <span className="pointer-events-none absolute right-3 top-1/2 grid size-4 -translate-y-1/2 place-items-center text-muted-foreground [&_svg]:size-4">
          {icon}
        </span>
      </span>
    </label>
  )
}

function MobileBrand() {
  return (
    <div className="mb-8 flex items-center gap-3 lg:hidden">
      <img src="/brand/k-pos-icon.png" alt="" className="size-10 rounded-lg object-cover" />
      <span className="text-sm font-semibold tracking-[0.12em]">K-POS</span>
    </div>
  )
}

function LoginHero() {
  const capabilities: Array<[ComponentType<{ className?: string }>, string]> = [
    [IconDatabase, "Tersimpan lokal"],
    [IconRefresh, "Retry tanpa duplikat"],
    [IconCloudCheck, "Sync otomatis"],
  ]

  return (
    <section className="relative hidden min-w-0 flex-col justify-between gap-8 p-8 lg:flex xl:p-12">
      <div className="flex items-center gap-3">
        <img src="/brand/k-pos-icon.png" alt="" className="size-10 rounded-lg object-cover" />
        <span className="text-base font-semibold tracking-[0.12em]">K-POS</span>
      </div>

      <div className="max-w-5xl">
        <h1 className="text-5xl font-semibold leading-[0.98] tracking-[-0.065em] xl:text-6xl 2xl:text-7xl">
          Kasir tetap jalan.
          <br />
          <span className="text-muted-foreground">Sinkron saat online</span>
          <span className="text-primary">.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-muted-foreground xl:text-base xl:leading-7">
          K-POS menyimpan transaksi ke perangkat saat offline, lalu mengirimkannya otomatis ketika
          koneksi kembali tersedia.
        </p>

        <div className="mt-8 overflow-hidden rounded-2xl border bg-card/35 shadow-2xl shadow-black/20">
          <img
            src="/brand/k-pos-login-flow.png"
            alt="Alur transaksi dari kasir ke outbox lokal lalu tersinkron ke backend"
            className="aspect-[2.6/1] w-full object-cover"
          />
        </div>

        <div className="mt-7 grid max-w-3xl grid-cols-3 divide-x divide-border">
          {capabilities.map(([Icon, label]) => (
            <div key={label} className="flex items-center gap-3 px-5 first:pl-0">
              <Icon className="size-5 shrink-0 text-primary" />
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Siap dipakai di toko, bazar, dan pop-up store.
      </p>
    </section>
  )
}
