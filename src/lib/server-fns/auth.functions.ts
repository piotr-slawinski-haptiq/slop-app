import { createServerFn } from '@tanstack/react-start'

import { requestMagicLink, verifyMagicLink } from '@/lib/auth/magic-link.server'
import { destroySession, getSessionUser } from '@/lib/auth/session.server'
import { withHttpStatus } from '@/lib/server-fns/http-status.server'

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
