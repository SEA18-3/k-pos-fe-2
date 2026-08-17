import { randomUUID } from "node:crypto"

import { expect, test, type BrowserContext, type Page } from "@playwright/test"

const apiUrl = "http://127.0.0.1:3001"

async function login(page: Page, role: "OPERATOR" | "ADMIN" = "OPERATOR") {
  await page.goto("/")
  await page.getByLabel("Kode operator").fill(role === "ADMIN" ? "ADMIN" : "RANI")
  await page.getByLabel("PIN operator").fill(role === "ADMIN" ? "9999" : "1234")
  await page.getByRole("button", { name: "Aktifkan & masuk" }).click()
  await expect(page.getByText(role === "ADMIN" ? "Dimas Admin" : "Rani A.").first()).toBeVisible()
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (navigator.serviceWorker.controller) return
    await new Promise<void>((resolve) => {
      navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true })
    })
  })
}

async function checkout(page: Page) {
  await page.getByRole("button", { name: /Kopi Susu Aren/ }).click()
  await page.getByRole("button", { name: /Pilih pembayaran/ }).click()
  await page.getByRole("button", { name: "Uang pas" }).click()
  await page.getByRole("button", { name: "Konfirmasi penjualan" }).click()
}

async function localState(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("operator-pos-v3")
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const transaction = database.transaction(["transactions", "settings"], "readonly")
    const sales = await new Promise<unknown[]>((resolve, reject) => {
      const request = transaction.objectStore("transactions").getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const session = await new Promise<{ value: string }>((resolve, reject) => {
      const request = transaction.objectStore("settings").get("authSession")
      request.onsuccess = () => resolve(request.result as { value: string })
      request.onerror = () => reject(request.error)
    })
    database.close()
    return { sales, session: JSON.parse(session.value) as { token: string } }
  })
}

test("1. offline checkout survives a browser reload", async ({ page, context }) => {
  await login(page)
  await context.setOffline(true)
  await checkout(page)
  await expect(page.getByText("Provisional tersimpan")).toBeVisible()
  await page.getByRole("button", { name: "Transaksi baru" }).click()
  await page.reload()
  await expect(page.getByText("Selamat bekerja, Rani A.")).toBeVisible()
  await page.getByRole("link", { name: "Transaksi" }).first().click()
  await expect(page.getByText("Pending Sync").first()).toBeVisible()
})

test("2. reconnect automatically settles the queued sale", async ({ page, context }) => {
  await login(page)
  await context.setOffline(true)
  await checkout(page)
  await expect(page.getByText("Provisional tersimpan")).toBeVisible()
  await context.setOffline(false)
  await expect(page.getByText("Penjualan settled")).toBeVisible({ timeout: 20_000 })
})

test("3. a dropped successful response retries exactly once", async ({ page, request }) => {
  await login(page)
  let dropped = false
  await page.route("**/v1/sync/transactions", async (route) => {
    if (!dropped) {
      dropped = true
      await route.fetch()
      await route.abort("failed")
      return
    }
    await route.continue()
  })
  await checkout(page)
  await expect(page.getByText("Provisional tersimpan")).toBeVisible()
  await page.getByRole("button", { name: "Transaksi baru" }).click()
  await page.getByRole("link", { name: "Sync & Data" }).first().click()
  const retry = page.getByRole("button", { name: "Retry" }).first()
  if (await retry.isVisible()) await retry.click()
  await expect(page.getByText("Semua data sudah settled")).toBeVisible({ timeout: 20_000 })
  const state = await localState(page)
  const sale = state.sales[0] as { id: string }
  const response = await request.get(`${apiUrl}/v1/transactions?limit=100`, {
    headers: { authorization: `Bearer ${state.session.token}` },
  })
  const body = (await response.json()) as { transactions: Array<{ id: string }> }
  expect(body.transactions.filter((entry) => entry.id === sale.id)).toHaveLength(1)
})

test("4. two device contexts can sell for one merchant", async ({ browser }) => {
  const contexts: BrowserContext[] = [await browser.newContext(), await browser.newContext()]
  try {
    const pages = await Promise.all(contexts.map((context) => context.newPage()))
    await Promise.all(pages.map((page) => login(page)))
    await Promise.all(pages.map((page) => checkout(page)))
    await Promise.all(
      pages.map((page) =>
        expect(page.getByText("Penjualan settled")).toBeVisible({ timeout: 20_000 }),
      ),
    )
    const states = await Promise.all(pages.map((page) => localState(page)))
    expect(states.every((state) => state.sales.length === 1)).toBe(true)
  } finally {
    await Promise.all(contexts.map((context) => context.close()))
  }
})

