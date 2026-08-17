import { spawn } from "node:child_process"
import { once } from "node:events"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..")
const repositoryRoot = join(webRoot, "../..")
const children = []
let shuttingDown = false

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => void shutdown(130))
}

try {
  const api = startNode(join(repositoryRoot, "apps/api/dist/server.js"), [], repositoryRoot, {
    LOG_LEVEL: "warn",
  })
  const preview = startNode(
    join(webRoot, "node_modules/vite/bin/vite.js"),
    ["preview", "--host", "127.0.0.1", "--port", "4173"],
    webRoot,
  )
  await Promise.all([
    waitForUrl("http://127.0.0.1:3001/health", api),
    waitForUrl("http://127.0.0.1:4173", preview),
  ])
  await runPlaywright()
} finally {
  await stopAll()
}

function startNode(modulePath, arguments_, cwd, extraEnvironment = {}) {
  const child = spawn(process.execPath, [modulePath, ...arguments_], {
    cwd,
    env: { ...process.env, ...extraEnvironment },
    stdio: "inherit",
  })
  children.push(child)
  return child
}

async function waitForUrl(url, child) {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`${url} process exited before becoming healthy`)
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Service is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`${url} did not become healthy within 30 seconds`)
}

async function runPlaywright() {
  const cli = join(webRoot, "node_modules/@playwright/test/cli.js")
  const child = startNode(cli, ["test"], webRoot)
  const [code] = await once(child, "exit")
  children.splice(children.indexOf(child), 1)
  if (code !== 0) throw new Error(`Playwright exited with code ${code ?? "null"}`)
}

async function stopAll() {
  await Promise.all(children.splice(0).map(stop))
}

async function stop(child) {
  if (child.exitCode !== null) return
  child.kill()
  await Promise.race([once(child, "exit"), new Promise((resolve) => setTimeout(resolve, 2_000))])
  if (child.exitCode === null) child.kill("SIGKILL")
}

async function shutdown(exitCode) {
  if (shuttingDown) return
  shuttingDown = true
  await stopAll()
  process.exit(exitCode)
}
