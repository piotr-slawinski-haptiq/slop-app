import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  sql,
} from 'drizzle-orm'

import { db } from '@/db'
import {
  fulfillmentSettings,
  fulfillments,
  fulfillmentTriggerEnum,
  items,
  notificationTypeEnum,
  notifications,
  requestStatusEnum,
  requests,
  users,
} from '@/db/schema'
import { HttpError } from '@/lib/http-error'

import type { SessionUser } from '@/lib/auth/types'
import type { SQL } from 'drizzle-orm'

type RequestStatus = (typeof requestStatusEnum.enumValues)[number]
type FulfillmentTrigger = (typeof fulfillmentTriggerEnum.enumValues)[number]
type NotificationType = (typeof notificationTypeEnum.enumValues)[number]

const activeRequestStatuses: Array<RequestStatus> = ['pending', 'in_fulfillment']

const activeListWhere = and(
  inArray(requests.status, activeRequestStatuses),
  isNull(requests.fulfillmentId),
) as SQL

function assertOrderer(user: SessionUser): void {
  if (user.role !== 'orderer') {
    throw new HttpError(403, 'Only orderers can perform this action.')
  }
}

function normalizeText(value: string, fieldName: string): string {
  const normalized = value.trim()
  if (!normalized) {
    throw new HttpError(400, `${fieldName} is required.`)
  }
  return normalized
}

async function ensureSettings() {
  const current = await db
    .select()
    .from(fulfillmentSettings)
    .where(eq(fulfillmentSettings.id, 1))
    .limit(1)

  if (current[0]) {
    return current[0]
  }

  const inserted = await db
    .insert(fulfillmentSettings)
    .values({
      id: 1,
      minPendingItems: 5,
    })
    .onConflictDoNothing()
    .returning()

  if (inserted[0]) {
    return inserted[0]
  }

  const fallback = await db
    .select()
    .from(fulfillmentSettings)
    .where(eq(fulfillmentSettings.id, 1))
    .limit(1)

  if (!fallback[0]) {
    throw new HttpError(500, 'Failed to initialize fulfillment settings.')
  }

  return fallback[0]
}

async function getDistinctActiveItemCount(): Promise<number> {
  const [{ count }] = await db
    .select({
      count: sql<number>`count(distinct ${requests.itemId})`,
    })
    .from(requests)
    .where(activeListWhere)

  return Number(count)
}

async function notifyOrderers(
  type: NotificationType,
  message: string,
  metadata?: Record<string, unknown>,
) {
  const orderers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, 'orderer'))

  if (!orderers.length) {
    return
  }

  await db.insert(notifications).values(
    orderers.map((orderer) => ({
      userId: orderer.id,
      type,
      message,
      metadata,
    })),
  )
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  )
}

