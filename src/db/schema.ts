import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

export const userRoleEnum = pgEnum('user_role', ['orderer', 'colleague'])
export const requestStatusEnum = pgEnum('request_status', [
  'pending',
  'in_fulfillment',
  'fulfilled',
])
export const fulfillmentTriggerEnum = pgEnum('fulfillment_trigger', [
  'immediate',
  'threshold',
])
export const fulfillmentStatusEnum = pgEnum('fulfillment_status', [
  'pending',
  'fulfilled',
])
export const notificationTypeEnum = pgEnum('notification_type', [
  'immediate',
  'threshold',
])

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  role: userRoleEnum('role').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)],
)

export const magicLinkTokens = pgTable(
  'magic_link_tokens',
  {
    id: serial('id').primaryKey(),
    email: text('email').notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('magic_link_tokens_email_idx').on(table.email)],
)

export const items = pgTable(
  'items',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    category: text('category').notNull(),
    isEvergreen: boolean('is_evergreen').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('items_name_category_uq').on(table.name, table.category),
    index('items_name_idx').on(table.name),
  ],
)

export const fulfillments = pgTable(
  'fulfillments',
  {
    id: serial('id').primaryKey(),
    trigger: fulfillmentTriggerEnum('trigger').notNull(),
    status: fulfillmentStatusEnum('status').notNull(),
    fulfilledAt: timestamp('fulfilled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('fulfillments_fulfilled_at_idx').on(table.fulfilledAt)],
)

export const requests = pgTable(
  'requests',
  {
    id: serial('id').primaryKey(),
    itemId: integer('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    requesterId: integer('requester_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: requestStatusEnum('status').notNull().default('pending'),
    fulfillmentId: integer('fulfillment_id').references(() => fulfillments.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('requests_item_id_idx').on(table.itemId),
    index('requests_requester_id_idx').on(table.requesterId),
    index('requests_fulfillment_id_idx').on(table.fulfillmentId),
    uniqueIndex('requests_one_active_per_item_idx')
      .on(table.itemId)
      .where(
        sql`${table.status} in ('pending', 'in_fulfillment') and ${table.fulfillmentId} is null`,
      ),
  ],
)

export const fulfillmentSettings = pgTable(
  'fulfillment_settings',
  {
    id: integer('id').primaryKey().default(1),
    minPendingItems: integer('min_pending_items').notNull().default(5),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check('fulfillment_settings_singleton_chk', sql`${table.id} = 1`),
    check(
      'fulfillment_settings_min_pending_items_chk',
      sql`${table.minPendingItems} >= 1`,
    ),
  ],
)

export const notifications = pgTable(
  'notifications',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    message: text('message').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('notifications_user_id_idx').on(table.userId)],
)
