import { database } from "./database"

export async function readSetting(key: string) {
  return (await database.settings.get(key))?.value
}

export async function writeSetting(key: string, value: string) {
  await database.settings.put({ key, value })
}

export async function removeSetting(key: string) {
  await database.settings.delete(key)
}