export async function getDashboardData(user: SessionUser) {
  const [allItems, currentList, settings, unreadNotifications] =
    await Promise.all([
      db.select().from(items).orderBy(asc(items.name)),
      db
        .select({
          id: requests.id,
          status: requests.status,
          createdAt: requests.createdAt,
          itemId: requests.itemId,
          itemName: items.name,
          itemCategory: items.category,
          itemIsEvergreen: items.isEvergreen,
          requesterId: users.id,
          requesterEmail: users.email,
        })
        .from(requests)
        .innerJoin(items, eq(requests.itemId, items.id))
        .innerJoin(users, eq(requests.requesterId, users.id))
        .where(activeListWhere)
        .orderBy(desc(requests.createdAt)),
      ensureSettings(),
      db
        .select({
          id: notifications.id,
          type: notifications.type,
          message: notifications.message,
          metadata: notifications.metadata,
          createdAt: notifications.createdAt,
        })
        .from(notifications)
        .where(
          and(eq(notifications.userId, user.id), isNull(notifications.readAt)),
        )
        .orderBy(desc(notifications.createdAt))
        .limit(20),
    ])

  const distinctActiveCount = new Set(currentList.map((entry) => entry.itemId)).size

  let history: Array<{
    id: number
    trigger: FulfillmentTrigger
    fulfilledAt: Date | null
    createdAt: Date
    requests: Array<{
      id: number
      itemId: number
      itemName: string
      itemCategory: string
      requesterEmail: string
      createdAt: Date
    }>
  }> = []

  if (user.role === 'orderer') {
    const fulfillmentRows = await db
      .select({
        id: fulfillments.id,
        trigger: fulfillments.trigger,
        fulfilledAt: fulfillments.fulfilledAt,
        createdAt: fulfillments.createdAt,
      })
      .from(fulfillments)
      .where(eq(fulfillments.status, 'fulfilled'))
      .orderBy(desc(fulfillments.fulfilledAt), desc(fulfillments.createdAt))
      .limit(20)

    if (fulfillmentRows.length) {
      const fulfillmentIds = fulfillmentRows.map((row) => row.id)
      const requestRows = await db
        .select({
          id: requests.id,
          fulfillmentId: requests.fulfillmentId,
          itemId: requests.itemId,
          itemName: items.name,
          itemCategory: items.category,
          requesterEmail: users.email,
          createdAt: requests.createdAt,
        })
        .from(requests)
        .innerJoin(items, eq(requests.itemId, items.id))
        .innerJoin(users, eq(requests.requesterId, users.id))
        .where(inArray(requests.fulfillmentId, fulfillmentIds))
        .orderBy(desc(requests.createdAt))

      const grouped = new Map<
        number,
        Array<{
          id: number
          itemId: number
          itemName: string
          itemCategory: string
          requesterEmail: string
          createdAt: Date
        }>
      >()

      for (const row of requestRows) {
        if (!row.fulfillmentId) {
          continue
        }

        const existing = grouped.get(row.fulfillmentId) ?? []
        existing.push({
          id: row.id,
          itemId: row.itemId,
          itemName: row.itemName,
          itemCategory: row.itemCategory,
          requesterEmail: row.requesterEmail,
          createdAt: row.createdAt,
        })
        grouped.set(row.fulfillmentId, existing)
      }

      history = fulfillmentRows.map((row) => ({
        id: row.id,
        trigger: row.trigger,
        fulfilledAt: row.fulfilledAt,
        createdAt: row.createdAt,
        requests: grouped.get(row.id) ?? [],
      }))
    }
  }

  return {
    currentUser: user,
    items: allItems,
    currentList,
    threshold: {
      minPendingItems: settings.minPendingItems,
      currentDistinctItems: distinctActiveCount,
      remainingUntilThreshold: Math.max(
        settings.minPendingItems - distinctActiveCount,
        0,
      ),
    },
    notifications: user.role === 'orderer' ? unreadNotifications : [],
    pastFulfillments: history,
  }
}

export async function upsertItem(
  user: SessionUser,
  input: {
    id?: number
    name: string
    category: string
    isEvergreen: boolean
  },
) {
  assertOrderer(user)

  const normalizedName = normalizeText(input.name, 'Item name')
  const normalizedCategory = normalizeText(input.category, 'Category')

  if (input.id) {
    const updated = await db
      .update(items)
      .set({
        name: normalizedName,
        category: normalizedCategory,
        isEvergreen: input.isEvergreen,
      })
      .where(eq(items.id, input.id))
      .returning()

    if (!updated[0]) {
      throw new HttpError(404, 'Item not found.')
    }

    return updated[0]
  }

  try {
    const inserted = await db
      .insert(items)
      .values({
        name: normalizedName,
        category: normalizedCategory,
        isEvergreen: input.isEvergreen,
      })
      .returning()

    return inserted[0]
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new HttpError(
        409,
        'An item with this name and category already exists.',
      )
    }

    throw error
  }
}

export async function deleteItem(user: SessionUser, itemId: number) {
  assertOrderer(user)

  const deleted = await db.delete(items).where(eq(items.id, itemId)).returning()

  if (!deleted[0]) {
    throw new HttpError(404, 'Item not found.')
  }
}

export async function updateThreshold(
  user: SessionUser,
  minPendingItems: number,
) {
  assertOrderer(user)

  if (!Number.isFinite(minPendingItems) || minPendingItems < 1) {
    throw new HttpError(400, 'Threshold must be at least 1.')
  }

  const [updated] = await db
    .insert(fulfillmentSettings)
    .values({
      id: 1,
      minPendingItems,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: fulfillmentSettings.id,
      set: {
        minPendingItems,
        updatedAt: new Date(),
      },
    })
    .returning()

  return updated
}

