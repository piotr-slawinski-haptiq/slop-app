import { createServerFn } from '@tanstack/react-start'
import { setResponseStatus } from '@tanstack/react-start/server'

import { requireSessionUser } from '@/lib/auth/session.server'
import { HttpError } from '@/lib/http-error'
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

async function withHttpStatus<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work()
  } catch (error) {
    if (error instanceof HttpError) {
      setResponseStatus(error.statusCode, error.message)
    }
    throw error
  }
}

export const getDashboardDataFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    return withHttpStatus(async () => {
      const user = await requireSessionUser()
      return getDashboardData(user)
    })
  },
)

export const upsertItemFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: { id?: number; name: string; category: string; isEvergreen: boolean }) =>
      input,
  )
  .handler(async ({ data }) => {
    return withHttpStatus(async () => {
      const user = await requireSessionUser()
      return upsertItem(user, data)
    })
  })

export const deleteItemFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { itemId: number }) => input)
  .handler(async ({ data }) => {
    return withHttpStatus(async () => {
      const user = await requireSessionUser()
      await deleteItem(user, data.itemId)
      return { ok: true }
    })
  })

export const findOrCreateItemFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { name: string; category?: string }) => input)
  .handler(async ({ data }) => {
    return withHttpStatus(async () => {
      const user = await requireSessionUser()
      return findOrCreateItem(user, data)
    })
  })

export const updateThresholdFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { minPendingItems: number }) => input)
  .handler(async ({ data }) => {
    return withHttpStatus(async () => {
      const user = await requireSessionUser()
      return updateThreshold(user, data.minPendingItems)
    })
  })

export const addRequestFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { itemId: number }) => input)
  .handler(async ({ data }) => {
    return withHttpStatus(async () => {
      const user = await requireSessionUser()
      return addRequest(user, data.itemId)
    })
  })

export const cancelRequestFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { requestId: number }) => input)
  .handler(async ({ data }) => {
    return withHttpStatus(async () => {
      const user = await requireSessionUser()
      await cancelRequestById(user, data.requestId)
      return { ok: true }
    })
  })

export const fulfillCurrentListFn = createServerFn({ method: 'POST' }).handler(
  async () => {
    return withHttpStatus(async () => {
      const user = await requireSessionUser()
      return fulfillCurrentList(user)
    })
  },
)

export const markNotificationReadFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { notificationId: number }) => input)
  .handler(async ({ data }) => {
    return withHttpStatus(async () => {
      const user = await requireSessionUser()
      await markNotificationRead(user, data.notificationId)
      return { ok: true }
    })
  })
