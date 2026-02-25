import { and, eq, gt, isNull, sql } from 'drizzle-orm'
import nodemailer from 'nodemailer'

import { db } from '@/db'
import { magicLinkTokens, sessions, users } from '@/db/schema'
import { env, isAllowedEmail } from '@/lib/env'
import { HttpError } from '@/lib/http-error'
import { generateToken, hashToken } from '@/lib/security'

import { setSessionCookie } from './session.server'
import type { SessionUser } from './types'

const millisecondsInMinute = 60 * 1000
const millisecondsInDay = 24 * 60 * 60 * 1000

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function getMagicLinkExpiry(): Date {
  return new Date(Date.now() + env.magicLinkDurationMinutes * millisecondsInMinute)
}

function getSessionExpiry(): Date {
  return new Date(Date.now() + env.sessionDurationDays * millisecondsInDay)
}

function buildMagicLinkUrl(token: string): string {
  const baseUrl = env.appUrl.replace(/\/+$/, '')
  return `${baseUrl}/auth/verify?token=${encodeURIComponent(token)}`
}

async function sendMagicLinkEmail(
  email: string,
  magicLinkUrl: string,
): Promise<void> {
  if (env.smtpUrl && env.emailFrom) {
    const transport = nodemailer.createTransport(env.smtpUrl)
    await transport.sendMail({
      from: env.emailFrom,
      to: email,
      subject: 'Your SLOP sign-in link',
      text: `Use this secure link to sign in to SLOP:\n\n${magicLinkUrl}\n\nThis link expires in ${env.magicLinkDurationMinutes} minutes.`,
    })
    return
  }

  console.info(`[SLOP] Magic link for ${email}: ${magicLinkUrl}`)
}

export async function requestMagicLink(
  rawEmail: string,
): Promise<{ previewUrl: string | null }> {
  const email = normalizeEmail(rawEmail)
  if (!email) {
    throw new HttpError(400, 'Email is required.')
  }

  if (!isAllowedEmail(email)) {
    throw new HttpError(
      403,
      `Only @${env.allowedEmailDomain} users can sign in.`,
    )
  }

  const token = generateToken()
  const tokenHash = hashToken(token)
  const magicLinkUrl = buildMagicLinkUrl(token)

  await db.insert(magicLinkTokens).values({
    email,
    tokenHash,
    expiresAt: getMagicLinkExpiry(),
  })

  await sendMagicLinkEmail(email, magicLinkUrl)

  return {
    previewUrl: process.env.NODE_ENV === 'production' ? null : magicLinkUrl,
  }
}

export async function verifyMagicLink(rawToken: string): Promise<SessionUser> {
  const token = rawToken.trim()
  if (!token) {
    throw new HttpError(400, 'Missing magic-link token.')
  }

  const tokenHash = hashToken(token)
  const now = new Date()

  const verifiedSession = await db.transaction(async (tx) => {
    const tokenRows = await tx
      .select({
        id: magicLinkTokens.id,
        email: magicLinkTokens.email,
      })
      .from(magicLinkTokens)
      .where(
        and(
          eq(magicLinkTokens.tokenHash, tokenHash),
          isNull(magicLinkTokens.usedAt),
          gt(magicLinkTokens.expiresAt, now),
        ),
      )
      .limit(1)

    const tokenRow = tokenRows[0]
    if (!tokenRow) {
      throw new HttpError(400, 'Magic link is invalid or has expired.')
    }

    const email = normalizeEmail(tokenRow.email)
    if (!isAllowedEmail(email)) {
      throw new HttpError(
        403,
        `Only @${env.allowedEmailDomain} users can sign in.`,
      )
    }

    let currentUser = (
      await tx.select().from(users).where(eq(users.email, email)).limit(1)
    )[0]

    if (!currentUser) {
      let role: SessionUser['role'] = 'colleague'
      if (env.ordererEmails.includes(email)) {
        role = 'orderer'
      } else {
        const [{ count }] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(users)
        if (Number(count) === 0) {
          role = 'orderer'
        }
      }

      const insertedUsers = await tx
        .insert(users)
        .values({
          email,
          role,
        })
        .returning()
      currentUser = insertedUsers[0]
    }

    await tx
      .update(magicLinkTokens)
      .set({ usedAt: now })
      .where(eq(magicLinkTokens.id, tokenRow.id))

    const sessionId = generateToken(48)
    await tx.insert(sessions).values({
      id: sessionId,
      userId: currentUser.id,
      expiresAt: getSessionExpiry(),
    })

    return {
      sessionId,
      user: {
        id: currentUser.id,
        email: currentUser.email,
        role: currentUser.role,
      } satisfies SessionUser,
    }
  })

  setSessionCookie(verifiedSession.sessionId)

  return verifiedSession.user
}