export async function findOrCreateItem(
  user: SessionUser,
  input: {
    name: string
    category?: string
  },
) {
  assertOrderer(user)

  const normalizedName = normalizeText(input.name, 'Item name')
  const normalizedCategory = input.category?.trim() || 'General'

  const existing = await db
    .select()
    .from(items)
    .where(
      sql`lower(${items.name}) = ${normalizedName.toLowerCase()} and lower(${items.category}) = ${normalizedCategory.toLowerCase()}`,
    )
    .limit(1)

  if (existing[0]) {
    return existing[0]
  }

  const inserted = await db
    .insert(items)
    .values({
      name: normalizedName,
      category: normalizedCategory,
      isEvergreen: false,
    })
    .returning()

  return inserted[0]
}

export async function addRequest(user: SessionUser, itemId: number) {
  const item = (await db.select().from(items).where(eq(items.id, itemId)).limit(1))[0]
  if (!item) {
    throw new HttpError(404, 'Item not found.')
  }

  const existing = await db
    .select({ id: requests.id })
    .from(requests)
    .where(and(eq(requests.itemId, itemId), activeListWhere))
    .limit(1)

  if (existing[0]) {
    return {
      alreadyOnList: true,
      trigger: null as FulfillmentTrigger | null,
      currentDistinctItems: await getDistinctActiveItemCount(),
    }
  }

  try {
    await db.insert(requests).values({
      itemId,
      requesterId: user.id,
      status: 'pending',
    })
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error
    }

    return {
      alreadyOnList: true,
      trigger: null as FulfillmentTrigger | null,
      currentDistinctItems: await getDistinctActiveItemCount(),
    }
  }

  const [settings, currentDistinctItems] = await Promise.all([
    ensureSettings(),
    getDistinctActiveItemCount(),
  ])

  let trigger: FulfillmentTrigger | null = null
  if (item.isEvergreen) {
    trigger = 'immediate'
    await notifyOrderers('immediate', 'Staple added - order now', {
      itemId: item.id,
      itemName: item.name,
      requesterId: user.id,
    })
  } else if (currentDistinctItems === settings.minPendingItems) {
    trigger = 'threshold'
    await notifyOrderers(
      'threshold',
      `List reached ${settings.minPendingItems} items - place order`,
      {
        currentDistinctItems,
        minPendingItems: settings.minPendingItems,
      },
    )
  }

  return {
    alreadyOnList: false,
    trigger,
    currentDistinctItems,
  }
}

export async function cancelRequestById(
  _user: SessionUser,
  requestId: number,
) {
  const deleted = await db
    .delete(requests)
    .where(and(eq(requests.id, requestId), activeListWhere))
    .returning({ id: requests.id })

  if (!deleted[0]) {
    throw new HttpError(404, 'Request not found.')
  }
}

export async function fulfillCurrentList(user: SessionUser) {
  assertOrderer(user)

  return db.transaction(async (tx) => {
    const activeRequests = await tx
      .select({
        id: requests.id,
        itemId: requests.itemId,
        itemIsEvergreen: items.isEvergreen,
      })
      .from(requests)
      .innerJoin(items, eq(requests.itemId, items.id))
      .where(activeListWhere)

    if (!activeRequests.length) {
      throw new HttpError(400, 'There are no pending items to fulfill.')
    }

    const trigger: FulfillmentTrigger = activeRequests.some(
      (request) => request.itemIsEvergreen,
    )
      ? 'immediate'
      : 'threshold'

    const [fulfillment] = await tx
      .insert(fulfillments)
      .values({
        trigger,
        status: 'fulfilled',
        fulfilledAt: new Date(),
      })
      .returning()

    await tx
      .update(requests)
      .set({
        status: 'fulfilled',
        fulfillmentId: fulfillment.id,
      })
      .where(inArray(requests.id, activeRequests.map((request) => request.id)))

    return {
      fulfillmentId: fulfillment.id,
      fulfilledCount: activeRequests.length,
      trigger,
    }
  })
}

export async function markNotificationRead(user: SessionUser, notificationId: number) {
  const updated = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, user.id),
      ),
    )
    .returning({ id: notifications.id })

  if (!updated[0]) {
    throw new HttpError(404, 'Notification not found.')
  }
}
