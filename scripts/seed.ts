/**
 * Seed script: populates the database with catalog items (products).
 * Run with: bun run db:seed
 * Idempotent: re-running skips items that already exist (same name + category).
 */

import { config } from 'dotenv'

config({ path: '.env.local' })

const SEED_ITEMS: Array<{ name: string; category: string; isEvergreen: boolean }> = [
  // Beverages
  { name: 'Milk', category: 'Beverages', isEvergreen: true },
  { name: 'Orange juice', category: 'Beverages', isEvergreen: false },
  { name: 'Coffee', category: 'Beverages', isEvergreen: true },
  { name: 'Tea', category: 'Beverages', isEvergreen: true },
  { name: 'Sparkling water', category: 'Beverages', isEvergreen: false },
  // Snacks
  { name: 'Fruit', category: 'Snacks', isEvergreen: true },
  { name: 'Nuts', category: 'Snacks', isEvergreen: false },
  { name: 'Crackers', category: 'Snacks', isEvergreen: false },
  { name: 'Dark chocolate', category: 'Snacks', isEvergreen: false },
  { name: 'Yogurt', category: 'Snacks', isEvergreen: true },
  // Office supplies
  { name: 'Printer paper', category: 'Office', isEvergreen: true },
  { name: 'Sticky notes', category: 'Office', isEvergreen: true },
  { name: 'Pens', category: 'Office', isEvergreen: true },
  { name: 'Tissues', category: 'Office', isEvergreen: true },
  { name: 'Hand soap', category: 'Office', isEvergreen: true },
  { name: 'Paper towels', category: 'Office', isEvergreen: true },
  { name: 'Dish soap', category: 'Office', isEvergreen: true },
  // General
  { name: 'Batteries', category: 'General', isEvergreen: false },
  { name: 'Light bulbs', category: 'General', isEvergreen: false },
]

async function seed() {
  const { db, pool } = await import('../src/db/index.ts')
  const { items } = await import('../src/db/schema.ts')

  console.log('Seeding catalog items...')

  const result = await db
    .insert(items)
    .values(SEED_ITEMS)
    .onConflictDoNothing({ target: [items.name, items.category] })
    .returning({ id: items.id, name: items.name, category: items.category })

  await pool.end()
  console.log(`Done. ${result.length} inserted (${SEED_ITEMS.length} in seed; duplicates skipped).`)
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
