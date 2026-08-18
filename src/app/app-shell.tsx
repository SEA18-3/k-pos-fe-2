import { useEffect, useState, type ReactNode } from "react"
import {
  IconArrowsExchange,
  IconBuildingStore,
  IconChevronDown,
  IconClock,
  IconCloudUpload,
  IconLayoutDashboard,
  IconPackage,
  IconReceipt2,
  IconScale,
  IconSettings,
  IconUsers,
  IconTags,
  IconWifiOff,
} from "@tabler/icons-react"
import { NavLink, useLocation } from "react-router-dom"
import { toast } from "sonner"

import { ConnectionBadge } from "@/shared/ui/status-badge"
import { Button } from "@/shared/ui/components/button"
import { useCurrentSession, useMerchantProfile } from "@/features/auth/session-queries"
import { useSyncOverview } from "@/features/sync/sync-queries"
import { fromNow } from "@/shared/lib/format"
import { refreshConnectivity, syncService } from "@/features/sync/sync-runtime"
import { cn } from "@/shared/lib/utils"
import { useUiStore } from "@/app/ui-store"

const navItems = [
  { label: "Kasir", href: "/", icon: IconLayoutDashboard },
  { label: "Transaksi", href: "/transactions", icon: IconReceipt2 },
  { label: "Produk", href: "/products", icon: IconPackage },
  { label: "Sync & Data", href: "/sync", icon: IconArrowsExchange },
  { label: "Reconciliation", href: "/reconciliation", icon: IconScale, adminOnly: true },
  { label: "Akun & Device", href: "/admin/users", icon: IconUsers, adminOnly: true },
  { label: "Kelola Katalog", href: "/admin/catalog", icon: IconTags, adminOnly: true },
]

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { connection, setConnection } = useUiStore()
  const [switching, setSwitching] = useState(false)
  const { lastSyncAt, pendingCount } = useSyncOverview()
  const session = useCurrentSession()
  const merchant = useMerchantProfile()
  const visibleNavItems = navItems.filter((item) => {
    if (item.adminOnly && session?.operator.role !== "OWNER") return false
    if (item.label === "Kasir" && session?.operator.role !== "OPERATOR") return false
    return true
  })

  useEffect(() => {
    if (connection !== "ONLINE") return
    void syncService.run().then((count) => {
      if (count > 0)
        toast.success(`${count} transaksi sudah settled`, {
          description: "Server menerima batch tanpa duplikasi.",
        })
    })
  }, [connection])

  async function toggleConnection() {
    if (switching) return
    if (connection === "ONLINE") {
      useUiStore.getState().setForcedOffline(true)
      setConnection("OFFLINE")
      toast.message("Mode offline aktif", {
        description: "Checkout tetap dapat digunakan. Data disimpan di perangkat ini.",
      })
      return
    }
    setSwitching(true)
    useUiStore.getState().setForcedOffline(false)
    const connected = await refreshConnectivity()
    setSwitching(false)
    if (!connected)
      toast.error("Backend belum dapat dijangkau", {
        description: "Data tetap aman di perangkat dan retry akan berjalan otomatis.",
      })
  }

  return (
    <div className="grain min-h-svh bg-background">
      <div className="app-grid pointer-events-none fixed inset-0 opacity-35" />
      <DesktopSidebar
        items={visibleNavItems}
        merchantName={merchant?.name}
        merchantId={merchant?.id}
        operatorName={session?.operator.name}
        admin={session?.operator.role === "OWNER"}
        pendingCount={pendingCount}
      />

      <div className="relative z-10 lg:pl-[212px]">
        <header className="sticky top-0 z-20 flex h-[62px] items-center justify-between border-b bg-background/86 px-3 backdrop-blur-xl sm:px-5">
          <div className="flex items-center gap-2 lg:hidden">
            <img src="/brand/compos-icon.png" alt="" className="size-8 rounded-md object-cover" />
            <div>
              <div className="text-xs font-semibold">{merchant?.name ?? "Merchant"}</div>
              <div className="text-[9px] text-muted-foreground">COMPOS Operator</div>
            </div>
          </div>
          <div className="hidden min-w-0 items-center gap-2 lg:flex">
            <div className="text-xs font-medium text-muted-foreground">
              {visibleNavItems.find(
                (item) =>
                  location.pathname === item.href ||
                  (item.href !== "/" && location.pathname.startsWith(item.href)),
              )?.label ?? "Operator"}
            </div>
            <span className="text-border">/</span>
            <div className="truncate text-xs text-muted-foreground">Offline-first workspace</div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="hidden items-center gap-1.5 text-[10px] text-muted-foreground md:flex">
              <IconClock className="size-3" /> Terakhir sync {fromNow(lastSyncAt?.value)}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleConnection}
              className={cn(connection === "OFFLINE" && "border-amber-500/25 bg-amber-500/5")}
            >
              <ConnectionBadge state={connection} />
              <span className="hidden sm:inline">
                {connection === "ONLINE"
                  ? "Coba offline"
                  : connection === "OFFLINE"
                    ? "Hubungkan"
                    : "Menghubungkan"}
              </span>
            </Button>
            <NavLink to="/sync">
              <Button variant="secondary" size="sm" className="relative">
                <IconCloudUpload />
                <span className="hidden sm:inline">Sync Queue</span>
                {pendingCount > 0 && (
                  <span className="ml-0.5 rounded bg-amber-500/15 px-1.5 text-[10px] font-bold text-amber-300">
                    {pendingCount}
                  </span>
                )}
              </Button>
            </NavLink>
          </div>
        </header>

        {connection === "OFFLINE" && (
          <div className="flex items-center justify-center gap-2 border-b border-amber-500/15 bg-amber-500/8 px-3 py-2 text-center text-[11px] text-amber-200">
            <IconWifiOff className="size-3.5" /> <strong>Offline Mode.</strong> Penjualan tetap aman
            di perangkat ini dan akan sync otomatis saat terhubung.
          </div>
        )}

        <main className="min-h-[calc(100svh-62px)] pb-16 lg:pb-0">{children}</main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid h-16 border-t bg-background/94 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        style={{ gridTemplateColumns: `repeat(${visibleNavItems.length}, minmax(0, 1fr))` }}
      >
        {visibleNavItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === "/"}
              className={({ isActive }) =>
                cn(
                  "relative flex flex-col items-center justify-center gap-0.5 text-[9px] font-medium text-muted-foreground",
                  isActive && "text-primary",
                )
              }
            >
              <Icon className="size-[18px]" />
              {item.label}
              {item.href === "/sync" && pendingCount > 0 && (
                <span className="absolute right-[25%] top-2 size-2 rounded-full bg-amber-400 ring-2 ring-background" />
              )}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}

