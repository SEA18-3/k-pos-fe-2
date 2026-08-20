import type { ConnectionState } from "@/infrastructure/persistence/models"

type SchedulerDependencies = {
  probe: (signal: AbortSignal) => Promise<unknown>
  sync: () => Promise<number>
  refreshCatalog: () => Promise<unknown>
  forcedOffline: () => boolean
  setConnection: (state: ConnectionState) => void
  random: () => number
}

export function createBrowserSyncScheduler(dependencies: SchedulerDependencies) {
  let wasReachable = false
  async function refreshConnectivity() {
    if (dependencies.forcedOffline() || !navigator.onLine) {
      wasReachable = false
      dependencies.setConnection("OFFLINE")
      return false
    }
    dependencies.setConnection("RECONNECTING")
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 30_000)
    try {
      await dependencies.probe(controller.signal)
      dependencies.setConnection("ONLINE")
      if (!wasReachable) {
        wasReachable = true
        await dependencies.refreshCatalog().catch(() => undefined)
      }
      return true
    } catch {
      wasReachable = false
      dependencies.setConnection("OFFLINE")
      return false
    } finally {
      window.clearTimeout(timeout)
    }
  }

  function start() {
    let stopped = false
    const reconnectTimers = new Set<number>()
    const syncIfReachable = async () => {
      if (!stopped && (await refreshConnectivity())) await dependencies.sync()
    }
    const schedule = () => {
      const timer = window.setTimeout(
        () => {
          reconnectTimers.delete(timer)
          void syncIfReachable()
        },
        Math.round(dependencies.random() * 1_500),
      )
      reconnectTimers.add(timer)
    }
    const handleOffline = () => dependencies.setConnection("OFFLINE")
    window.addEventListener("online", schedule)
    window.addEventListener("offline", handleOffline)
    schedule()
    return () => {
      stopped = true
      reconnectTimers.forEach((timer) => window.clearTimeout(timer))
      window.removeEventListener("online", schedule)
      window.removeEventListener("offline", handleOffline)
    }
  }

  return { refreshConnectivity, start }
}
