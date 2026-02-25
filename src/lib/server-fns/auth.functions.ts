import { createServerFn } from '@tanstack/react-start'
import { setResponseStatus } from '@tanstack/react-start/server'

import { requestMagicLink, verifyMagicLink } from '@/lib/auth/magic-link.server'
import { destroySession, getSessionUser } from '@/lib/auth/session.server'
import { HttpError } from '@/lib/http-error'

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

export const getCurrentUserFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    return withHttpStatus(() => getSessionUser())
  },
)

export const requestMagicLinkFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { email: string }) => input)
  .handler(async ({ data }) => {
    return withHttpStatus(() => requestMagicLink(data.email))
  })

export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  await withHttpStatus(() => destroySession())
  return { ok: true }
})

export const verifyMagicLinkFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    const user = await withHttpStatus(() => verifyMagicLink(data.token))
    return { user }
  })
