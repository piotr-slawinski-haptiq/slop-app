import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq, sql } from 'drizzle-orm'

import { db, pool } from '@/db'
import {
  fulfillmentSettings,
  fulfillments,
  items,
  magicLinkTokens,
  notifications,
  requests,
  sessions,
  users,
} from '@/db/schema'
import { generateToken, hashToken } from '@/lib/security'
import {
  addRequest,
  cancelRequestById,
  deleteItem,
  findOrCreateItem,
  fulfillCurrentList,
  getDashboardData,
  markNotificationRead,
  updateThreshold,
  upsertItem,
} from '@/lib/slop/service.server'
import type { SessionUser } from '@/lib/auth/types'

async function clearAllTables() {
  await db.delete(notifications)
  await db.delete(requests)
  await db.delete(fulfillments)
  await db.delete(items)
  await db.delete(sessions)
  await db.delete(magicLinkTokens)
  await db.delete(users)
  await db.delete(fulfillmentSettings)
}

async function createTestUser(
  email: string,
  role: 'orderer' | 'colleague',
): Promise<SessionUser> {
  const [user] = await db
    .insert(users)
    .values({ email, role })
    .returning()
  return { id: user.id, email: user.email, role: user.role }
}

describe('SLOP integration tests (real DB)', () => {
  let orderer: SessionUser
  let colleague: SessionUser

  beforeAll(async () => {
    await clearAllTables()
    orderer = await createTestUser('orderer@haptiq.com', 'orderer')
    colleague = await createTestUser('colleague@haptiq.com', 'colleague')
  })

  afterAll(async () => {
    await clearAllTables()
    await pool.end()
  })

  test('magic link token generation and hashing works', () => {
    const token = generateToken()
    expect(token).toBeTruthy()
    expect(token.length).toBeGreaterThan(10)

    const hash = hashToken(token)
    expect(hash).toBeTruthy()
    expect(hashToken(token)).toBe(hash)
    expect(hashToken('different')).not.toBe(hash)
  })

  test('orderer can create catalog items', async () => {
    const milk = await upsertItem(orderer, {
      name: 'Milk',
      category: 'Dairy',
      isEvergreen: true,
    })

    expect(milk.name).toBe('Milk')
    expect(milk.category).toBe('Dairy')
    expect(milk.isEvergreen).toBe(true)

    const coffee = await upsertItem(orderer, {
      name: 'Coffee',
      category: 'Pantry',
      isEvergreen: false,
    })

    expect(coffee.name).toBe('Coffee')
    expect(coffee.isEvergreen).toBe(false)

    const snackBars = await upsertItem(orderer, {
      name: 'Snack Bars',
      category: 'Snacks',
      isEvergreen: false,
    })

    expect(snackBars.name).toBe('Snack Bars')
  })

  test('colleague cannot create catalog items', async () => {
    await expect(
      upsertItem(colleague, {
        name: 'Forbidden',
        category: 'Test',
        isEvergreen: false,
      }),
    ).rejects.toThrow('Only orderers')
  })

  test('orderer can update catalog item (toggle evergreen)', async () => {
    const allItems = await db.select().from(items)
    const coffee = allItems.find((i) => i.name === 'Coffee')!

    const updated = await upsertItem(orderer, {
      id: coffee.id,
      name: coffee.name,
      category: coffee.category,
      isEvergreen: true,
    })

    expect(updated.isEvergreen).toBe(true)

    await upsertItem(orderer, {
      id: coffee.id,
      name: coffee.name,
      category: coffee.category,
      isEvergreen: false,
    })
  })

  test('adding a request to the list works (colleague can add)', async () => {
    const allItems = await db.select().from(items)
    const milk = allItems.find((i) => i.name === 'Milk')!

    const result = await addRequest(colleague, milk.id)
    expect(result.alreadyOnList).toBe(false)
    expect(result.trigger).toBe('immediate')
  })

  test('adding the same item again is idempotent', async () => {
    const allItems = await db.select().from(items)
    const milk = allItems.find((i) => i.name === 'Milk')!

    const result = await addRequest(colleague, milk.id)
    expect(result.alreadyOnList).toBe(true)
  })

  test('adding more items to reach threshold', async () => {
    await updateThreshold(orderer, 3)

    const allItems = await db.select().from(items)
    const coffee = allItems.find((i) => i.name === 'Coffee')!
    const snackBars = allItems.find((i) => i.name === 'Snack Bars')!

    const r1 = await addRequest(colleague, coffee.id)
    expect(r1.alreadyOnList).toBe(false)

    const r2 = await addRequest(colleague, snackBars.id)
    expect(r2.alreadyOnList).toBe(false)
    expect(r2.trigger).toBe('threshold')
  })

  test('dashboard data shows current list, items, threshold', async () => {
    const data = await getDashboardData(orderer)

    expect(data.currentUser.email).toBe('orderer@haptiq.com')
    expect(data.items.length).toBe(3)
    expect(data.currentList.length).toBe(3)
    expect(data.threshold.currentDistinctItems).toBe(3)
    expect(data.threshold.minPendingItems).toBe(3)
    expect(data.threshold.remainingUntilThreshold).toBe(0)
    expect(data.notifications.length).toBeGreaterThan(0)
  })

  test('cancelling a request removes it from the list', async () => {
    const dataBefore = await getDashboardData(orderer)
    const snackBarRequest = dataBefore.currentList.find(
      (r) => r.itemName === 'Snack Bars',
    )!

    await cancelRequestById(colleague, snackBarRequest.id)

    const dataAfter = await getDashboardData(orderer)
    expect(dataAfter.currentList.length).toBe(2)
  })

  test('re-add cancelled item works', async () => {
    const allItems = await db.select().from(items)
    const snackBars = allItems.find((i) => i.name === 'Snack Bars')!

    const result = await addRequest(colleague, snackBars.id)
    expect(result.alreadyOnList).toBe(false)
  })

  test('colleague cannot fulfill the list', async () => {
    await expect(fulfillCurrentList(colleague)).rejects.toThrow(
      'Only orderers',
    )
  })

  test('orderer can fulfill the list', async () => {
    const result = await fulfillCurrentList(orderer)
    expect(result.fulfilledCount).toBe(3)
    expect(result.fulfillmentId).toBeGreaterThan(0)

    const dataAfter = await getDashboardData(orderer)
    expect(dataAfter.currentList.length).toBe(0)
    expect(dataAfter.pastFulfillments.length).toBe(1)
    expect(dataAfter.pastFulfillments[0].requests.length).toBe(3)
  })

  test('fulfilling empty list throws error', async () => {
    await expect(fulfillCurrentList(orderer)).rejects.toThrow(
      'no pending items',
    )
  })

  test('findOrCreateItem creates new item if not found', async () => {
    const tea = await findOrCreateItem(orderer, { name: 'Green Tea' })
    expect(tea.name).toBe('Green Tea')
    expect(tea.category).toBe('General')
    expect(tea.isEvergreen).toBe(false)

    const teaAgain = await findOrCreateItem(orderer, { name: 'Green Tea' })
    expect(teaAgain.id).toBe(tea.id)
  })

  test('orderer can delete catalog items', async () => {
    const allItems = await db.select().from(items)
    const tea = allItems.find((i) => i.name === 'Green Tea')!

    await deleteItem(orderer, tea.id)

    const remaining = await db.select().from(items)
    expect(remaining.find((i) => i.name === 'Green Tea')).toBeUndefined()
  })

  test('orderer can mark notification as read', async () => {
    const data = await getDashboardData(orderer)
    if (data.notifications.length > 0) {
      const firstNotification = data.notifications[0]
      await markNotificationRead(orderer, firstNotification.id)

      const dataAfter = await getDashboardData(orderer)
      const still = dataAfter.notifications.find(
        (n) => n.id === firstNotification.id,
      )
      expect(still).toBeUndefined()
    }
  })

  test('threshold update works and validates', async () => {
    const updated = await updateThreshold(orderer, 10)
    expect(updated.minPendingItems).toBe(10)

    await expect(updateThreshold(orderer, 0)).rejects.toThrow(
      'at least 1',
    )
    await expect(updateThreshold(orderer, -5)).rejects.toThrow(
      'at least 1',
    )
  })

  test('full second cycle: add items, fulfill again', async () => {
    const allItems = await db.select().from(items)
    const milk = allItems.find((i) => i.name === 'Milk')!
    const coffee = allItems.find((i) => i.name === 'Coffee')!

    await addRequest(orderer, milk.id)
    await addRequest(orderer, coffee.id)

    const dataBeforeFulfill = await getDashboardData(orderer)
    expect(dataBeforeFulfill.currentList.length).toBe(2)

    const result = await fulfillCurrentList(orderer)
    expect(result.fulfilledCount).toBe(2)

    const dataAfterFulfill = await getDashboardData(orderer)
    expect(dataAfterFulfill.currentList.length).toBe(0)
    expect(dataAfterFulfill.pastFulfillments.length).toBe(2)
  })
})
