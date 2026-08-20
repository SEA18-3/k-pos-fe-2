/**
 * device-api.ts
 *
 * Mengintegrasikan fitur device pairing di K-POS.
 */

import { z } from "zod"
import { requestJson } from "@/infrastructure/api/http-client"

const pairDeviceResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  data: z.object({
    id_device: z.string(),
    status: z.string(),
  }),
})

export type PairDeviceResponse = z.output<typeof pairDeviceResponseSchema>

/**
 * Melakukan pairing perangkat menggunakan 6-digit kode
 */
export async function pairDevice(input: {
  pairing_code: string
  hardware_id: string
}) {
  return requestJson("/api/v1/devices/pair", pairDeviceResponseSchema, {
    method: "POST",
    body: JSON.stringify(input),
  })
}
