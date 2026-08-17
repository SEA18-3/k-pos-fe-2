import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { registerSW } from "virtual:pwa-register"

import App from "./app/app"
import "./index.css"
import "@fontsource-variable/inter"

registerSW({ immediate: true })

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
