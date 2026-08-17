import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { database } from "./database"
import { OrderedDraftPersistence } from "./draft-repository"

beforeEach(async () => {
  await database.delete()
  await database.open()
})

afterEach(() => database.close())

describe("ordered draft persistence", () => {
  it("keeps the newest rapid cart snapshot", async () => {
    const persistence = new OrderedDraftPersistence()
    void persistence.save({ coffee: 1 })
    void persistence.save({ coffee: 2 })
    void persistence.save({ coffee: 2, meal: 1 })
    await persistence.flush()
    expect((await database.drafts.get("active"))?.cart).toEqual({ coffee: 2, meal: 1 })
  })

  it("cannot resurrect a draft after pending writes are discarded", async () => {
    const persistence = new OrderedDraftPersistence()
    void persistence.save({ coffee: 1 })
    await persistence.discardPending()
    expect(await database.drafts.get("active")).toBeUndefined()
  })
})
