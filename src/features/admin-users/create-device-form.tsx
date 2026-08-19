import { useState } from "react"
import { IconDeviceDesktop, IconPlus, IconCopy } from "@tabler/icons-react"
import { Button } from "@/shared/ui/components/button"
import { Input } from "@/shared/ui/components/input"

export function CreateDeviceForm(props: {
  busy: boolean
  onCreate: (name: string) => Promise<{ data?: { pairing_code: string } } | false>
}) {
  const [name, setName] = useState("")
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const result = await props.onCreate(name)
    if (result && result.data?.pairing_code) {
      setPairingCode(result.data.pairing_code)
      setName("")
    }
  }

  async function copyCode() {
    if (!pairingCode) return
    try {
      await navigator.clipboard.writeText(pairingCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="border-b bg-muted/15 p-4">
      <form onSubmit={submit} className="flex gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nama perangkat (misal: Kasir 1)"
          required
          maxLength={30}
          className="bg-background"
        />
        <Button type="submit" disabled={props.busy}>
          <IconPlus /> Tambah
        </Button>
      </form>
      
      {pairingCode && (
        <div className="mt-4 rounded-lg border border-primary/20 bg-primary/10 p-4 text-center">
          <div className="mb-2 flex items-center justify-center gap-2 text-primary">
            <IconDeviceDesktop className="size-5" />
            <span className="font-semibold text-sm">Kode Pairing Berhasil Dibuat</span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Masukkan kode ini di halaman utama (layar kasir) pada perangkat yang ingin dihubungkan.
          </p>
          <div className="flex justify-center items-center gap-2">
            <div className="text-3xl font-mono font-bold tracking-[0.25em] text-primary bg-background border px-6 py-3 rounded-xl shadow-inner">
              {pairingCode}
            </div>
            <Button 
              type="button" 
              variant="outline" 
              size="icon" 
              className="h-14 w-14 shrink-0" 
              title={copied ? "Tersalin" : "Salin Kode"} 
              onClick={() => void copyCode()}
            >
              <IconCopy className={copied ? "text-emerald-500" : ""} />
            </Button>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="mt-4 text-xs" 
            onClick={() => setPairingCode(null)}
          >
            Tutup
          </Button>
        </div>
      )}
    </div>
  )
}
