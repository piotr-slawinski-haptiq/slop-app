export type UserRole = 'orderer' | 'colleague'
export type RequestStatus = 'pending' | 'in_fulfillment' | 'fulfilled'
export type FulfillmentTrigger = 'immediate' | 'threshold'

type User = {
  id: number
  email: string
  role: UserRole
}

type Session = {
  id: string
  userId: number
  expiresAt: Date
}

type MagicLinkToken = {
  token: string
  email: string
  expiresAt: Date
  usedAt: Date | null
}

type Item = {
  id: number
  name: string
  category: string
  isEvergreen: boolean
}

type Request = {
  id: number
  itemId: number
  requesterId: number
  status: RequestStatus
  fulfillmentId: number | null
}

type Fulfillment = {
  id: number
  trigger: FulfillmentTrigger
  status: 'pending' | 'fulfilled'
  fulfilledAt: Date | null
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function isAllowedDomain(email: string, allowedDomain: string): boolean {
  return normalizeEmail(email).endsWith(`@${allowedDomain}`)
}

export class SlopDomainModel {
  private readonly allowedDomain: string
  private readonly ordererEmails: Set<string>

  private readonly users = new Map<number, User>()
  private readonly sessions = new Map<string, Session>()
  private readonly magicLinks = new Map<string, MagicLinkToken>()
  private readonly items = new Map<number, Item>()
  private readonly requests = new Map<number, Request>()
  private readonly fulfillments = new Map<number, Fulfillment>()

  private userCounter = 0
  private itemCounter = 0
  private requestCounter = 0
  private fulfillmentCounter = 0
  private idCounter = 0

  constructor(options?: { allowedDomain?: string; ordererEmails?: Array<string> }) {
    this.allowedDomain = options?.allowedDomain ?? 'haptiq.com'
    this.ordererEmails = new Set(
      (options?.ordererEmails ?? []).map((email) => normalizeEmail(email)),
    )
  }

  private nextId(prefix: string): string {
    this.idCounter += 1
    return `${prefix}-${this.idCounter}`
  }

  private getOrCreateUser(email: string): User {
    const normalizedEmail = normalizeEmail(email)
    const existing = Array.from(this.users.values()).find(
      (user) => user.email === normalizedEmail,
    )

    if (existing) {
      return existing
    }

    const role: UserRole =
      this.ordererEmails.has(normalizedEmail) || this.users.size === 0
        ? 'orderer'
        : 'colleague'

    const user: User = {
      id: ++this.userCounter,
      email: normalizedEmail,
      role,
    }
    this.users.set(user.id, user)
    return user
  }

  requestMagicLink(email: string, now = new Date()): string {
    const normalizedEmail = normalizeEmail(email)
    if (!isAllowedDomain(normalizedEmail, this.allowedDomain)) {
      throw new Error('forbidden-domain')
    }

    const token = this.nextId('magic')
    this.magicLinks.set(token, {
      token,
      email: normalizedEmail,
      expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
      usedAt: null,
    })

    return token
  }

  verifyMagicLink(token: string, now = new Date()): { sessionId: string; user: User } {
    const magicLink = this.magicLinks.get(token)

    if (!magicLink || magicLink.usedAt || magicLink.expiresAt <= now) {
      throw new Error('invalid-magic-link')
    }

    const user = this.getOrCreateUser(magicLink.email)
    const sessionId = this.nextId('session')
    this.sessions.set(sessionId, {
      id: sessionId,
      userId: user.id,
      expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    })

    magicLink.usedAt = now
    return { sessionId, user }
  }

  getSessionUser(sessionId: string, now = new Date()): User | null {
    const session = this.sessions.get(sessionId)
    if (!session || session.expiresAt <= now) {
      return null
    }

    return this.users.get(session.userId) ?? null
  }

  createItem(name: string, category: string, isEvergreen = false): Item {
    const item: Item = {
      id: ++this.itemCounter,
      name: name.trim(),
      category: category.trim(),
      isEvergreen,
    }
    this.items.set(item.id, item)
    return item
  }

  addRequest(itemId: number, requesterId: number): { request: Request; idempotent: boolean } {
    const existing = Array.from(this.requests.values()).find(
      (request) =>
        request.itemId === itemId &&
        (request.status === 'pending' || request.status === 'in_fulfillment') &&
        request.fulfillmentId === null,
    )

    if (existing) {
      return { request: existing, idempotent: true }
    }

    const request: Request = {
      id: ++this.requestCounter,
      itemId,
      requesterId,
      status: 'pending',
      fulfillmentId: null,
    }
    this.requests.set(request.id, request)
    return { request, idempotent: false }
  }

  cancelRequest(requestId: number): void {
    this.requests.delete(requestId)
  }

  getActiveRequests(): Array<Request> {
    return Array.from(this.requests.values()).filter(
      (request) =>
        (request.status === 'pending' || request.status === 'in_fulfillment') &&
        request.fulfillmentId === null,
    )
  }

  fulfill(sessionId: string, now = new Date()): Fulfillment {
    const user = this.getSessionUser(sessionId, now)
    if (!user) {
      throw new Error('unauthenticated')
    }

    if (user.role !== 'orderer') {
      throw new Error('forbidden-role')
    }

    const active = this.getActiveRequests()
    if (!active.length) {
      throw new Error('empty-list')
    }

    const trigger: FulfillmentTrigger = active.some((request) => {
      const item = this.items.get(request.itemId)
      return Boolean(item?.isEvergreen)
    })
      ? 'immediate'
      : 'threshold'

    const fulfillment: Fulfillment = {
      id: ++this.fulfillmentCounter,
      trigger,
      status: 'fulfilled',
      fulfilledAt: now,
    }
    this.fulfillments.set(fulfillment.id, fulfillment)

    for (const request of active) {
      request.status = 'fulfilled'
      request.fulfillmentId = fulfillment.id
      this.requests.set(request.id, request)
    }

    return fulfillment
  }
}
