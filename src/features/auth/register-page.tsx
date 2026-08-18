import { useState, type FormEvent } from "react"
import {
  IconArrowRight,
  IconBuildingStore,
  IconCloudCheck,
  IconDatabase,
  IconLock,
  IconRefresh,
  IconUser,
} from "@tabler/icons-react"
import { Link, useNavigate } from "react-router-dom"

import { registerOwner } from "@/features/auth/auth-api"
import { Button } from "@/shared/ui/components/button"
import { Input } from "@/shared/ui/components/input"

export function RegisterPage() {
  return (
    <main className="grain relative grid min-h-svh overflow-hidden bg-background lg:grid-cols-[minmax(0,1.45fr)_minmax(440px,0.75fr)]">
      <div className="app-grid pointer-events-none absolute inset-0 opacity-35" />
      <RegisterHero />
      <RegisterForm />
    </main>
  )
}

function RegisterForm() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [merchantName, setMerchantName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError("")
    try {
      await registerOwner({
        full_name: fullName,
        email,
        password,
        merchant_name: merchantName,
      })
      navigate("/", { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Registrasi gagal")
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
        <h2 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">Pendaftaran Toko</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Buat akun Owner baru untuk mulai mengelola katalog, kasir, dan rekonsiliasi secara terpusat.
        </p>

        <div className="mt-7 grid gap-4">
          <RegisterField label="Nama Pemilik" icon={<IconUser />}>
            <Input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="h-11 bg-background/60 pr-10"
              required
              placeholder="Budi Santoso"
            />
          </RegisterField>
          <RegisterField label="Nama Toko / Merchant" icon={<IconBuildingStore />}>
            <Input
              value={merchantName}
              onChange={(event) => setMerchantName(event.target.value)}
              className="h-11 bg-background/60 pr-10"
              required
              placeholder="K-POS Coffee Shop"
            />
          </RegisterField>
          <RegisterField label="Email Pengguna" icon={<IconUser />}>
            <Input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 bg-background/60 pr-10"
              type="email"
              autoComplete="username"
              required
              placeholder="budi@example.com"
            />
          </RegisterField>
          <RegisterField label="Kata Sandi" icon={<IconLock />}>
            <Input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 bg-background/60 pr-10"
              type="password"
              autoComplete="new-password"
              required
              placeholder="Minimal 8 karakter"
              minLength={8}
            />
          </RegisterField>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/8 p-3 text-xs text-red-300">
            {error}
          </div>
        )}
        <Button type="submit" size="lg" className="mt-6 h-12 w-full" disabled={loading}>
          {loading ? "Membuat Akun…" : "Daftar Sekarang"}
          <IconArrowRight />
        </Button>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Sudah punya akun?{" "}
          <Link to="/" className="text-primary hover:underline font-semibold">
            Masuk di sini
          </Link>
        </p>
      </form>
    </section>
  )
}

function RegisterHero() {
  const capabilities: Array<[React.ComponentType<{ className?: string }>, string]> = [
    [IconDatabase, "Tersimpan lokal"],
    [IconRefresh, "Retry tanpa duplikat"],
    [IconCloudCheck, "Sync otomatis"],
  ]

  return (
    <section className="relative hidden min-w-0 flex-col justify-between gap-8 p-8 lg:flex xl:p-12">
      <div className="flex items-center gap-3">
        <img src="/brand/compos-icon.png" alt="" className="size-10 rounded-lg object-cover" />
        <span className="text-base font-semibold tracking-[0.12em]">COMPOS</span>
      </div>

      <div className="max-w-5xl">
        <h1 className="text-5xl font-semibold leading-[0.98] tracking-[-0.065em] xl:text-6xl 2xl:text-7xl">
          Kasir tetap jalan.
          <br />
          <span className="text-muted-foreground">Sinkron saat online</span>
          <span className="text-primary">.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-muted-foreground xl:text-base xl:leading-7">
          COMPOS menyimpan transaksi ke perangkat saat offline, lalu mengirimkannya otomatis ketika
          koneksi kembali tersedia.
        </p>

        <div className="mt-8 overflow-hidden rounded-2xl border bg-card/35 shadow-2xl shadow-black/20">
          <img
            src="/brand/compos-login-flow.png"
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
      <div />
    </section>
  )
}

function MobileBrand() {
  return (
    <div className="mb-8 flex items-center gap-3 lg:hidden">
      <img src="/brand/compos-icon.png" alt="" className="size-10 rounded-lg object-cover" />
      <span className="text-sm font-semibold tracking-[0.12em]">COMPOS</span>
    </div>
  )
}

function RegisterField({
  label,
  children,
  icon,
}: {
  label: string
  children: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-semibold">{label}</div>
      <div className="relative">
        {children}
        {icon && (
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground/60 [&_svg]:size-5">
            {icon}
          </div>
        )}
      </div>
    </label>
  )
}
