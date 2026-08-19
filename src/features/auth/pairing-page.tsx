import { useState, type FormEvent } from "react"
import { IconArrowRight, IconDeviceMobileCode } from "@tabler/icons-react"
import { Link } from "react-router-dom"

import { pairDevice } from "@/features/devices/device-api"
import type { DeviceIdentity } from "@/infrastructure/persistence/models"
import { saveDeviceIdentity } from "@/infrastructure/persistence/device-repository"
import { Button } from "@/shared/ui/components/button"
import { Input } from "@/shared/ui/components/input"

export function PairingPage({
  device,
  onPaired,
}: {
  device: DeviceIdentity
  onPaired: (newDevice: DeviceIdentity) => void
}) {
  return (
    <main className="grain relative grid min-h-svh place-items-center overflow-hidden bg-background">
      <div className="app-grid pointer-events-none absolute inset-0 opacity-35" />
      <PairingForm device={device} onPaired={onPaired} />
    </main>
  )
}

function PairingForm({
  device,
  onPaired,
}: {
  device: DeviceIdentity
  onPaired: (newDevice: DeviceIdentity) => void
}) {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (code.length !== 6) {
      setError("Kode pairing harus 6 digit")
      return
    }

    setLoading(true)
    setError("")
    try {
      const res = await pairDevice({
        pairing_code: code,
        hardware_id: device.id,
      })
      
      const newDevice: DeviceIdentity = {
        ...device,
        id: res.data.id_device, // Use real device ID from backend
        registeredAt: new Date().toISOString(),
      }
      
      await saveDeviceIdentity(newDevice)
      onPaired(newDevice)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal pairing perangkat. Periksa kembali kodenya.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="relative w-full max-w-md p-4 sm:p-8">
      <form
        onSubmit={submit}
        className="w-full rounded-2xl border bg-card/72 p-5 shadow-2xl shadow-black/35 backdrop-blur-xl sm:p-8"
      >
        <div className="mb-8 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <IconDeviceMobileCode className="h-8 w-8" />
          </div>
        </div>
        
        <h2 className="text-center text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">Hubungkan Perangkat</h2>
        <p className="mt-2 text-center text-sm leading-6 text-muted-foreground">
          Masukkan 6 digit kode yang dibuat di Dashboard Admin (K-POS Web).
        </p>

        <div className="mt-7">
          <label className="mb-2 block text-center text-xs font-medium">Kode Pairing</label>
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            className="h-14 text-center text-2xl tracking-[0.25em] font-semibold"
            placeholder="000000"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            required
          />
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/8 p-3 text-center text-xs text-red-300">
            {error}
          </div>
        )}
        
        <Button type="submit" size="lg" className="mt-6 h-12 w-full" disabled={loading || code.length !== 6}>
          {loading ? "Menghubungkan…" : "Hubungkan"}
          <IconArrowRight />
        </Button>
        
        <p className="mt-6 text-center text-[10px] leading-5 text-muted-foreground">
          Hardware ID: {device.id}
        </p>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Pemilik Toko?{" "}
          <Link to="/login-admin" className="text-primary hover:underline font-semibold">
            Masuk ke Admin Web
          </Link>
        </p>
      </form>
    </section>
  )
}
