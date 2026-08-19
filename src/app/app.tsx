import { lazy, Suspense, useEffect, useState } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "sonner"

import { AppShell } from "@/app/app-shell"
import { useCartDraftLifecycle } from "@/features/checkout/cart-draft-lifecycle"
import { readActiveDraft } from "@/infrastructure/persistence/draft-repository"
import { initializeLocalPersistence } from "@/infrastructure/persistence/initialize"
import { getAuthSession } from "@/infrastructure/persistence/session-repository"
import { startSyncScheduler } from "@/features/sync/sync-runtime"
import type { AuthSession, DeviceIdentity } from "@/infrastructure/persistence/models"
import { useUiStore } from "@/app/ui-store"

const CheckoutPage = lazy(() =>
  import("@/features/checkout/checkout-page").then((module) => ({ default: module.CheckoutPage })),
)
const ProductsPage = lazy(() =>
  import("@/features/catalog/products-page").then((module) => ({ default: module.ProductsPage })),
)
const SettingsPage = lazy(() =>
  import("@/app/settings-page").then((module) => ({ default: module.SettingsPage })),
)
const SyncPage = lazy(() =>
  import("@/features/sync/sync-page").then((module) => ({ default: module.SyncPage })),
)
const TransactionDetailPage = lazy(() =>
  import("@/features/transactions/transaction-detail-page").then((module) => ({
    default: module.TransactionDetailPage,
  })),
)
const TransactionsPage = lazy(() =>
  import("@/features/transactions/transactions-page").then((module) => ({
    default: module.TransactionsPage,
  })),
)
const LoginPage = lazy(() =>
  import("@/features/auth/login-page").then((module) => ({ default: module.LoginPage })),
)
const ReconciliationPage = lazy(() =>
  import("@/features/reconciliation/reconciliation-page").then((module) => ({
    default: module.ReconciliationPage,
  })),
)
const AdminUsersPage = lazy(() =>
  import("@/features/admin-users/admin-users-page").then((module) => ({
    default: module.AdminUsersPage,
  })),
)
const AdminCatalogPage = lazy(() =>
  import("@/features/admin-catalog/admin-catalog-page").then((module) => ({
    default: module.AdminCatalogPage,
  })),
)

function RouteFallback() {
  return (
    <div className="grid min-h-[60svh] place-items-center">
      <div className="text-center">
        <div className="mx-auto mb-2 size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-[10px] text-muted-foreground">Membuka data lokal…</p>
      </div>
    </div>
  )
}

export default function App() {
  const [ready, setReady] = useState(false)
  const [device, setDevice] = useState<DeviceIdentity | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  useCartDraftLifecycle(ready)

  useEffect(() => {
    void (async () => {
      const initializedDevice = await initializeLocalPersistence()
      const draft = await readActiveDraft()
      if (draft) useUiStore.getState().hydrateCart(draft.cart)
      setDevice(initializedDevice)
      setSession(await getAuthSession())
      setReady(true)
    })()
  }, [])

  useEffect(() => {
    if (!session) return
    return startSyncScheduler()
  }, [session])

  if (!ready)
    return (
      <main className="grid min-h-svh place-items-center bg-background text-foreground">
        <div className="text-center">
          <div className="mx-auto mb-3 grid size-9 place-items-center rounded-md bg-primary text-xs font-black text-primary-foreground">
            OP
          </div>
          <p className="text-xs text-muted-foreground">Membuka database lokal…</p>
        </div>
      </main>
    )
  if (!session && device)
    return (
      <Suspense fallback={<RouteFallback />}>
        <LoginPage device={device} onAuthenticated={setSession} />
      </Suspense>
    )

  return (
    <BrowserRouter>
      <AppShell>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<CheckoutPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/transactions/:id" element={<TransactionDetailPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/sync" element={<SyncPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route
              path="/reconciliation"
              element={
                session?.operator.role === "OWNER" ? (
                  <ReconciliationPage />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route
              path="/admin/users"
              element={
                session?.operator.role === "OWNER" ? (
                  <AdminUsersPage />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route
              path="/admin/catalog"
              element={
                session?.operator.role === "OWNER" ? (
                  <AdminCatalogPage />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AppShell>
      <Toaster theme="light" position="top-center" richColors closeButton />
    </BrowserRouter>
  )
}