test("5. one malformed item does not reject its valid batch sibling", async ({ request }) => {
  const deviceId = `e2e-partial-${randomUUID()}`
  await request.post(`${apiUrl}/v1/devices/register`, {
    data: {
      merchantCode: "KEDAI-NUSA",
      activationCode: "COMP18-DEMO",
      deviceId,
      deviceName: "E2E partial",
    },
  })
  const loginResponse = await request.post(`${apiUrl}/v1/auth/login`, {
    data: { merchantCode: "KEDAI-NUSA", operatorCode: "RANI", pin: "1234", deviceId },
  })
  const session = (await loginResponse.json()) as {
    token: string
    merchantId: string
    operator: { id: string }
  }
  const valid = salePayload(session.operator.id)
  const response = await request.post(`${apiUrl}/v1/sync/transactions`, {
    headers: { authorization: `Bearer ${session.token}` },
    data: {
      schemaVersion: 1,
      merchantId: session.merchantId,
      deviceId,
      batchId: randomUUID(),
      transactions: [valid, { ...salePayload(session.operator.id), total: 1 }],
    },
  })
  const body = (await response.json()) as { results: Array<{ status: string }> }
  expect(body.results.map((result) => result.status)).toEqual(["ACCEPTED", "REJECTED_PERMANENT"])
})

test("6. Admin creates and deactivates a cashier", async ({ page }) => {
  await login(page, "ADMIN")
  await page.getByRole("link", { name: "Akun & Device" }).click()
  const code = `E2E${randomUUID().slice(0, 5).toUpperCase()}`
  await page.getByPlaceholder("Kode operator").fill(code)
  await page.getByPlaceholder("Nama lengkap").fill("E2E Cashier")
  await page.getByPlaceholder("PIN 4–8 digit").fill("4567")
  await page.getByRole("button", { name: "Tambah" }).click()
  const row = page.getByTestId(`operator-${code}`)
  await expect(row).toContainText("E2E Cashier")
  await row.getByRole("button", { name: "Nonaktifkan" }).click()
  await expect(row).toContainText("NONAKTIF")
})

test("7. Admin changes price and archives a product", async ({ page }) => {
  await login(page, "ADMIN")
  await page.getByRole("link", { name: "Kelola Katalog" }).click()
  const sku = `E2E-${randomUUID().slice(0, 6).toUpperCase()}`
  await page.getByLabel("SKU").fill(sku)
  await page.getByLabel("Nama produk").fill("E2E Seasonal Drink")
  await page.getByLabel("Harga (Rp)").fill("15000")
  await page.getByRole("button", { name: "Simpan" }).click()
  const product = page.getByTestId(`product-${sku}`)
  await expect(product).toBeVisible()
  await product.getByRole("button", { name: "Edit" }).click()
  await page.getByLabel("Harga (Rp)").fill("17500")
  await page.getByRole("button", { name: "Simpan" }).click()
  await expect(product).toContainText(/17\.500/)
  await product.getByRole("button", { name: "Arsipkan" }).click()
  await expect(product).toContainText("Archived")
})

test("8. expired offline lease preserves data and blocks a new checkout", async ({
  page,
  context,
}) => {
  await login(page)
  await context.setOffline(true)
  await checkout(page)
  await page.getByRole("button", { name: "Transaksi baru" }).click()
  await expireOfflineLease(page)
  await page.reload()
  await page.getByRole("link", { name: "Transaksi" }).first().click()
  await expect(page.getByText("Pending Sync").first()).toBeVisible()
  await page.getByRole("link", { name: "Kasir" }).first().click()
  await checkout(page)
  await expect(page.getByText(/Lease checkout offline sudah berakhir/)).toBeVisible()
})

function salePayload(operatorId: string) {
  const transactionId = randomUUID()
  return {
    transactionId,
    invoiceNumber: `E2E-${transactionId.slice(0, 8)}`,
    operatorId,
    transactionStatus: "CONFIRMED",
    paymentMethod: "CASH",
    paymentVerificationType: "SYSTEM_VERIFIABLE",
    subtotal: 22000,
    discount: 0,
    tax: 0,
    total: 22000,
    createdAtDevice: new Date().toISOString(),
    items: [
      {
        productId: "prd-aren",
        name: "Kopi Susu Aren",
        quantity: 1,
        unitPrice: 22000,
        subtotal: 22000,
      },
    ],
  }
}

async function expireOfflineLease(page: Page) {
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("operator-pos-v3")
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const transaction = database.transaction("settings", "readwrite")
    const store = transaction.objectStore("settings")
    const record = await new Promise<{ key: string; value: string }>((resolve, reject) => {
      const request = store.get("authSession")
      request.onsuccess = () => resolve(request.result as { key: string; value: string })
      request.onerror = () => reject(request.error)
    })
    const session = JSON.parse(record.value) as { offlineLeaseExpiresAt: string }
    session.offlineLeaseExpiresAt = new Date(0).toISOString()
    store.put({ key: record.key, value: JSON.stringify(session) })
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
    database.close()
  })
}
