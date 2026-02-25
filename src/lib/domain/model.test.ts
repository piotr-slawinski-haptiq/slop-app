import { describe, expect, test } from 'bun:test'

import { SlopDomainModel } from './model'

describe('SLOP domain model invariants', () => {
  test('auth sign-in rejects non-allowed domain and creates session', () => {
    const model = new SlopDomainModel({ allowedDomain: 'haptiq.com' })

    expect(() => model.requestMagicLink('person@gmail.com')).toThrow(
      'forbidden-domain',
    )

    const token = model.requestMagicLink('first@haptiq.com')
    const { sessionId, user } = model.verifyMagicLink(token)

    expect(user.email).toBe('first@haptiq.com')
    expect(user.role).toBe('orderer')
    expect(model.getSessionUser(sessionId)?.id).toBe(user.id)
  })

  test('request add is idempotent and cancel removes it', () => {
    const model = new SlopDomainModel()
    const token = model.requestMagicLink('orderer@haptiq.com')
    const { user } = model.verifyMagicLink(token)
    const item = model.createItem('Milk', 'Dairy', true)

    const firstAdd = model.addRequest(item.id, user.id)
    const secondAdd = model.addRequest(item.id, user.id)

    expect(firstAdd.idempotent).toBe(false)
    expect(secondAdd.idempotent).toBe(true)
    expect(model.getActiveRequests().length).toBe(1)

    model.cancelRequest(firstAdd.request.id)
    expect(model.getActiveRequests().length).toBe(0)
  })

  test('fulfill clears list and creates fulfillment record', () => {
    const model = new SlopDomainModel()
    const token = model.requestMagicLink('orderer@haptiq.com')
    const { sessionId, user } = model.verifyMagicLink(token)
    const itemA = model.createItem('Coffee', 'Pantry', true)
    const itemB = model.createItem('Bars', 'Snacks', false)

    model.addRequest(itemA.id, user.id)
    model.addRequest(itemB.id, user.id)

    const fulfillment = model.fulfill(sessionId)

    expect(fulfillment.status).toBe('fulfilled')
    expect(model.getActiveRequests().length).toBe(0)
  })

  test('role checks block colleague from fulfilling list', () => {
    const model = new SlopDomainModel()
    const ordererToken = model.requestMagicLink('orderer@haptiq.com')
    const ordererSession = model.verifyMagicLink(ordererToken).sessionId

    const colleagueToken = model.requestMagicLink('colleague@haptiq.com')
    const colleagueSession = model.verifyMagicLink(colleagueToken).sessionId

    const item = model.createItem('Yogurt', 'Dairy', false)
    const orderer = model.getSessionUser(ordererSession)
    if (!orderer) {
      throw new Error('Expected orderer session to exist')
    }
    model.addRequest(item.id, orderer.id)

    expect(() => model.fulfill(colleagueSession)).toThrow('forbidden-role')
  })
})