function DesktopSidebar(props: {
  items: typeof navItems
  merchantName?: string
  merchantId?: string
  operatorName?: string
  admin: boolean
  pendingCount: number
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[212px] flex-col border-r bg-background/92 backdrop-blur-xl lg:flex">
      <div className="flex h-[62px] items-center gap-2.5 border-b px-4">
        <img src="/brand/compos-icon.png" alt="COMPOS" className="size-8 rounded-md object-cover" />
        <div>
          <div className="text-sm font-semibold tracking-[0.08em]">COMPOS</div>
        </div>
      </div>
      <div className="px-2 py-3">
        <button className="flex w-full items-center gap-2 rounded-md border bg-card p-2 text-left">
          <div className="grid size-7 place-items-center rounded bg-primary/12 text-primary">
            <IconBuildingStore className="size-4" />
          </div>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium">
              {props.merchantName ?? "Merchant"}
            </span>
            <span className="block truncate text-[10px] text-muted-foreground">
              {props.merchantId ?? "Local workspace"}
            </span>
          </span>
          <IconChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </div>
      <nav className="grid gap-1 px-2 pt-1">
        {props.items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === "/"}
              className={({ isActive }) =>
                cn(
                  "flex h-8 items-center gap-2 rounded-md px-2.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground",
                  isActive && "bg-accent text-foreground",
                )
              }
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
              {item.href === "/sync" && props.pendingCount > 0 && (
                <span className="ml-auto rounded-full bg-amber-500/15 px-1.5 text-[9px] font-bold text-amber-300">
                  {props.pendingCount}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>
      <div className="mt-auto border-t p-2">
        <NavLink
          to="/settings"
          className="flex h-8 items-center gap-2 rounded-md px-2.5 text-xs text-muted-foreground hover:bg-accent"
        >
          <IconSettings className="size-4" /> Pengaturan
        </NavLink>
        <div className="mt-2 flex items-center gap-2 rounded-md border bg-card/70 p-2">
          <div className="grid size-7 place-items-center rounded-full bg-zinc-700 text-[10px] font-semibold">
            OP
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium">{props.operatorName ?? "Operator"}</div>
            <div className="text-[10px] text-muted-foreground">
              {props.admin ? "Administrator" : "Kasir"}
            </div>
          </div>
          <span className="size-1.5 rounded-full bg-emerald-400" />
        </div>
      </div>
    </aside>
  )
}
