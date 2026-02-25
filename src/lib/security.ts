import { createHmac, randomBytes } from 'node:crypto'

import { env } from './env'

export function generateToken(byteLength: number = 32): string {
  return randomBytes(byteLength).toString('hex')
}

export function hashToken(token: string): string {
  return createHmac('sha256', env.magicLinkSecret).update(token).digest('hex')
}
