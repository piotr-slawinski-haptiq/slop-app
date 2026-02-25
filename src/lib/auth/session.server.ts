import { and, eq, gt } from 'drizzle-orm'
import { deleteCookie, getCookie, setCookie } from '@tanstack/react-start/server'

import { db } from '@/db'
import { sessions, users } from '@/db/schema'
import { env, isAllowedEmail } from '@/lib/env'
import { HttpError } from '@/lib/http-error'
import { generateToken } from '@/lib/security'

import type { SessionUser } from './types'

const millisecondsInDay = 24 * 60 * 60 * 1000

const sessionCookieOptions = {
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  maxAge: env.sessionDurationDays * 24 * 60 * 60,
}

function getSessionExpiry(): Date {
  return new Date(Date.now() + env.sessionDurationDays * millisecondsInDay)
}

export async function createSession(userId: number): Promise<string> {
  const sessionId = generateToken(48)
  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt: getSessionExpiry(),
  })

  return sessionId
}

export function setSessionCookie(sessionId: string): void {
  setCookie(env.sessionCookieName, sessionId, sessionCookieOptions)
}

export async function destroySession(): Promise<void> {
  const sessionId = getCookie(env.sessionCookieName)

  if (sessionId) {
    await db.delete(sessions).where(eq(sessions.id, sessionId))
  }

  deleteCookie(env.sessionCookieName, { path: '/' })
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const sessionId = getCookie(env.sessionCookieName)
  if (!sessionId) {
    return null
  }

  const now = new Date()

  const result = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, now)))
    .limit(1)

  const user = result[0]
  if (!user) {
    deleteCookie(env.sessionCookieName, { path: '/' })
    return null
  }

  if (!isAllowedEmail(user.email)) {
    await db.delete(sessions).where(eq(sessions.id, sessionId))
    deleteCookie(env.sessionCookieName, { path: '/' })
    return null
  }

  return user
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) {
    throw new HttpError(401, 'You must be signed in to continue.')
  }

  return user
}

export async function requireOrderer(): Promise<SessionUser> {
  const user = await requireSessionUser()
  if (user.role !== 'orderer') {
    throw new HttpError(403, 'Only orderers can perform this action.')
  }

  return user
}
