import { getAuthSession, isOnlineSessionValid } from "@/infrastructure/persistence/session-repository"
import { fetchCatalogProducts } from "./catalog-api"
import { mapProduct } from "@/infrastructure/api/mappers"
import { replaceCatalog } from "@/infrastructure/persistence/catalog-repository"

export async function refreshActiveCatalog() {
  const session = await getAuthSession()
  if (!session || !isOnlineSessionValid(session)) return false
  const backendProducts = await fetchCatalogProducts(session.token)
  await replaceCatalog(backendProducts.map(mapProduct))
  return true
}
